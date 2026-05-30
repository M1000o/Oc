import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  CalidadStatus,
  DeliveryStatus,
  PurchaseOrderSummary
} from '../../core/interfaces/purchase-order.interface';
import { PurchaseOrderDetailResponse } from '../../core/interfaces/purchase-order-detail.interface';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { PurchaseOrderDetailModalComponent } from '../supplier-orders/purchase-order-detail-modal/purchase-order-detail-modal.component';

interface QualityScenario {
  id: string;
  label: string;
  icon: string;
  calidadStatus: CalidadStatus;
  deliveryStatus: DeliveryStatus;
  requiresReason: boolean;
}

interface QualityOrderView {
  id: number;
  orderNumber: string;
  orderDate: string;
  destination: string;
  supplierName: string;
  total: number;
  deliveryStatus: DeliveryStatus;
  calidadStatus: CalidadStatus;
}

interface QualityDetailView {
  purchaseOrderDetailId: number;
  codigoProducto: string;
  nombreProducto: string;
  unidadMedida: string;
  orderedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  motivo: string;
}

@Component({
  selector: 'app-quality-orders-page',
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './quality-orders.page.html',
  styleUrl: './quality-orders.page.css'
})
export class QualityOrdersPage implements OnInit {
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly notificationService = inject(AppNotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = inject(DatePipe);
  private readonly currencyPipe = inject(CurrencyPipe);

  protected readonly pageSize = 6;
  protected readonly currentPage = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal<number | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly orders = signal<QualityOrderView[]>([]);
  protected readonly reviewTarget = signal<QualityOrderView | null>(null);
  protected readonly selectedScenario = signal<QualityScenario | null>(null);
  protected readonly detailRows = signal<QualityDetailView[]>([]);
  protected readonly isLoadingDetail = signal(false);
  protected reason = '';

  protected readonly scenarios: QualityScenario[] = [
    {
      id: 'all-ok',
      label: 'Todo Ok',
      icon: 'verified',
      calidadStatus: 'APROBADO',
      deliveryStatus: 'COMPLETO',
      requiresReason: false
    },
    {
      id: 'partial-rejected',
      label: 'Se rechaza una parte',
      icon: 'report',
      calidadStatus: 'OBSERVADO',
      deliveryStatus: 'COMPLETO',
      requiresReason: true
    },
    {
      id: 'incomplete',
      label: 'Entrega incompleta',
      icon: 'inventory',
      calidadStatus: 'PARCIAL',
      deliveryStatus: 'PARCIAL',
      requiresReason: true
    },
    {
      id: 'incomplete-rejected',
      label: 'Entrega incompleta + rechazo',
      icon: 'rule',
      calidadStatus: 'OBSERVADO',
      deliveryStatus: 'PARCIAL',
      requiresReason: true
    },
    {
      id: 'full-rejected',
      label: 'Se rechaza todo',
      icon: 'block',
      calidadStatus: 'RECHAZADO',
      deliveryStatus: 'COMPLETO',
      requiresReason: true
    }
  ];

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.orders().length / this.pageSize))
  );

  protected readonly pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.orders().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  protected openReview(order: QualityOrderView): void {
    this.reviewTarget.set(order);
    this.selectedScenario.set(null);
    this.detailRows.set([]);
    this.reason = '';
  }

  protected closeReview(): void {
    this.reviewTarget.set(null);
    this.selectedScenario.set(null);
    this.detailRows.set([]);
    this.reason = '';
  }

  protected selectScenario(scenario: QualityScenario): void {
    this.selectedScenario.set(scenario);
    this.reason = '';

    if (!scenario.requiresReason) {
      this.saveReview();
      return;
    }

    this.loadOrderDetailsForReview();
  }

  protected updateAcceptedQuantity(row: QualityDetailView, value: string): void {
    const quantity = this.clampQuantity(Number(value), row.orderedQuantity);
    this.patchDetailRow(row.purchaseOrderDetailId, { acceptedQuantity: quantity });
  }

  protected updateRejectedQuantity(row: QualityDetailView, value: string): void {
    const quantity = this.clampQuantity(Number(value), row.orderedQuantity);
    this.patchDetailRow(row.purchaseOrderDetailId, { rejectedQuantity: quantity });
  }

  protected updateDetailReason(row: QualityDetailView, value: string): void {
    this.patchDetailRow(row.purchaseOrderDetailId, { motivo: value });
  }

  protected missingQuantity(row: QualityDetailView): number {
    return Math.max(0, row.orderedQuantity - row.acceptedQuantity - row.rejectedQuantity);
  }

  protected reviewedQuantity(row: QualityDetailView): number {
    return row.acceptedQuantity + row.rejectedQuantity;
  }

  protected requiresDetailReason(row: QualityDetailView): boolean {
    return row.acceptedQuantity < row.orderedQuantity;
  }

  protected saveReview(): void {
    const target = this.reviewTarget();
    const scenario = this.selectedScenario();

    if (!target || !scenario || this.isSaving() !== null) return;

    if (scenario.requiresReason && !this.validateDetailRows(scenario)) {
      return;
    }

    this.isSaving.set(target.id);
    this.purchaseOrderService
      .changeQualityStatus(target.id, {
        calidadStatus: scenario.calidadStatus,
        deliveryStatus: scenario.deliveryStatus,
        motivo: this.reason.trim() || undefined,
        details: scenario.requiresReason
          ? this.detailRows().map((row) => ({
              purchaseOrderDetailId: row.purchaseOrderDetailId,
              acceptedQuantity: row.acceptedQuantity,
              rejectedQuantity: row.rejectedQuantity,
              motivo: row.motivo.trim() || undefined
            }))
          : undefined
      })
      .subscribe(({ error }) => {
        this.isSaving.set(null);
        if (error) {
          this.notificationService.error(error);
          return;
        }

        this.notificationService.success('Resultado de calidad registrado correctamente.');
        this.closeReview();
        this.loadOrders();
      });
  }

  protected viewDetail(id: number): void {
    this.dialog.open(PurchaseOrderDetailModalComponent, {
      data: { orderId: id },
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'purchase-order-detail-dialog'
    });
  }

  protected toCurrency(value: number): string {
    return this.currencyPipe.transform(value, 'PEN', 'symbol', '1.2-2') ?? `${value}`;
  }

  protected resolveDeliveryStatusLabel(status: string): string {
    switch (status) {
      case 'RECIBIDO': return 'Recibido';
      case 'PARCIAL':
      case 'ENTREGADO_PARCIAL': return 'Parcial';
      case 'COMPLETO': return 'Completo';
      default: return status || 'Pendiente';
    }
  }

  protected resolveCalidadStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_REVISION': return 'En revisión';
      case 'PARCIAL': return 'Parcial';
      case 'APROBADO': return 'Aprobado';
      case 'OBSERVADO': return 'Observado';
      case 'RECHAZADO': return 'Rechazado';
      default: return status || 'Pendiente';
    }
  }

  private loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.purchaseOrderService.listQualityOrders(0, 100).subscribe(({ data, error }) => {
      this.isLoading.set(false);

      if (error || !data) {
        this.orders.set([]);
        this.errorMessage.set(error || 'No se pudieron cargar las órdenes de calidad.');
        return;
      }

      this.orders.set((data.content ?? []).map((order) => this.toQualityOrderView(order)));
      this.currentPage.set(1);
    });
  }

  private loadOrderDetailsForReview(): void {
    const target = this.reviewTarget();
    const scenario = this.selectedScenario();
    if (!target || !scenario) return;

    this.isLoadingDetail.set(true);
    this.purchaseOrderService.getPurchaseOrder(target.id).subscribe(({ data, error }) => {
      this.isLoadingDetail.set(false);
      if (error || !data) {
        this.detailRows.set([]);
        this.notificationService.error(error || 'No se pudo cargar el detalle de la orden.');
        return;
      }

      this.detailRows.set(data.details.map((detail) => this.toQualityDetailView(detail, scenario)));
    });
  }

  private toQualityOrderView(order: PurchaseOrderSummary): QualityOrderView {
    return {
      id: order.id,
      orderNumber: order.purchaseOrderNumber,
      orderDate: this.datePipe.transform(order.orderDate, 'dd MMM yyyy') ?? order.orderDate,
      destination: `${order.sede} · ${order.area}`,
      supplierName: order.supplierName,
      total: Number(order.total ?? 0),
      deliveryStatus: order.deliveryStatus,
      calidadStatus: order.calidadStatus
    };
  }

  private toQualityDetailView(
    detail: PurchaseOrderDetailResponse,
    scenario: QualityScenario
  ): QualityDetailView {
    const orderedQuantity = Number(detail.cantidad ?? 0);
    const rejectedQuantity = scenario.calidadStatus === 'RECHAZADO' ? orderedQuantity : 0;
    const acceptedQuantity = scenario.calidadStatus === 'RECHAZADO' ? 0 : orderedQuantity;

    return {
      purchaseOrderDetailId: detail.id,
      codigoProducto: detail.codigoProducto,
      nombreProducto: detail.nombreProducto,
      unidadMedida: detail.unidadMedida,
      orderedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      motivo: ''
    };
  }

  private validateDetailRows(scenario: QualityScenario): boolean {
    const rows = this.detailRows();
    if (!rows.length) {
      this.notificationService.error('Debe cargar el detalle de productos para registrar calidad.');
      return false;
    }

    const orderedTotal = rows.reduce((total, row) => total + row.orderedQuantity, 0);
    const acceptedTotal = rows.reduce((total, row) => total + row.acceptedQuantity, 0);
    const rejectedTotal = rows.reduce((total, row) => total + row.rejectedQuantity, 0);
    const reviewedTotal = acceptedTotal + rejectedTotal;
    const hasInvalidRow = rows.some((row) => this.reviewedQuantity(row) > row.orderedQuantity);
    const missingReasonRow = rows.find((row) => this.requiresDetailReason(row) && !row.motivo.trim());

    if (hasInvalidRow) {
      this.notificationService.error('Las cantidades aceptadas y rechazadas no pueden superar lo pedido.');
      return false;
    }

    if (missingReasonRow) {
      this.notificationService.error(`Debe indicar la razón para ${missingReasonRow.nombreProducto}.`);
      return false;
    }

    if (scenario.id === 'partial-rejected' && (rejectedTotal <= 0 || reviewedTotal !== orderedTotal)) {
      this.notificationService.error('Debe rechazar al menos una cantidad y revisar todo lo pedido.');
      return false;
    }

    if (scenario.id === 'incomplete' && (rejectedTotal !== 0 || acceptedTotal <= 0 || acceptedTotal >= orderedTotal)) {
      this.notificationService.error('Debe registrar una entrega incompleta sin cantidades rechazadas.');
      return false;
    }

    if (scenario.id === 'incomplete-rejected' && (rejectedTotal <= 0 || reviewedTotal >= orderedTotal)) {
      this.notificationService.error('Debe rechazar una parte y dejar cantidad pendiente de entrega.');
      return false;
    }

    if (scenario.id === 'full-rejected' && (acceptedTotal !== 0 || rejectedTotal !== orderedTotal)) {
      this.notificationService.error('Para rechazo total, todo lo pedido debe quedar rechazado.');
      return false;
    }

    return true;
  }

  private patchDetailRow(
    purchaseOrderDetailId: number,
    patch: Partial<QualityDetailView>
  ): void {
    this.detailRows.update((rows) =>
      rows.map((row) =>
        row.purchaseOrderDetailId === purchaseOrderDetailId
          ? { ...row, ...patch }
          : row
      )
    );
  }

  private clampQuantity(value: number, max: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(Math.trunc(value), 0), max);
  }
}
