import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  PurchaseOrderRequest,
  PurchaseOrderResponse
} from '../../core/interfaces/purchase-order.interface';
import {
  OrderSummaryDraftService,
  OrderSummaryDraftState
} from '../../core/services/order-summary-draft.service';
import { ProductResponse } from '../../core/interfaces/product-response.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ProductCatalogService } from '../../core/services/product-catalog.service';
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
  productId: number;
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
  private readonly notificationService = inject(AppNotificationService);
  private readonly productCatalogService = inject(ProductCatalogService);
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
  private currentEditingOrderId: number | null = null;

  protected orderDate = this.toDateInputValue(new Date());
  protected dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
  protected deliverySite = 'Planta Central - Lima';
  protected deliveryArea = 'Area de Recepcion Principal';
  protected notes = '';
  protected purchaseOrderPreviewError = '';
  protected isLoadingPurchaseOrderNumber = false;
  protected isSubmittingOrder = false;
  protected isLoadingDraftOrder = false;
  protected lastSubmittedOrderNumber = '';
  protected showServiceProviderModal = false;
  protected showProductSelectionModal = false;
  protected currentProviderSelection: ProviderSelection | null = null;
  protected summaryProviderSelection: ProviderSelection | null = null;
  protected rows: OrderRow[] = [];

  constructor() {
    this.restoreSummaryState();
    this.handleStartSelectionRequest();
    this.handleDraftEditRequest();
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
      .map(({ productId, code, description, unit, unitPrice, quantity, serviceId, serviceName }) => ({
        productId,
        sku: code,
        name: description,
        unit,
        unitPrice,
        quantity,
        serviceId,
        serviceName
      }));
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
      productId: item.productId,
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
    this.purchaseOrderPreviewError = '';
    this.lastSubmittedOrderNumber = '';
    this.isLoadingPurchaseOrderNumber = false;
    this.isSubmittingOrder = false;
    this.isLoadingDraftOrder = false;
    this.currentEditingOrderId = null;
    this.rows = [];
    this.showServiceProviderModal = false;
    this.showProductSelectionModal = false;
    this.currentProviderSelection = null;
    this.summaryProviderSelection = null;
    this.clearPersistedSummaryState();
    this.clearStatus();
  }

  protected saveOrder(): void {
    this.submitOrder(false);
  }

  protected saveDraft(): void {
    this.submitOrder(true);
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

  private handleDraftEditRequest(): void {
    const draftId = this.toPositiveInt(this.route.snapshot.queryParamMap.get('draftId'));
    if (!draftId) {
      return;
    }

    this.loadDraftOrder(draftId);
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

  private loadDraftOrder(orderId: number): void {
    this.isLoadingDraftOrder = true;
    this.currentEditingOrderId = orderId;

    this.purchaseOrderService
      .getPurchaseOrder(orderId)
      .pipe(
        switchMap(({ data, error }) => {
          if (error || !data) {
            return of({
              order: null,
              products: [] as ProductResponse[],
              error: error || 'No se pudo cargar el borrador.'
            });
          }

          if (data.status !== 'BORRADOR') {
            return of({
              order: null,
              products: [] as ProductResponse[],
              error: 'Solo se pueden editar órdenes en estado BORRADOR.'
            });
          }

          return this.productCatalogService.listProductsBySupplier(data.supplierId).pipe(
            map((response) => ({
              order: data,
              products: response.data ?? [],
              error: ''
            })),
            catchError(() =>
              of({
                order: data,
                products: [] as ProductResponse[],
                error: ''
              })
            )
          );
        })
      )
      .subscribe(({ order, products, error }) => {
        this.isLoadingDraftOrder = false;

        if (error || !order) {
          this.currentEditingOrderId = null;
          this.showStatus('error', error || 'No se pudo cargar el borrador.');
          this.clearDraftQueryParams();
          return;
        }

        this.applyLoadedDraft(order, products);
      });
  }

  private applyLoadedDraft(order: PurchaseOrderResponse, products: ProductResponse[]): void {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const nextRows: OrderRow[] = order.details.map((detail, index) => {
      const product = productMap.get(detail.productoId);

      return {
        id: index + 1,
        productId: detail.productoId,
        code: detail.codigoProducto,
        description: detail.nombreProducto,
        unit: this.toUnitOption(detail.unidadMedida),
        unitPrice: this.toNonNegativeNumber(detail.precioUnitario),
        quantity: this.toPositiveInt(detail.cantidad),
        serviceId: product?.servicioId ?? 0,
        serviceName: product?.servicioNombre ?? ''
      };
    });

    const selectedServiceIds = Array.from(
      new Set(nextRows.map((row) => row.serviceId).filter((serviceId) => serviceId > 0))
    );
    const selectedServiceNames = Array.from(
      new Set(nextRows.map((row) => row.serviceName.trim()).filter((serviceName) => serviceName.length > 0))
    );

    this.orderDate = this.normalizeDateValue(order.orderDate, this.orderDate);
    this.dispatchDate = this.normalizeDateValue(order.deliveryDate, this.dispatchDate);
    this.deliverySite = order.sede;
    this.deliveryArea = order.area;
    this.notes = order.notas ?? '';
    this.rows = nextRows;
    this.summaryProviderSelection = {
      serviceId: selectedServiceIds[0] ?? 0,
      serviceName: selectedServiceNames[0] ?? '',
      providerId: order.supplierId,
      providerName: order.supplierName,
      providerRuc: order.supplierRuc,
      selectedServiceIds,
      selectedServiceNames
    };
    this.nextRowId = nextRows.length ? Math.max(...nextRows.map((row) => row.id)) + 1 : 1;
    this.persistSummaryState();
    this.showStatus('success', `Borrador ${order.purchaseOrderNumber} cargado para edición.`);
  }

  private clearDraftQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        draftId: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private handleOrderSaved(order: PurchaseOrderResponse): void {
    this.handleOrderPersisted(order, false);
  }

  private submitOrder(saveDraft: boolean): void {
    const validationError = this.getOrderValidationError(saveDraft);
    if (validationError) {
      this.showStatus('error', validationError);
      return;
    }

    const request = this.buildPurchaseOrderRequest(saveDraft);
    if (!request) {
      this.showStatus('error', 'No se pudo preparar la orden de compra.');
      return;
    }

    this.isSubmittingOrder = true;
    const request$ = this.currentEditingOrderId
      ? this.purchaseOrderService.updatePurchaseOrder(this.currentEditingOrderId, request)
      : this.purchaseOrderService.createPurchaseOrder(request);

    request$.subscribe(({ data, error }) => {
      this.isSubmittingOrder = false;

      if (error || !data) {
        this.showStatus(
          'error',
          error ||
            (saveDraft
              ? 'No se pudo guardar el borrador de la orden de compra.'
              : 'No se pudo finalizar la orden de compra.')
        );
        return;
      }

      this.handleOrderPersisted(data, saveDraft);
    });
  }

  private getOrderValidationError(saveDraft: boolean): string {
    if (!this.summaryRows.length) {
      return saveDraft
        ? 'Selecciona productos con cantidad mayor a cero antes de guardar el borrador.'
        : 'Selecciona productos con cantidad mayor a cero antes de confirmar el pedido.';
    }

    if (!this.summaryProviderSelection) {
      return saveDraft
        ? 'Selecciona un proveedor antes de guardar el borrador de la orden de compra.'
        : 'Selecciona un proveedor antes de finalizar la orden de compra.';
    }

    return '';
  }

  private buildPurchaseOrderRequest(saveDraft: boolean): PurchaseOrderRequest | null {
    if (!this.summaryProviderSelection) {
      return null;
    }

    return {
      supplierId: this.summaryProviderSelection.providerId,
      orderDate: this.orderDate,
      deliveryDate: this.dispatchDate,
      sede: this.deliverySite.trim(),
      area: this.deliveryArea.trim(),
      saveDraft,
      details: this.summaryRows.map((row) => ({
        productId: row.productId,
        cantidad: row.quantity,
        precioUnitario: row.unitPrice
      })),
      notas: this.notes.trim() || undefined
    };
  }

  private handleOrderPersisted(order: PurchaseOrderResponse, saveDraft: boolean): void {
    const savedOrderNumber = order.purchaseOrderNumber;
    const wasEditing = this.currentEditingOrderId !== null;

    this.resetOrder();
    this.lastSubmittedOrderNumber = savedOrderNumber;
    this.clearDraftQueryParams();
    this.showStatus(
      'success',
      saveDraft
        ? wasEditing
          ? `Borrador ${savedOrderNumber} actualizado correctamente con ${order.details.length} item(s).`
          : `Borrador ${savedOrderNumber} guardado correctamente con ${order.details.length} item(s).`
        : wasEditing
          ? `Borrador ${savedOrderNumber} actualizado y enviado correctamente con ${order.details.length} item(s).`
          : `Orden de compra ${savedOrderNumber} creada correctamente con ${order.details.length} item(s).`
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
      productId: this.toPositiveInt(row.productId),
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
      //this.purchaseOrderNumber = '';
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

  private toUnitOption(value: unknown): UnitOption {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    return this.isUnitOption(normalized) ? normalized : 'UND';
  }

  private isUnitOption(value: unknown): value is UnitOption {
    return typeof value === 'string' && this.validUnits.includes(value as UnitOption);
  }

  private isDateInput(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private normalizeDateValue(value: string, fallback: string): string {
    return this.isDateInput(value) ? value : fallback;
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
    if (kind === 'success') {
      this.notificationService.success(message, 4200);
      return;
    }

    this.notificationService.error(message, 4200);
  }

  private clearStatus(): void {
    this.notificationService.dismiss();
  }
}
