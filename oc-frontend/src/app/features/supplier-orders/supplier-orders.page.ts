import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import {
  DeliveryStatus,
  PurchaseOrderStatus,
  PurchaseOrderSummary
} from '../../core/interfaces/purchase-order.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderDetailModalComponent } from './purchase-order-detail-modal/purchase-order-detail-modal.component';

@Component({
  selector: 'app-supplier-orders-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, FormsModule],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './supplier-orders.page.html',
  styleUrl: './supplier-orders.page.css'
})
export class SupplierOrdersPage implements OnInit {
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly notificationService = inject(AppNotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = inject(DatePipe);
  private readonly currencyPipe = inject(CurrencyPipe);

  protected readonly allOrders = signal<PurchaseOrderSummary[]>([]);
  protected readonly quickSearch = signal('');
  protected readonly selectedDeliveryStatus = signal<DeliveryStatus | 'ALL'>('ALL');
  protected readonly appliedQuickSearch = signal('');
  protected readonly appliedDeliveryStatus = signal<DeliveryStatus | 'ALL'>('ALL');
  protected readonly isLoading = signal(true);
  protected readonly loadingDelayed = signal(false);
  protected readonly errorMessage = signal('');

  private loadingTimeout?: ReturnType<typeof setTimeout>;

  protected readonly currentPage = signal(0);
  protected readonly pageSize = 10;
  protected readonly filteredOrders = computed(() => {
    const deliveryStatus = this.appliedDeliveryStatus();
    const quickSearch = this.appliedQuickSearch().trim().toLowerCase();

    return this.allOrders().filter((order) => {
      const matchDeliveryStatus =
        deliveryStatus === 'ALL' || order.deliveryStatus === deliveryStatus;
      if (!matchDeliveryStatus) {
        return false;
      }

      if (!quickSearch) {
        return true;
      }

      const searchableText = [
        order.purchaseOrderNumber,
        order.sede,
        order.area,
        order.clientName ?? '',
        order.supplierName ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(quickSearch);
    });
  });
  protected readonly totalElements = computed(() => this.filteredOrders().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalElements() / this.pageSize))
  );
  protected readonly orders = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  protected readonly showingFrom = computed(() => (this.totalElements() === 0 ? 0 : this.currentPage() * this.pageSize + 1));
  protected readonly showingTo = computed(() => Math.min((this.currentPage() + 1) * this.pageSize, this.totalElements()));

  ngOnInit(): void {
    this.loadOrders();
  }

  private setLoading(value: boolean): void {
    this.isLoading.set(value);
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = undefined;
    }

    if (value) {
      // Retrasar la activación visual del loader para evitar parpadeos en redes rápidas
      this.loadingTimeout = setTimeout(() => {
        if (this.isLoading()) {
          this.loadingDelayed.set(true);
        }
      }, 150);
    } else {
      this.loadingDelayed.set(false);
    }
  }

  protected loadOrders(): void {
    this.setLoading(true);
    this.errorMessage.set('');

    this.purchaseOrderService.listAllSupplierOrders()
      .subscribe(({ data, error }) => {
        this.setLoading(false);
        if (error) {
          this.errorMessage.set(error || 'No se pudieron cargar las órdenes.');
          return;
        }
        this.allOrders.set(data);
        this.currentPage.set(0);
      });
  }

  protected applyFilters(): void {
    this.appliedQuickSearch.set(this.quickSearch());
    this.appliedDeliveryStatus.set(this.selectedDeliveryStatus());
    this.currentPage.set(0);
  }

  protected onQuickSearchChange(value: string): void {
    this.quickSearch.set(value);
    this.appliedQuickSearch.set(value);
    this.currentPage.set(0);
  }

  protected previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  protected formatDate(date: string): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || date;
  }

  protected formatCurrency(amount: number): string {
    return this.currencyPipe.transform(amount, 'S/', 'symbol', '1.2-2') || `$${amount.toFixed(2)}`;
  }

  protected getStatusClass(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'APROBADO':
        return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]/30';
      case 'PENDIENTE':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
      case 'BORRADOR':
        return 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]/30';
      case 'CANCELADO':
        return 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]/30';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  protected getStatusLabel(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'APROBADO': return 'Entregado';
      case 'PENDIENTE': return 'Pendiente';
      case 'BORRADOR': return 'En Proceso';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  }

  protected getDeliveryStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROCESO': return 'En Proceso';
      case 'ENTREGADO': return 'Entregado';
      case 'ENTREGADO_PARCIAL': return 'Entrega Parcial';
      case 'RECHAZADO': return 'Rechazado';
      case 'ATRASADO': return 'Atrasado';
      default: return status;
    }
  }

  protected getDeliveryStatusClass(status: string): string {
    switch (status) {
      case 'ENTREGADO':
        return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]/30';
      case 'ENTREGADO_PARCIAL':
        return 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]/30';
      case 'PENDIENTE':
      case 'EN_PROCESO':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
      case 'RECHAZADO':
      case 'ATRASADO':
        return 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]/30';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }
  
  protected viewDetail(id: number): void {
      const dialogRef = this.dialog.open(PurchaseOrderDetailModalComponent, {
        data: { orderId: id },
        width: '1100px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'purchase-order-detail-dialog'
      });

      dialogRef.afterClosed().subscribe(() => {
        this.loadOrders();
      });
  }
  
  protected downloadPdf(id: number): void {
    const order = this.orders().find(o => o.id === id);
    const orderNumber = order?.purchaseOrderNumber || `OC-${id}`;
    
    this.notificationService.show('success', `Iniciando descarga de la orden ${orderNumber}...`, 2000);

    this.purchaseOrderService.downloadPurchaseOrderPdf(id)
      .subscribe({
        next: (response) => {
          const content = response.body;
          if (!content || content.size === 0) {
            this.notificationService.error('El PDF generado está vacío.');
            return;
          }

          const pdfBlob = new Blob([content], { type: 'application/pdf' });
          const fileName = this.resolvePdfFileName(response.headers.get('content-disposition'), orderNumber);
          this.downloadBlob(pdfBlob, fileName);
          this.notificationService.success(`Orden ${orderNumber} descargada correctamente.`);
        },
        error: (err) => {
          console.error('Error downloading PDF:', err);
          this.notificationService.error('No se pudo descargar el PDF de la orden de compra.');
        }
      });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }

  private resolvePdfFileName(contentDisposition: string | null, orderNumber: string): string {
    const fallback = `${orderNumber}.pdf`;
    if (!contentDisposition) {
      return fallback;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {
        return fallback;
      }
    }

    const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return asciiMatch?.[1]?.trim() || fallback;
  }
}
