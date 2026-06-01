import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import {
  OrderRow,
  PurchaseOrderEmailResponse,
  PurchaseOrderRequest,
  PurchaseOrderResponse
} from '../../core/interfaces/purchase-order.interface';
import { OrderSummaryDraftState} from '../../core/interfaces/order-summary.interface'
import { ProductResponse } from '../../core/interfaces/product-response.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ProductCatalogService } from '../../core/services/product-catalog.service';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { SupplierDirectoryService } from '../../core/services/supplier-directory.service';
import { LocationService } from '../../core/services/location.service';
import { AreaOption, SedeOption } from '../../core/interfaces/location.interface';
import { ServiceProviderModalComponent } from './service-provider-modal/service-provider-modal.component'; 
import { ProviderSelection } from '../../core/interfaces/provider-option.interface';
import {
  SendOrderModalComponent,
  SendOrderModalPreviewPayload,
  SendOrderModalSubmitPayload
} from './send-order-modal/send-order-modal.component';
import {
  ProductSelectionItem,
  ProductSelectionModalComponent,
  UnitOption
} from './portal-selection-modal/product-selection-modal.component';
import { ConfirmExitModalComponent } from '../../shared/components/confirm-exit-modal/confirm-exit-modal.component';
import { OrderSummaryDraftService } from '../../core/services/order-summary-draft.service';


