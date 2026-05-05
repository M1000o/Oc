import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  PurchaseOrderStatus,
  PurchaseOrderSummary
} from '../../core/interfaces/purchase-order.interface';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderDetailModalComponent } from '../supplier-orders/purchase-order-detail-modal.component';

type ShipmentStatus = 'PENDIENTE' | 'APROBADO';

interface SentOrderView {
  id: number;
  orderNumber: string;
  shipmentDate: string;
  destination: string;
  supplierName: string;
  total: number;
  status: ShipmentStatus;
}

@Component({
  selector: 'app-sent-orders-page',
  imports: [CommonModule, MatIconModule, MatDialogModule],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './sent-orders.page.html',
  styleUrl: './sent-orders.page.css'
})
export class SentOrdersPage implements OnInit {
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = inject(DatePipe);
  private readonly currencyPipe = inject(CurrencyPipe);

  protected readonly pageSize = 4;
  protected readonly currentPage = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly orders = signal<SentOrderView[]>([]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.orders().length / this.pageSize))
  );

  protected readonly pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.orders().slice(start, start + this.pageSize);
  });

  protected readonly visibleCount = computed(() => this.pagedOrders().length);

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

  protected exportReport(): void {
    const header = ['Pedido', 'FechaRegistro', 'Destino', 'Proveedor', 'Total', 'Estado'];
    const rows = this.orders().map((order) => [
      order.orderNumber,
      order.shipmentDate,
      order.destination,
      order.supplierName,
      this.toCurrency(order.total),
      this.resolveStatusLabel(order.status)
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pedidos-enviados.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected toCurrency(value: number): string {
    return this.currencyPipe.transform(value, 'PEN', 'symbol', '1.2-2') ?? `${value}`;
  }

  protected resolveStatusLabel(status: ShipmentStatus): string {
    return status === 'APROBADO' ? 'Aprobado' : 'Pendiente';
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

  private loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.purchaseOrderService
      .listPurchaseOrdersPage({}, 0, 50)
      .subscribe(({ data, error }) => {
        this.isLoading.set(false);

        if (error || !data) {
          this.orders.set([]);
          this.errorMessage.set(error || 'No se pudieron cargar los pedidos enviados.');
          return;
        }

        this.orders.set(
          (data.content ?? [])
            .filter((order) => this.isSentOrderStatus(order.status))
            .map((order) => this.toSentOrderView(order))
        );
        this.currentPage.set(1);
      });
  }

  private isSentOrderStatus(status: PurchaseOrderStatus): status is ShipmentStatus {
    const normalizedStatus = `${status}`.trim().toUpperCase();
    return normalizedStatus === 'PENDIENTE' || normalizedStatus === 'APROBADO';
  }

  private toSentOrderView(order: PurchaseOrderSummary): SentOrderView {
    const normalizedStatus = `${order.status}`.trim().toUpperCase();

    return {
      id: order.id,
      orderNumber: order.purchaseOrderNumber,
      shipmentDate: this.formatDate(order.orderDate),
      destination: `${order.sede} · ${order.area}`,
      supplierName: order.supplierName,
      total: Number(order.total ?? 0),
      status: normalizedStatus === 'APROBADO' ? 'APROBADO' : 'PENDIENTE'
    };
  }

  private formatDate(value: string): string {
    return this.datePipe.transform(value, 'dd MMM yyyy') ?? value;
  }
}
