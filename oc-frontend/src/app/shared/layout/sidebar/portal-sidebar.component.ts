import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NavItem } from '../../models/nav-item.model';


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

  protected get navItems(): NavItem[] {
    if (this.authService.isProviderUser()) {
      return [
        {
          label: 'Panel del Proveedor',
          icon: 'storefront',
          route: '/portal/proveedor',
          exact: true
        },
        {
          label: 'Mis Órdenes',
          icon: 'receipt_long',
          route: '/portal/mis-ordenes',
          exact: true
        }
      ];
    }

    return [
      {
        label: 'Inicio',
        icon: 'space_dashboard',
        route: '/portal',
        exact: true
      },
      {
        label: 'Realizar Pedido',
        icon: 'add_shopping_cart',
        route: '/portal/pedido',
        exact: true,
        queryParams: {
          startSelection: '1'
        }
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
      },
      {
        label: 'Mantenimiento',
        icon: 'build',
        children: [
          {
            label: 'Productos',
            icon: 'inventory_2',
            route: '/portal/productos',
            exact: true
          },
          {
            label: 'Proveedores',
            icon: 'folder_shared',
            route: '/portal/proveedores',
            exact: false
          }
        ]
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
