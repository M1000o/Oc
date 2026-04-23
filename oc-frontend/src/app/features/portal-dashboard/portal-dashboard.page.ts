import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OrderSummaryDraftService } from '../../core/services/order-summary-draft.service';
import { PortalLayoutComponent } from '../../shared/layout/portal-layout.component';

@Component({
  selector: 'app-portal-dashboard-page',
  imports: [CommonModule, MatIconModule],
  templateUrl: './portal-dashboard.page.html',
  styleUrl: './portal-dashboard.page.css'
})
export class PortalDashboardPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly draftService = inject(OrderSummaryDraftService);

  protected readonly quickActions = [
    {
      title: 'Pedidos Guardados',
      description: 'Retoma solicitudes en borrador y revisa su estado antes de enviarlas.',
      icon: 'bookmark',
      route: '/portal/guardados'
    },
    {
      title: 'Pedidos Enviados',
      description: 'Consulta los pedidos ya emitidos y haz seguimiento de su despacho.',
      icon: 'local_shipping',
      route: '/portal/enviados'
    }
  ];

  protected logout(): void {
    this.authService.logout();
  }

  protected get hasDraftOrder(): boolean {
    return this.draftService.hasDraft();
  }

  protected startOrder(): void {
    this.router.navigate(['/portal/pedido'], {
      queryParams: {
        startSelection: '1'
      }
    });
  }

  protected continueDraft(): void {
    this.router.navigate(['/portal/pedido']);
  }

  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
