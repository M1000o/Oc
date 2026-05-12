import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { PurchaseOrderSummary, PurchaseOrderStatus } from '../../core/interfaces/purchase-order.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderDetailModalComponent } from './purchase-order-detail-modal.component';

@Component({
  selector: 'app-supplier-orders-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
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

  protected readonly orders = signal<PurchaseOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadingDelayed = signal(false);
  protected readonly errorMessage = signal('');
  
  private loadingTimeout?: any;

  protected readonly currentPage = signal(0);
  protected readonly pageSize = 10;
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly showingFrom = computed(() => this.currentPage() * this.pageSize + 1);
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

  protected loadOrders(page = 0): void {
    this.setLoading(true);
    this.errorMessage.set('');
    
    this.purchaseOrderService.getSupplierOrders(page, this.pageSize)
      .subscribe(({ data, error }) => {
        this.setLoading(false);
        if (error || !data) {
          this.errorMessage.set(error || 'No se pudieron cargar las órdenes.');
          return;
        }
        this.orders.set(data.content);
        this.totalElements.set(data.totalElements);
        this.totalPages.set(data.totalPages);
        this.currentPage.set(data.number);
      });
  }

  protected previousPage(): void {
    if (this.currentPage() > 0) {
      this.loadOrders(this.currentPage() - 1);
    }
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.loadOrders(this.currentPage() + 1);
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
  
  protected viewDetail(id: number): void {
      this.dialog.open(PurchaseOrderDetailModalComponent, {
        data: { orderId: id },
        width: '1100px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'purchase-order-detail-dialog'
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
