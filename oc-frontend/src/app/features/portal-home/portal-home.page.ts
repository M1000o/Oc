import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  PurchaseOrderRequest,
  PurchaseOrderResponse
} from '../../core/interfaces/purchase-order.interface';
import {
  OrderSummaryDraftService,
  OrderSummaryDraftState
} from '../../core/services/order-summary-draft.service';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { PortalLayoutComponent } from '../../shared/layout/portal-layout.component';
import { ServiceProviderModalComponent } from './service-provider-modal.component';
import { ProviderSelection } from '../../core/interfaces/provider-option.interface';
import {
  ProductSelectionItem,
  ProductSelectionModalComponent,
  UnitOption
} from './product-selection-modal.component';

interface OrderRow {
  id: number;
  code: string;
  description: string;
  unit: UnitOption;
  unitPrice: number;
  quantity: number;
  serviceId: number;
  serviceName: string;
}

@Component({
  selector: 'app-portal-home-page',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ServiceProviderModalComponent,
    ProductSelectionModalComponent
  ],
  templateUrl: './portal-home.page.html',
  styleUrl: './portal-home.page.css'
})
export class PortalHomePage {
  private readonly beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    if (this.hasDraftSummary()) {
      event.preventDefault();
      event.returnValue = 'Tienes un resumen en curso. Si sales, podrías perder los cambios.';
      return event.returnValue;
    }
    return undefined;
  };

  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly draftService = inject(OrderSummaryDraftService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly validUnits: UnitOption[] = ['KG', 'UND', 'PAQ', 'DOC', 'GR', 'UN', 'CJ'];
  private readonly taxRate = 0.18;
  private readonly currencyFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  private nextRowId = 1;
  private statusTimeoutId?: number;

  protected orderDate = this.toDateInputValue(new Date());
  protected dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
  protected deliverySite = 'Planta Central - Lima';
  protected deliveryArea = 'Area de Recepcion Principal';
  protected notes = '';
  protected statusMessage = '';
  protected statusKind: 'success' | 'error' | '' = '';
  protected purchaseOrderNumber = '';
  protected purchaseOrderPreviewError = '';
  protected isLoadingPurchaseOrderNumber = false;
  protected isSubmittingOrder = false;
  protected lastSubmittedOrderNumber = '';
  protected showServiceProviderModal = false;
  protected showProductSelectionModal = false;
  protected currentProviderSelection: ProviderSelection | null = null;
  protected summaryProviderSelection: ProviderSelection | null = null;
  protected rows: OrderRow[] = [];

  constructor() {
    this.restoreSummaryState();
    this.handleStartSelectionRequest();
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }
  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  protected get summaryRows(): OrderRow[] {
    return this.rows.filter((row) => row.description.trim().length > 0 && row.quantity > 0);
  }

  protected get summaryItemsCount(): number {
    return this.summaryRows.length;
  }

  protected get subtotalAmount(): number {
    return this.summaryRows.reduce((acc, row) => acc + row.quantity * row.unitPrice, 0);
  }

  protected get taxAmount(): number {
    return this.subtotalAmount * this.taxRate;
  }

  protected get totalAmount(): number {
    return this.subtotalAmount + this.taxAmount;
  }

  protected get providerName(): string {
    return this.summaryProviderSelection?.providerName ?? 'Sin proveedor seleccionado';
  }

  protected get providerRuc(): string {
    return this.summaryProviderSelection?.providerRuc ?? 'No disponible';
  }

  protected get serviceName(): string {
    const serviceNames = this.summaryProviderSelection?.selectedServiceNames ?? [];

    if (serviceNames.length) {
      return serviceNames.join(', ');
    }

    return this.summaryProviderSelection?.serviceName ?? 'Sin servicio asociado';
  }

  protected get purchaseOrderLabel(): string {
    if (this.purchaseOrderNumber) {
      return this.purchaseOrderNumber;
    }

    if (this.isLoadingPurchaseOrderNumber) {
      return 'Generando...';
    }

    if (this.purchaseOrderPreviewError) {
      return 'No disponible';
    }

    return 'Pendiente de generacion';
  }

  protected get initialProductSelections(): ProductSelectionItem[] {
    if (
      !this.currentProviderSelection ||
      !this.summaryProviderSelection ||
      this.currentProviderSelection.providerId !== this.summaryProviderSelection.providerId
    ) {
      return [];
    }

    return this.summaryRows
      .filter((row) => row.serviceId === this.currentProviderSelection?.serviceId)
      .map(({ code, description, unit, unitPrice, quantity, serviceId, serviceName }) => ({
        sku: code,
        name: description,
        unit,
        unitPrice,
        quantity,
        serviceId,
        serviceName
      }));
  }

  protected logout(): void {
    this.clearPersistedSummaryState();
    this.authService.logout();
  }

  confirmDiscardDraft(): boolean {
    if (!this.hasDraftSummary()) {
      return true;
    }

    const shouldDiscard = window.confirm(
      'Vas a salir del resumen actual y perderas toda la informacion registrada. ¿Deseas continuar?'
    );

    if (shouldDiscard) {
      this.clearPersistedSummaryState();
    }

    return shouldDiscard;
  }

  protected openServiceProviderModal(): void {
    this.showServiceProviderModal = true;
  }

  protected closeServiceProviderModal(): void {
    this.showServiceProviderModal = false;
  }

  protected onProviderSelected(selection: ProviderSelection): void {
    if (
      this.summaryProviderSelection &&
      this.summaryProviderSelection.providerId !== selection.providerId
    ) {
      this.showServiceProviderModal = false;
      this.showStatus(
        'error',
        'Solo puedes agregar productos del mismo proveedor dentro de la misma orden.'
      );
      return;
    }

    this.showServiceProviderModal = false;
    this.currentProviderSelection = selection;
    this.showProductSelectionModal = true;
  }

  protected closeProductSelectionModal(): void {
    this.showProductSelectionModal = false;
    this.showServiceProviderModal = true;
  }

  protected onProductsConfirmed(items: ProductSelectionItem[]): void {
    if (!this.currentProviderSelection) {
      return;
    }

    const currentSelection = this.currentProviderSelection;
    const existingServiceIds = this.summaryProviderSelection?.selectedServiceIds ?? [];
    const existingServiceNames = this.summaryProviderSelection?.selectedServiceNames ?? [];
    const nextServiceIds = Array.from(new Set([...existingServiceIds, currentSelection.serviceId]));
    const nextServiceNames = Array.from(
      new Set([
        ...existingServiceNames.filter((name) => name.trim().length > 0),
        currentSelection.serviceName
      ])
    );

    this.summaryProviderSelection = {
      ...currentSelection,
      selectedServiceIds: nextServiceIds,
      selectedServiceNames: nextServiceNames
    };

    const rowsByService = this.rows.filter((row) => row.serviceId !== currentSelection.serviceId);
    const nextRows = items.map((item) => ({
      id: this.findExistingRowId(currentSelection.serviceId, item.sku),
      code: item.sku,
      description: item.name,
      unit: item.unit,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      serviceId: item.serviceId,
      serviceName: item.serviceName
    }));

    this.rows = [...rowsByService, ...nextRows];

    const providerName = this.summaryProviderSelection?.providerName;
    const serviceName = currentSelection.serviceName;

    this.showProductSelectionModal = false;
    this.currentProviderSelection = null;
    this.persistSummaryState();
    this.ensurePurchaseOrderNumber();
    this.showStatus(
      'success',
      `Se agregaron ${items.length} producto(s)${providerName ? ` del proveedor ${providerName}` : ''}${serviceName ? ` para ${serviceName}` : ''}.`
    );
  }

  protected removeSummaryItem(rowId: number): void {
    if (!this.summaryRows.length) {
      this.showStatus('error', 'No hay items en el resumen para eliminar.');
      return;
    }

    const exists = this.summaryRows.some((row) => row.id === rowId);

    if (!exists) {
      this.showStatus('error', 'El item seleccionado ya no se encuentra en el resumen.');
      return;
    }

    this.rows = this.rows.filter((row) => row.id !== rowId);
    this.syncSummaryProviderSelection();
    this.persistSummaryState();
    this.syncPurchaseOrderPreviewState();
    this.showStatus('success', 'Item eliminado del resumen.');
  }

  protected persistSummaryDraft(): void {
    this.persistSummaryState();
  }

  protected reopenSelection(): void {
    if (this.summaryProviderSelection) {
      this.currentProviderSelection = null;
      this.showProductSelectionModal = false;
      this.showServiceProviderModal = true;
      return;
    }

    this.openServiceProviderModal();
  }

  protected resetOrder(): void {
    this.orderDate = this.toDateInputValue(new Date());
    this.dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
    this.deliverySite = 'Planta Central - Lima';
    this.deliveryArea = 'Area de Recepcion Principal';
    this.notes = '';
    this.purchaseOrderNumber = '';
    this.purchaseOrderPreviewError = '';
    this.lastSubmittedOrderNumber = '';
    this.isLoadingPurchaseOrderNumber = false;
    this.isSubmittingOrder = false;
    this.rows = [];
    this.showServiceProviderModal = false;
    this.showProductSelectionModal = false;
    this.currentProviderSelection = null;
    this.summaryProviderSelection = null;
    this.clearPersistedSummaryState();
    this.clearStatus();
  }

  protected saveOrder(): void {
    if (!this.summaryRows.length) {
      this.showStatus(
        'error',
        'Selecciona productos con cantidad mayor a cero antes de confirmar el pedido.'
      );
      return;
    }

    if (!this.summaryProviderSelection) {
      this.showStatus('error', 'Selecciona un proveedor antes de finalizar la orden de compra.');
      return;
    }

    const request: PurchaseOrderRequest = {
      purchaseOrderNumber: this.purchaseOrderNumber || undefined,
      servicioId: this.summaryProviderSelection.selectedServiceIds?.[0] ?? this.summaryProviderSelection.serviceId,
      servicioIds: this.summaryProviderSelection.selectedServiceIds?.length
        ? this.summaryProviderSelection.selectedServiceIds
        : [this.summaryProviderSelection.serviceId],
      proveedorId: this.summaryProviderSelection.providerId,
      fechaEntrega: this.dispatchDate,
      local: this.deliverySite.trim(),
      area: this.deliveryArea.trim(),
      status: 'PENDIENTE',
      details: this.summaryRows.map((row) => ({
        descripcion: row.description.trim(),
        cantidad: row.quantity
      })),
      notas: this.notes.trim() || undefined
    };

    this.isSubmittingOrder = true;
    this.purchaseOrderService.createPurchaseOrder(request).subscribe(({ data, error }) => {
      this.isSubmittingOrder = false;

      if (error || !data) {
        this.showStatus('error', error || 'No se pudo finalizar la orden de compra.');
        return;
      }

      this.handleOrderCreated(data);
    });
  }

  protected rowSubtotal(row: OrderRow): number {
    return row.quantity * row.unitPrice;
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private persistSummaryState(): void {
    const payload: OrderSummaryDraftState = {
      rows: this.rows,
      summaryProviderSelection: this.summaryProviderSelection,
      dispatchDate: this.dispatchDate,
      deliverySite: this.deliverySite,
      deliveryArea: this.deliveryArea,
      notes: this.notes,
      nextRowId: this.nextRowId
    };

    this.draftService.save(payload);
  }

  private restoreSummaryState(): void {
    const parsed = this.draftService.load();
    if (!parsed) {
      return;
    }

    const restoredRows = this.normalizeRows(parsed.rows);

    this.summaryProviderSelection = this.normalizeProviderSelection(parsed.summaryProviderSelection);
    this.rows = this.hydrateRows(restoredRows, this.summaryProviderSelection);

    if (this.isDateInput(parsed.dispatchDate)) {
      this.dispatchDate = parsed.dispatchDate;
    }

    if (typeof parsed.deliverySite === 'string') {
      this.deliverySite = parsed.deliverySite;
    }

    if (typeof parsed.deliveryArea === 'string') {
      this.deliveryArea = parsed.deliveryArea;
    }

    if (typeof parsed.notes === 'string') {
      this.notes = parsed.notes;
    }

    const nextByRows = restoredRows.length ? Math.max(...restoredRows.map((row) => row.id)) + 1 : 1;

    const restoredNext =
      typeof parsed.nextRowId === 'number' && Number.isInteger(parsed.nextRowId) && parsed.nextRowId > 0
        ? parsed.nextRowId
        : nextByRows;

    this.nextRowId = Math.max(nextByRows, restoredNext);
    this.ensurePurchaseOrderNumber();
  }

  private clearPersistedSummaryState(): void {
    this.draftService.clear();
  }

  private hasDraftSummary(): boolean {
    return this.rows.some((row) => row.description.trim().length > 0 && row.quantity > 0);
  }

  private hasOrderSummaryReady(): boolean {
    return this.summaryRows.length > 0 && this.summaryProviderSelection !== null;
  }

  private handleStartSelectionRequest(): void {
    if (this.route.snapshot.queryParamMap.get('startSelection') !== '1') {
      return;
    }

    this.openServiceProviderModal();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        startSelection: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private ensurePurchaseOrderNumber(): void {
    if (!this.hasOrderSummaryReady() || this.purchaseOrderNumber || this.isLoadingPurchaseOrderNumber) {
      return;
    }

    this.purchaseOrderPreviewError = '';
    this.isLoadingPurchaseOrderNumber = true;

    this.purchaseOrderService.previewNextPurchaseOrderNumber().subscribe(({ data, error }) => {
      this.isLoadingPurchaseOrderNumber = false;

      if (error) {
        this.purchaseOrderPreviewError = error;
        return;
      }

      this.purchaseOrderNumber = data;
    });
  }

  private syncPurchaseOrderPreviewState(): void {
    if (this.hasOrderSummaryReady()) {
      this.ensurePurchaseOrderNumber();
      return;
    }

    this.purchaseOrderNumber = '';
    this.purchaseOrderPreviewError = '';
  }

  private handleOrderCreated(order: PurchaseOrderResponse): void {
    const createdOrderNumber = order.purchaseOrderNumber;

    this.resetOrder();
    this.lastSubmittedOrderNumber = createdOrderNumber;
    this.showStatus(
      'success',
      `Orden de compra ${createdOrderNumber} creada correctamente con ${order.details.length} item(s).`
    );
  }

  private normalizeRows(value: unknown): OrderRow[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((row) => this.normalizeRow(row))
      .filter((row): row is OrderRow => row !== null);
  }

  private normalizeRow(value: unknown): OrderRow | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = value as Partial<OrderRow>;
    const id = this.toPositiveInt(row.id);
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const quantity = this.toPositiveInt(row.quantity);

    if (!id || !description || !quantity) {
      return null;
    }

    const unit = this.isUnitOption(row.unit) ? row.unit : 'UND';
    const unitPrice = this.toNonNegativeNumber(row.unitPrice);

    return {
      id,
      code: typeof row.code === 'string' ? row.code : '',
      description,
      unit,
      unitPrice,
      quantity,
      serviceId: this.toPositiveInt(row.serviceId),
      serviceName: typeof row.serviceName === 'string' ? row.serviceName : ''
    };
  }

  private normalizeProviderSelection(value: unknown): ProviderSelection | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const provider = value as Partial<ProviderSelection>;
    const serviceId = this.toPositiveInt(provider.serviceId);
    const providerId = this.toPositiveInt(provider.providerId);

    if (!serviceId || !providerId) {
      return null;
    }

    return {
      serviceId,
      serviceName: typeof provider.serviceName === 'string' ? provider.serviceName : '',
      providerId,
      providerName: typeof provider.providerName === 'string' ? provider.providerName : '',
      providerRuc: typeof provider.providerRuc === 'string' ? provider.providerRuc : '',
      selectedServiceIds: this.normalizeServiceIds(provider.selectedServiceIds, serviceId),
      selectedServiceNames: this.normalizeServiceNames(
        provider.selectedServiceNames,
        typeof provider.serviceName === 'string' ? provider.serviceName : ''
      )
    };
  }

  private hydrateRows(rows: OrderRow[], providerSelection: ProviderSelection | null): OrderRow[] {
    if (!providerSelection) {
      return rows;
    }

    return rows.map((row) => ({
      ...row,
      serviceId: row.serviceId || providerSelection.serviceId,
      serviceName: row.serviceName || providerSelection.serviceName
    }));
  }

  private normalizeServiceIds(value: unknown, fallbackServiceId: number): number[] {
    if (!Array.isArray(value)) {
      return fallbackServiceId ? [fallbackServiceId] : [];
    }

    const normalized = value
      .map((serviceId) => this.toPositiveInt(serviceId))
      .filter((serviceId) => serviceId > 0);

    return normalized.length ? Array.from(new Set(normalized)) : fallbackServiceId ? [fallbackServiceId] : [];
  }

  private normalizeServiceNames(value: unknown, fallbackServiceName: string): string[] {
    if (!Array.isArray(value)) {
      return fallbackServiceName ? [fallbackServiceName] : [];
    }

    const normalized = value
      .filter((serviceName): serviceName is string => typeof serviceName === 'string')
      .map((serviceName) => serviceName.trim())
      .filter((serviceName) => serviceName.length > 0);

    return normalized.length ? Array.from(new Set(normalized)) : fallbackServiceName ? [fallbackServiceName] : [];
  }

  private findExistingRowId(serviceId: number, sku: string): number {
    const existingRow = this.rows.find((row) => row.serviceId === serviceId && row.code === sku);

    if (existingRow) {
      return existingRow.id;
    }

    return this.nextRowId++;
  }

  private syncSummaryProviderSelection(): void {
    if (!this.summaryProviderSelection) {
      return;
    }

    const remainingRows = this.summaryRows;

    if (!remainingRows.length) {
      this.summaryProviderSelection = null;
      this.purchaseOrderNumber = '';
      this.purchaseOrderPreviewError = '';
      return;
    }

    const selectedServiceIds = Array.from(new Set(remainingRows.map((row) => row.serviceId)));
    const selectedServiceNames = Array.from(
      new Set(
        remainingRows
          .map((row) => row.serviceName.trim())
          .filter((serviceName) => serviceName.length > 0)
      )
    );
    const primaryServiceId = selectedServiceIds[0] ?? this.summaryProviderSelection.serviceId;
    const primaryServiceName = selectedServiceNames[0] ?? this.summaryProviderSelection.serviceName;

    this.summaryProviderSelection = {
      ...this.summaryProviderSelection,
      serviceId: primaryServiceId,
      serviceName: primaryServiceName,
      selectedServiceIds,
      selectedServiceNames
    };
  }

  private toPositiveInt(value: unknown): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    const asInt = Math.trunc(parsed);
    return asInt > 0 ? asInt : 0;
  }

  private toNonNegativeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private isUnitOption(value: unknown): value is UnitOption {
    return typeof value === 'string' && this.validUnits.includes(value as UnitOption);
  }

  private isDateInput(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private addDays(baseDate: Date, days: number): Date {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showStatus(kind: 'success' | 'error', message: string): void {
    this.statusKind = kind;
    this.statusMessage = message;

    if (this.statusTimeoutId) {
      window.clearTimeout(this.statusTimeoutId);
    }

    this.statusTimeoutId = window.setTimeout(() => {
      this.clearStatus();
    }, 4200);
  }

  private clearStatus(): void {
    this.statusKind = '';
    this.statusMessage = '';
  }
}
