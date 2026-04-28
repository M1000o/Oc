import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
  PurchaseOrderStatus,
  PurchaseOrderSummary
} from '../../core/interfaces/purchase-order.interface';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';

interface SavedOrderView {
  id: number;
  date: string;
  supplierName: string;
  destination: string;
  reference: string;
  status: 'Guardado';
}

@Component({
  selector: 'app-saved-orders-page',
  imports: [CommonModule, MatIconModule],
  providers: [DatePipe],
  templateUrl: './saved-orders.page.html',
  styleUrl: './saved-orders.page.css'
})
export class SavedOrdersPage implements OnInit {
  private readonly router = inject(Router);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly datePipe = inject(DatePipe);

  protected readonly pageSize = 4;
  protected readonly currentPage = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly isCancellingOrderId = signal<number | null>(null);
  protected readonly orders = signal<SavedOrderView[]>([]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.orders().length / this.pageSize))
  );

  protected readonly pagedOrders = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.orders().slice(start, start + this.pageSize);
  });

  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  protected readonly rangeLabel = computed(() => {
    const total = this.orders().length;
    if (!total) {
      return 'Mostrando 0 de 0 pedidos';
    }

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `Mostrando ${start} a ${end} de ${total} pedidos`;
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  protected editOrder(order: SavedOrderView): void {
    this.router.navigate(['/portal/pedido'], {
      queryParams: {
        draftId: order.id
      }
    });
  }

  protected deleteOrder(orderId: number): void {
    this.isCancellingOrderId.set(orderId);

    this.purchaseOrderService
      .changePurchaseOrderStatus(orderId, {
        status: 'CANCELADO',
        motivo: 'Cancelado desde la vista de pedidos guardados'
      })
      .subscribe(({ error }) => {
        this.isCancellingOrderId.set(null);

        if (error) {
          this.errorMessage.set(error);
          return;
        }

        this.loadOrders();
      });
  }

  private loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.purchaseOrderService
      .listAllPurchaseOrdersByStatus('BORRADOR')
      .subscribe(({ data, error }) => {
        this.isLoading.set(false);

        if (error) {
          this.orders.set([]);
          this.errorMessage.set(error);
          return;
        }

        this.orders.set(data.map((order) => this.toSavedOrderView(order)));
        this.currentPage.set(1);
      });
  }

  private toSavedOrderView(order: PurchaseOrderSummary): SavedOrderView {
    return {
      id: order.id,
      date: this.formatDate(order.orderDate),
      supplierName: order.supplierName,
      destination: `${order.sede} · ${order.area}`,
      reference: order.purchaseOrderNumber,
      status: this.toSavedOrderStatus(order.status)
    };
  }

  private toSavedOrderStatus(status: PurchaseOrderStatus): 'Guardado' {
    return status === 'BORRADOR' ? 'Guardado' : 'Guardado';
  }

  private formatDate(value: string): string {
    return this.datePipe.transform(value, 'dd MMM yyyy') ?? value;
  }
}