@Component({
  selector: 'app-portal-home-page',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    ServiceProviderModalComponent,
    ProductSelectionModalComponent,
    SendOrderModalComponent
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

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly draftService = inject(OrderSummaryDraftService);
  private readonly notificationService = inject(AppNotificationService);
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly supplierDirectoryService = inject(SupplierDirectoryService);
  private readonly locationService = inject(LocationService);
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
  private pendingEmailOrderId: number | null = null;
  private pendingEmailOrderNumber = '';
  private pendingEmailMessage = '';
  private pendingEmailRecipient = '';
  private defaultRecipientEmail = '';

  protected orderDate = this.toDateInputValue(new Date());
  protected dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
  protected deliverySiteId = 0;
  protected deliverySite = 'Planta Central - Lima';
  protected deliveryAreaId = 0;
  protected deliveryArea = 'Area de Recepcion Principal';
  protected sedes: SedeOption[] = [];
  protected areas: AreaOption[] = [];
  protected notes = '';
  protected purchaseOrderPreviewError = '';
  protected isLoadingPurchaseOrderNumber = false;
  protected isSubmittingOrder = false;
  protected isLoadingDraftOrder = false;
  protected emailSendError = false;
  protected isRetryingEmail = false;
  protected emailRetryCount = 0;
  protected lastSubmittedOrderNumber = '';
  protected showServiceProviderModal = false;
  protected showProductSelectionModal = false;
  protected showSendOrderModal = false;
  protected currentProviderSelection: ProviderSelection | null = null;
  protected summaryProviderSelection: ProviderSelection | null = null;
  protected rows: OrderRow[] = [];
  protected recipientEmail = '';
  protected emailSubject = '';
  protected emailMessage = '';
  protected attachmentName = '';
  protected isLoadingRecipientEmail = false;

  constructor() {
    this.restoreSummaryState();
    this.loadDeliveryLocations();
    this.handleStartSelectionRequest();
    this.handleDraftEditRequest();
    this.handleOrderDetailRequest();
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

  confirmDiscardDraft(): Observable<boolean> | boolean {
    if (!this.hasDraftSummary()) {
      return true;
    }

    return this.dialog
      .open(ConfirmExitModalComponent, {
        width: '460px',
        disableClose: true,
        panelClass: 'app-confirm-dialog',
      })
      .afterClosed()
      .pipe(
        map((result) => !!result),
        tap((shouldDiscard) => {
          if (shouldDiscard) {
            this.clearPersistedSummaryState();
          }
        })
      );
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

  protected onSedeChange(): void {
    this.deliverySite = this.resolveSedeName(this.deliverySiteId);
    this.deliveryAreaId = 0;
    this.deliveryArea = '';
    this.loadAreasForSelectedSede();
    this.persistSummaryState();
  }

  protected onAreaChange(): void {
    this.deliveryArea = this.resolveAreaName(this.deliveryAreaId);
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
    this.deliverySiteId = this.sedes[0]?.id ?? 0;
    this.deliverySite = this.resolveSedeName(this.deliverySiteId) || 'Planta Central - Lima';
    this.deliveryAreaId = this.areas.find((area) => area.sedeId === this.deliverySiteId)?.id ?? 0;
    this.deliveryArea = this.resolveAreaName(this.deliveryAreaId) || 'Area de Recepcion Principal';
    this.notes = '';
    this.purchaseOrderPreviewError = '';
    this.lastSubmittedOrderNumber = '';
    this.isLoadingPurchaseOrderNumber = false;
    this.isSubmittingOrder = false;
    this.isLoadingDraftOrder = false;
    this.emailSendError = false;
    this.isRetryingEmail = false;
    this.emailRetryCount = 0;
    this.currentEditingOrderId = null;
    this.pendingEmailOrderId = null;
    this.pendingEmailOrderNumber = '';
    this.pendingEmailMessage = '';
    this.pendingEmailRecipient = '';
    this.rows = [];
    this.showServiceProviderModal = false;
    this.showProductSelectionModal = false;
    this.showSendOrderModal = false;
    this.currentProviderSelection = null;
    this.summaryProviderSelection = null;
    this.recipientEmail = '';
    this.defaultRecipientEmail = '';
    this.emailSubject = '';
    this.emailMessage = '';
    this.attachmentName = '';
    this.isLoadingRecipientEmail = false;
    this.clearPersistedSummaryState();
    this.clearStatus();
  }

  protected retryEmailSend(): void {
    if (!this.pendingEmailOrderId || !this.pendingEmailMessage) {
      return;
    }

    this.sendPurchaseOrderEmail(
      this.pendingEmailOrderId,
      this.pendingEmailOrderNumber,
      this.pendingEmailMessage,
      this.pendingEmailRecipient,
      true
    );
  }

  protected openSendOrderModal(): void {
    const validationError = this.getOrderValidationError(false);
    if (validationError) {
      this.showStatus('error', validationError);
      return;
    }

    this.showSendOrderModal = true;
    this.emailSubject = this.buildEmailSubject();
    this.emailMessage = this.buildEmailMessage();
    this.attachmentName = this.buildAttachmentName();

    const providerEmail = this.summaryProviderSelection?.providerEmail?.trim() ?? '';
    if (providerEmail) {
      this.recipientEmail = providerEmail;
      this.defaultRecipientEmail = providerEmail;
      return;
    }

    const providerId = this.summaryProviderSelection?.providerId ?? 0;
    if (!providerId) {
      this.recipientEmail = '';
      this.defaultRecipientEmail = '';
      return;
    }

    this.isLoadingRecipientEmail = true;
    this.supplierDirectoryService.getSupplierDetail(providerId).subscribe({
      next: (response) => {
        const email = response.data?.contactoEmail?.trim() ?? '';
        this.recipientEmail = email;
        this.defaultRecipientEmail = email;

        if (this.summaryProviderSelection) {
          this.summaryProviderSelection = {
            ...this.summaryProviderSelection,
            providerEmail: email
          };
          this.persistSummaryState();
        }
      },
      error: () => {
        this.recipientEmail = '';
        this.defaultRecipientEmail = '';
        this.isLoadingRecipientEmail = false;
      },
      complete: () => {
        this.isLoadingRecipientEmail = false;
      }
    });
  }

  protected closeSendOrderModal(): void {
    if (this.isSubmittingOrder) {
      return;
    }

    this.showSendOrderModal = false;
  }

  private resolveRecipientOverride(recipientEmail: string): string {
    const trimmedRecipient = recipientEmail.trim();
    if (!trimmedRecipient) {
      return '';
    }

    const baseRecipient = this.defaultRecipientEmail.trim();
    if (!baseRecipient) {
      return trimmedRecipient;
    }

    return trimmedRecipient.toLowerCase() === baseRecipient.toLowerCase() ? '' : trimmedRecipient;
  }

  protected onSendOrderRequested(payload: SendOrderModalSubmitPayload): void {
    const trimmedRecipientEmail = payload.recipientEmail.trim();
    const recipientOverride = this.resolveRecipientOverride(trimmedRecipientEmail);

    this.recipientEmail = trimmedRecipientEmail;
    this.emailSubject = payload.emailSubject;
    this.emailMessage = payload.emailMessage;

    const validationError = this.getOrderValidationError(false);
    if (validationError) {
      this.showStatus('error', validationError);
      return;
    }

    if (!payload.emailMessage.trim()) {
      this.showStatus('error', 'Escribe un mensaje antes de enviar la orden.');
      return;
    }

    if (this.pendingEmailOrderId && !this.currentEditingOrderId) {
      this.sendPurchaseOrderEmail(
        this.pendingEmailOrderId,
        this.pendingEmailOrderNumber,
        payload.emailMessage,
        recipientOverride
      );
      return;
    }

    this.createAndSendPurchaseOrder(payload.emailMessage, recipientOverride);
  }

  protected openPdfPreview(payload: SendOrderModalPreviewPayload): void {
    const orderId = this.pendingEmailOrderId;
    if (orderId) {
      const urlTree = this.router.createUrlTree(['/portal/pedido/pdf-preview'], {
        queryParams: {
          orderId,
          previewData: null,
          attachmentName: payload.attachmentName || this.buildAttachmentName()
        }
      });

      const previewUrl = this.router.serializeUrl(urlTree);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const previewWindow = window.open('', '_blank');
    const providerId = this.summaryProviderSelection?.providerId ?? 0;

    const openPreview = (supplierContact: string, paymentTerms: string): void => {
      const previewData = JSON.stringify({
        orderNumber: this.pendingEmailOrderNumber || this.toPreviewOrderCode(),
        supplierName: this.summaryProviderSelection?.providerName || '',
        supplierRuc: this.summaryProviderSelection?.providerRuc || '',
        supplierEmail: this.recipientEmail || this.summaryProviderSelection?.providerEmail || '',
        supplierContact,
        deliverySite: this.deliverySite,
        deliveryArea: this.deliveryArea,
        deliveryDate: this.dispatchDate,
        paymentTerms,
        notes: this.notes || '',
        generatedBy: 'Generado por Grupo Kong Sistemas',
        lineItems: this.summaryRows.map((row, index) => ({
          item: `${index + 1}`.padStart(2, '0'),
          sku: row.code,
          description: row.description,
          unit: row.unit,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: this.rowSubtotal(row)
        })),
        subtotal: this.subtotalAmount,
        igv: this.taxAmount,
        total: this.totalAmount
      });

      const urlTree = this.router.createUrlTree(['/portal/pedido/pdf-preview'], {
        queryParams: {
          orderId: null,
          previewData,
          attachmentName: payload.attachmentName || this.buildAttachmentName()
        }
      });

      const previewUrl = this.router.serializeUrl(urlTree);
      if (previewWindow) {
        previewWindow.location.href = previewUrl;
        previewWindow.focus();
        return;
      }

      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    };

    if (!providerId) {
      openPreview('No registrado', 'No configurado');
      return;
    }

    this.supplierDirectoryService.getSupplierDetail(providerId).subscribe({
      next: (response) => {
        const supplier = response.data;
        openPreview(
          supplier?.contactoNombre?.trim() || 'No registrado',
          supplier?.diasCreditoLabel?.trim() || 'No configurado'
        );
      },
      error: () => {
        openPreview('No registrado', 'No configurado');
      }
    });
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
      deliverySiteId: this.deliverySiteId,
      deliverySite: this.deliverySite,
      deliveryAreaId: this.deliveryAreaId,
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

    this.deliverySiteId = this.toPositiveInt(parsed.deliverySiteId);

    if (typeof parsed.deliverySite === 'string') {
      this.deliverySite = parsed.deliverySite;
    }

    this.deliveryAreaId = this.toPositiveInt(parsed.deliveryAreaId);

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

    this.loadOrder(draftId);
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

  private handleOrderDetailRequest(): void {
    const orderId = this.toPositiveInt(this.route.snapshot.queryParamMap.get('orderId'));
    if (!orderId) {
      return;
    }

    this.loadOrder(orderId);
  }

  private loadOrder(orderId: number): void {
    this.isLoadingDraftOrder = true;
    this.currentEditingOrderId = null;

    this.purchaseOrderService
      .getPurchaseOrder(orderId)
      .pipe(
        switchMap(({ data, error }) => {
          if (error || !data) {
            return of({
              order: null,
              products: [] as ProductResponse[],
              error: error || 'No se pudo cargar la orden.'
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
          this.showStatus('error', error || 'No se pudo cargar la orden.');
          return;
        }

        this.applyLoadedOrder(order, products);
      });
  }

  private applyLoadedOrder(order: PurchaseOrderResponse, products: ProductResponse[]): void {
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
    this.deliverySiteId = order.sedeId;
    this.deliverySite = order.sede;
    this.deliveryAreaId = order.areaId;
    this.deliveryArea = order.area;
    this.loadAreasForSelectedSede(order.areaId);
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
    this.pendingEmailOrderId = order.id;
    this.pendingEmailOrderNumber = order.purchaseOrderNumber;

    if (order.status === 'BORRADOR') {
      this.currentEditingOrderId = order.id;
      this.showStatus('success', `Borrador ${order.purchaseOrderNumber} cargado para edición.`);
    }

    this.persistSummaryState();
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

  private createAndSendPurchaseOrder(customMessage: string, recipientOverride?: string): void {
    const request = this.buildPurchaseOrderRequest(false);
    if (!request) {
      this.showStatus('error', 'No se pudo preparar la orden de compra.');
      return;
    }

    this.isSubmittingOrder = true;
    const request$ = this.currentEditingOrderId
      ? this.purchaseOrderService.updatePurchaseOrder(this.currentEditingOrderId, request)
      : this.purchaseOrderService.createPurchaseOrder(request);

    request$.subscribe(({ data, error }) => {
      if (error || !data) {
        this.isSubmittingOrder = false;
        this.showStatus('error', error || 'No se pudo finalizar la orden de compra.');
        return;
      }

      this.pendingEmailOrderId = data.id;
      this.pendingEmailOrderNumber = data.purchaseOrderNumber;
      this.emailSubject = this.buildEmailSubject(data.purchaseOrderNumber);
      this.attachmentName = `${data.purchaseOrderNumber}.pdf`;

      this.sendPurchaseOrderEmail(data.id, data.purchaseOrderNumber, customMessage, recipientOverride);
    });
  }

  private sendPurchaseOrderEmail(
    orderId: number,
    orderNumber: string,
    customMessage: string,
    recipientOverride?: string,
    isRetry = false
  ): void {
    if (isRetry) {
      this.isRetryingEmail = true;
    } else {
      this.isSubmittingOrder = true;
    }

    const trimmedRecipientOverride = recipientOverride?.trim() ?? '';
    const emailRequest = trimmedRecipientOverride
      ? { message: customMessage, recipientEmail: trimmedRecipientOverride }
      : { message: customMessage };

    this.purchaseOrderService.sendPurchaseOrderEmail(orderId, emailRequest).subscribe(({ data, error }) => {
      this.isSubmittingOrder = false;
      this.isRetryingEmail = false;

      if (error || !data) {
        this.pendingEmailOrderId = orderId;
        this.pendingEmailOrderNumber = orderNumber;
        this.pendingEmailMessage = customMessage;
        this.pendingEmailRecipient = trimmedRecipientOverride;
        this.emailSubject = this.buildEmailSubject(orderNumber);
        this.attachmentName = `${orderNumber}.pdf`;
        this.showSendOrderModal = false;
        this.emailSendError = true;

        if (isRetry) {
          this.emailRetryCount++;
        }

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { orderId },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });

        this.showStatus(
          'error',
          error || `La orden ${orderNumber} fue registrada, pero no se pudo enviar el correo.`
        );
        return;
      }

      this.emailSendError = false;
      this.emailRetryCount = 0;
      this.handleSuccessfulEmailDelivery(orderNumber, data);
    });
  }

  private handleSuccessfulEmailDelivery(
    orderNumber: string,
    emailResponse: PurchaseOrderEmailResponse
  ): void {
    const wasEditing = this.currentEditingOrderId !== null;
    const wasRetry = this.emailRetryCount > 0 || this.emailSendError;
    const itemCount = this.summaryRows.length;
    const pdfName = emailResponse.pdfFileName ?? `${orderNumber}.pdf`;

    this.resetOrder();
    this.lastSubmittedOrderNumber = orderNumber;
    this.clearDraftQueryParams();
    this.clearOrderQueryParams();

    const successMessage = wasRetry
      ? 'Correo enviado correctamente'
      : wasEditing
        ? `Borrador ${orderNumber} actualizado y enviado correctamente con ${itemCount} item(s). PDF: ${pdfName}.`
        : `Orden de compra ${orderNumber} creada y enviada correctamente con ${itemCount} item(s). PDF: ${pdfName}.`;

    this.showStatus('success', successMessage);
  }

  private clearOrderQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        orderId: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
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

    if (!this.deliverySiteId) {
      return 'Selecciona una sede antes de continuar.';
    }

    if (!this.deliveryAreaId) {
      return 'Selecciona un área de recepción antes de continuar.';
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
      sedeId: this.deliverySiteId,
      areaId: this.deliveryAreaId,
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

  private loadDeliveryLocations(): void {
    const preferredSedeId = this.deliverySiteId;
    const preferredAreaId = this.deliveryAreaId;

    this.locationService.getSedes().subscribe(({ data, error }) => {
      if (error) {
        this.showStatus('error', error);
        return;
      }

      this.sedes = data;
      if (!this.sedes.length) {
        return;
      }

      const targetSedeId = this.deliverySiteId || preferredSedeId;
      const targetAreaId = this.deliveryAreaId || preferredAreaId;
      const preferredSede = this.sedes.find((sede) => sede.id === targetSedeId);
      this.deliverySiteId = preferredSede?.id ?? this.sedes[0].id;
      this.deliverySite = this.resolveSedeName(this.deliverySiteId);
      this.loadAreasForSelectedSede(targetAreaId);
    });
  }

  private loadAreasForSelectedSede(preferredAreaId = 0): void {
    if (!this.deliverySiteId) {
      this.areas = [];
      return;
    }

    this.locationService.getAreasBySede(this.deliverySiteId).subscribe(({ data, error }) => {
      if (error) {
        this.areas = [];
        this.showStatus('error', error);
        return;
      }

      this.areas = data;
      if (!this.areas.length) {
        this.deliveryAreaId = 0;
        this.deliveryArea = '';
        this.persistSummaryState();
        return;
      }

      const preferredArea = this.areas.find((area) => area.id === preferredAreaId);
      this.deliveryAreaId = preferredArea?.id ?? this.areas[0].id;
      this.deliveryArea = this.resolveAreaName(this.deliveryAreaId);
      this.persistSummaryState();
    });
  }

  private resolveSedeName(sedeId: number): string {
    return this.sedes.find((sede) => sede.id === sedeId)?.name ?? this.deliverySite;
  }

  private resolveAreaName(areaId: number): string {
    return this.areas.find((area) => area.id === areaId)?.nombre ?? this.deliveryArea;
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
      providerEmail: typeof provider.providerEmail === 'string' ? provider.providerEmail : '',
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

  private buildEmailSubject(orderNumber?: string): string {
    const providerName = this.summaryProviderSelection?.providerName?.trim() || 'Proveedor';
    const resolvedOrderNumber =
      orderNumber?.trim() || (this.currentEditingOrderId ? 'borrador en edición' : this.toPreviewOrderCode());
    return `Orden de Compra ${resolvedOrderNumber} - ${providerName}`;
  }

  private buildEmailMessage(): string {
    const providerName = this.summaryProviderSelection?.providerName?.trim() || 'proveedor';
    const orderCode = this.toPreviewOrderCode();
    const itemCount = this.summaryRows.length;
    const itemsLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

    return [
      `Estimado equipo de ${providerName},`,
      '',
      `Adjunto enviamos la orden de compra ${orderCode} correspondiente a ${itemsLabel} programados para despacho el ${this.dispatchDate}.`,
      '',
      'Por favor, confirmen la recepcion de este documento y la fecha estimada de entrega.',
      '',
      'Atentamente,',
      'Departamento de Compras'
    ].join('\n');
  }

  private buildAttachmentName(): string {
    return `${this.pendingEmailOrderNumber || this.toPreviewOrderCode()}.pdf`;
  }

  private toPreviewOrderCode(): string {
    const providerId = `${this.summaryProviderSelection?.providerId ?? 0}`.padStart(3, '0');
    return `PO-${new Date().getFullYear()}-${providerId}`;
  }
}
