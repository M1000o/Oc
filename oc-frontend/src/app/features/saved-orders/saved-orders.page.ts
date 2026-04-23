import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PortalLayoutComponent } from '../../shared/layout/portal-layout.component';

interface SavedOrder {
  id: number;
  date: string;
  time: string;
  summary: string;
  reference: string;
  status: 'Guardado';
}

@Component({
  selector: 'app-saved-orders-page',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './saved-orders.page.html',
  styleUrl: './saved-orders.page.css'
})
export class SavedOrdersPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pageSize = 4;

  protected readonly searchTerm = signal('');
  protected readonly currentPage = signal(1);

  protected readonly orders = signal<SavedOrder[]>([
    {
      id: 1,
      date: '24 Oct 2023',
      time: '14:30 hrs',
      summary: '15x Laptops Dell Latitude, 30x Monitores',
      reference: 'ORD-2023-8891',
      status: 'Guardado'
    },
    {
      id: 2,
      date: '22 Oct 2023',
      time: '09:15 hrs',
      summary: '50x Teclados Mecanicos, 50x Ratones Opticos',
      reference: 'ORD-2023-8842',
      status: 'Guardado'
    },
    {
      id: 3,
      date: '18 Oct 2023',
      time: '16:45 hrs',
      summary: '2x Servidores Rack, 1x Switch Cisco',
      reference: 'ORD-2023-8711',
      status: 'Guardado'
    },
    {
      id: 4,
      date: '15 Oct 2023',
      time: '11:20 hrs',
      summary: '100x Licencias Software, Mantenimiento Anual',
      reference: 'ORD-2023-8650',
      status: 'Guardado'
    },
    {
      id: 5,
      date: '12 Oct 2023',
      time: '08:10 hrs',
      summary: '20x Impresoras Laser, 80x Toners',
      reference: 'ORD-2023-8599',
      status: 'Guardado'
    },
    {
      id: 6,
      date: '09 Oct 2023',
      time: '10:35 hrs',
      summary: '12x UPS Online, 24x Baterias de Respaldo',
      reference: 'ORD-2023-8532',
      status: 'Guardado'
    },
    {
      id: 7,
      date: '08 Oct 2023',
      time: '13:55 hrs',
      summary: '70x Sillas Ergonomicas, 20x Escritorios',
      reference: 'ORD-2023-8518',
      status: 'Guardado'
    },
    {
      id: 8,
      date: '06 Oct 2023',
      time: '17:20 hrs',
      summary: '25x Tablets, 25x Fundas de Proteccion',
      reference: 'ORD-2023-8488',
      status: 'Guardado'
    },
    {
      id: 9,
      date: '04 Oct 2023',
      time: '12:00 hrs',
      summary: '4x Proyectores, 4x Pantallas Retractiles',
      reference: 'ORD-2023-8427',
      status: 'Guardado'
    },
    {
      id: 10,
      date: '03 Oct 2023',
      time: '15:05 hrs',
      summary: '40x Discos SSD 1TB, 40x Memorias RAM',
      reference: 'ORD-2023-8410',
      status: 'Guardado'
    },
    {
      id: 11,
      date: '01 Oct 2023',
      time: '08:45 hrs',
      summary: '8x Firewalls, 10x Access Points WiFi 6',
      reference: 'ORD-2023-8375',
      status: 'Guardado'
    },
    {
      id: 12,
      date: '29 Sep 2023',
      time: '09:30 hrs',
      summary: '6x Camaras PTZ, 2x NVR de 32 canales',
      reference: 'ORD-2023-8321',
      status: 'Guardado'
    }
  ]);

  protected readonly filteredOrders = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.orders();
    }

    return this.orders().filter(
      (order) =>
        order.summary.toLowerCase().includes(query) ||
        order.reference.toLowerCase().includes(query) ||
        order.date.toLowerCase().includes(query)
    );
  });

  protected readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize));
  });

  protected readonly pagedOrders = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredOrders().slice(start, end);
  });

  protected readonly pageNumbers = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  });

  protected readonly rangeLabel = computed(() => {
    const total = this.filteredOrders().length;
    if (!total) {
      return 'Mostrando 0 de 0 pedidos';
    }

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `Mostrando ${start} a ${end} de ${total} pedidos`;
  });

  protected logout(): void {
    this.authService.logout();
  }

  protected updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
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

  protected editOrder(order: SavedOrder): void {
    this.router.navigate(['/portal/pedido'], {
      queryParams: {
        draft: order.reference
      }
    });
  }

  protected deleteOrder(orderId: number): void {
    const nextOrders = this.orders().filter((order) => order.id !== orderId);
    this.orders.set(nextOrders);

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }
}
