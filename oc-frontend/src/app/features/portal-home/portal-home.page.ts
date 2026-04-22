import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
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
}

interface PersistedSummaryState {
  rows: OrderRow[];
  summaryProviderSelection: ProviderSelection | null;
  dispatchDate: string;
  deliverySite: string;
  deliveryArea: string;
  notes: string;
  nextRowId: number;
}

@Component({
  selector: 'app-portal-home-page',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    PortalLayoutComponent,
    ServiceProviderModalComponent,
    ProductSelectionModalComponent
  ],
  templateUrl: './portal-home.page.html',
  styleUrl: './portal-home.page.css'
})
export class PortalHomePage {
    private beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (this.hasDraftSummary()) {
        event.preventDefault();
        event.returnValue = 'Tienes un resumen en curso. Si sales, podrías perder los cambios.';
        return event.returnValue;
      }
      return undefined;
    };

    private hasDraftSummary(): boolean {
      // Considera que hay un resumen en curso si hay productos en el borrador
      const draft = window.localStorage.getItem(this.storageKey);
      if (!draft) return false;
      try {
        const data = JSON.parse(draft);
        return data && Array.isArray(data.rows) && data.rows.length > 0;
      } catch {
        return false;
      }
    }
  private readonly authService = inject(AuthService);
  private readonly storageKey = 'oc.portal-home.summary.v1';
  private readonly validUnits: UnitOption[] = ['UN', 'PAQ', 'CJ'];
  private readonly taxRate = 0.16;
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
  protected showServiceProviderModal = false;
  protected showProductSelectionModal = false;
  protected currentProviderSelection: ProviderSelection | null = null;
  protected summaryProviderSelection: ProviderSelection | null = null;
  protected rows: OrderRow[] = [];

  constructor() {
    this.restoreSummaryState();
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
    return this.summaryProviderSelection?.serviceName ?? 'Sin servicio asociado';
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected openServiceProviderModal(): void {
    this.showServiceProviderModal = true;
  }

  protected closeServiceProviderModal(): void {
    this.showServiceProviderModal = false;
  }

  protected onProviderSelected(selection: ProviderSelection): void {
    this.showServiceProviderModal = false;
    this.currentProviderSelection = selection;
    this.showProductSelectionModal = true;
  }

  protected closeProductSelectionModal(): void {
    this.showProductSelectionModal = false;
  }

  protected onProductsConfirmed(items: ProductSelectionItem[]): void {
    this.summaryProviderSelection = this.currentProviderSelection;

    this.rows = items.map((item) => ({
      id: this.nextRowId++,
      code: item.sku,
      description: item.name,
      unit: item.unit,
      unitPrice: item.unitPrice,
      quantity: item.quantity
    }));

    const providerName = this.summaryProviderSelection?.providerName;

    this.showProductSelectionModal = false;
    this.currentProviderSelection = null;
    this.persistSummaryState();
    this.showStatus(
      'success',
      `Se agregaron ${items.length} producto(s)${providerName ? ` del proveedor ${providerName}` : ''}.`
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

    if (this.summaryRows.length === 1) {
      this.showStatus('error', 'El resumen debe tener al menos un item. Usa "Volver a Seleccion" para reemplazarlo.');
      return;
    }

    this.rows = this.rows.filter((row) => row.id !== rowId);
    this.persistSummaryState();
    this.showStatus('success', 'Item eliminado del resumen.');
  }

  protected persistSummaryDraft(): void {
    this.persistSummaryState();
  }

  protected reopenSelection(): void {
    this.openServiceProviderModal();
  }

  protected resetOrder(): void {
    this.orderDate = this.toDateInputValue(new Date());
    this.dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
    this.deliverySite = 'Planta Central - Lima';
    this.deliveryArea = 'Area de Recepcion Principal';
    this.notes = '';
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

    this.showStatus('success', `Pedido confirmado con ${this.summaryRows.length} item(s).`);
  }

  protected rowSubtotal(row: OrderRow): number {
    return row.quantity * row.unitPrice;
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private persistSummaryState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: PersistedSummaryState = {
      rows: this.rows,
      summaryProviderSelection: this.summaryProviderSelection,
      dispatchDate: this.dispatchDate,
      deliverySite: this.deliverySite,
      deliveryArea: this.deliveryArea,
      notes: this.notes,
      nextRowId: this.nextRowId
    };

    window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private restoreSummaryState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(this.storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedSummaryState>;
      const restoredRows = this.normalizeRows(parsed.rows);

      this.rows = restoredRows;
      this.summaryProviderSelection = this.normalizeProviderSelection(parsed.summaryProviderSelection);

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

      const nextByRows = restoredRows.length
        ? Math.max(...restoredRows.map((row) => row.id)) + 1
        : 1;

      const restoredNext =
        typeof parsed.nextRowId === 'number' && Number.isInteger(parsed.nextRowId) && parsed.nextRowId > 0
          ? parsed.nextRowId
          : nextByRows;

      this.nextRowId = Math.max(nextByRows, restoredNext);
    } catch {
      this.clearPersistedSummaryState();
    }
  }

  private clearPersistedSummaryState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(this.storageKey);
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

    const unit = this.isUnitOption(row.unit) ? row.unit : 'UN';
    const unitPrice = this.toNonNegativeNumber(row.unitPrice);

    return {
      id,
      code: typeof row.code === 'string' ? row.code : '',
      description,
      unit,
      unitPrice,
      quantity
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
      providerRuc: typeof provider.providerRuc === 'string' ? provider.providerRuc : ''
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
