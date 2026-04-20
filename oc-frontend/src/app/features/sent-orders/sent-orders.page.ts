import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { PortalLayoutComponent } from '../../shared/layout/portal-layout.component';

type ShipmentStatus = 'En Camino' | 'Entregado';

interface SentOrder {
  id: number;
  orderNumber: string;
  shipmentDate: string;
  destination: string;
  client: string;
  total: number;
  status: ShipmentStatus;
}

@Component({
  selector: 'app-sent-orders-page',
  imports: [CommonModule, FormsModule, MatIconModule, PortalLayoutComponent],
  templateUrl: './sent-orders.page.html',
  styleUrl: './sent-orders.page.css'
})
export class SentOrdersPage {
  private readonly authService = inject(AuthService);

  protected readonly pageSize = 4;

  protected readonly searchTerm = signal('');
  protected readonly currentPage = signal(1);

  protected readonly orders = signal<SentOrder[]>([
    {
      id: 1,
      orderNumber: '#ORD-99382',
      shipmentDate: '24 Oct, 2023',
      destination: 'Av. Reforma 221, CDMX',
      client: 'Grupo Modelo',
      total: 4520,
      status: 'En Camino'
    },
    {
      id: 2,
      orderNumber: '#ORD-99381',
      shipmentDate: '22 Oct, 2023',
      destination: 'Parque Industrial, MTY',
      client: 'Industrias ACME',
      total: 12850.5,
      status: 'Entregado'
    },
    {
      id: 3,
      orderNumber: '#ORD-99375',
      shipmentDate: '19 Oct, 2023',
      destination: 'Plaza Mayor, Leon',
      client: 'Calzado Flexi',
      total: 1200,
      status: 'Entregado'
    },
    {
      id: 4,
      orderNumber: '#ORD-99390',
      shipmentDate: '25 Oct, 2023',
      destination: 'Zona Rio, Tijuana',
      client: 'Distribuidora Norte',
      total: 8940.25,
      status: 'En Camino'
    },
    {
      id: 5,
      orderNumber: '#ORD-99402',
      shipmentDate: '27 Oct, 2023',
      destination: 'Centro Historico, Puebla',
      client: 'Textiles MX',
      total: 5630,
      status: 'En Camino'
    },
    {
      id: 6,
      orderNumber: '#ORD-99354',
      shipmentDate: '17 Oct, 2023',
      destination: 'Zona Empresarial, Queretaro',
      client: 'TecnoPartes',
      total: 3420,
      status: 'Entregado'
    },
    {
      id: 7,
      orderNumber: '#ORD-99347',
      shipmentDate: '15 Oct, 2023',
      destination: 'Norte 45, Azcapotzalco',
      client: 'Fabrica Delta',
      total: 7215.9,
      status: 'Entregado'
    },
    {
      id: 8,
      orderNumber: '#ORD-99341',
      shipmentDate: '14 Oct, 2023',
      destination: 'Corredor Industrial, Toluca',
      client: 'Insumos Prime',
      total: 990.4,
      status: 'En Camino'
    }
  ]);

  protected readonly filteredOrders = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    if (!query) {
      return this.orders();
    }

    return this.orders().filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.shipmentDate.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query) ||
        order.client.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
    );
  });

  protected readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize));
  });

  protected readonly pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  protected readonly visibleCount = computed(() => this.pagedOrders().length);

  protected logout(): void {
    this.authService.logout();
  }

  protected updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
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
    const header = ['Pedido', 'FechaEnvio', 'Destino', 'Cliente', 'Total', 'Estado'];
    const rows = this.filteredOrders().map((order) => [
      order.orderNumber,
      order.shipmentDate,
      order.destination,
      order.client,
      this.toCurrency(order.total),
      order.status
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(value);
  }
}
