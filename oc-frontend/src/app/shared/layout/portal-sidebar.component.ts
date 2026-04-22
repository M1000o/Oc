import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-portal-sidebar',
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './portal-sidebar.component.html',
  styleUrl: './portal-sidebar.component.css'
})
export class PortalSidebarComponent {
  private readonly authService = inject(AuthService);

  @Output() logoutRequest = new EventEmitter<void>();
  @Output() navigationRequest = new EventEmitter<void>();

  protected get userName(): string {
    return this.authService.getUserDisplayName();
  }

  protected get userRole(): string {
    return this.authService.getUserRole();
  }

  protected get userInitials(): string {
    return this.authService.getUserInitials();
  }

  protected get navItems(): Array<{ label: string; icon: string; route: string; exact?: boolean }> {
    if (this.authService.isProviderUser()) {
      return [
        {
          label: 'Panel del Proveedor',
          icon: 'storefront',
          route: '/portal/proveedor',
          exact: true
        }
      ];
    }

    return [
      {
        label: 'Realizar Pedido',
        icon: 'add_shopping_cart',
        route: '/portal',
        exact: true
      },
      {
        label: 'Ver Pedidos Guardados',
        icon: 'bookmark',
        route: '/portal/guardados',
        exact: true
      },
      {
        label: 'Ver Pedidos Enviados',
        icon: 'local_shipping',
        route: '/portal/enviados',
        exact: true
      }
    ];
  }

  protected handleNavigationClick(): void {
    this.navigationRequest.emit();
  }

  protected onLogoutClick(): void {
    this.logoutRequest.emit();
  }
}
