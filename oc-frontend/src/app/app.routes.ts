import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { orderSummaryDraftGuard } from './core/guards/order-summary-draft.guard';
import { nonProviderGuard, providerOnlyGuard } from './core/auth/portal-role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'activation-link-status',
    loadComponent: () =>
      import('./features/activation-link-status/activation-link-status.page').then(
        (m) => m.ActivationLinkStatusPage
      )
  },
  {
    path: 'set-password',
    loadComponent: () =>
      import('./features/set-password/set-password.page').then((m) => m.SetPasswordPage)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/supplier-registration/supplier-registration.page').then(
        (m) => m.SupplierRegistrationPage
      )
  },
  {
    path: 'portal',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/portal-layout.component').then(m => m.PortalLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/portal-dashboard/portal-dashboard.page').then((m) => m.PortalDashboardPage)
      },
      {
        path: 'pedido',
        canActivate: [nonProviderGuard],
        canDeactivate: [orderSummaryDraftGuard],
        loadComponent: () => import('./features/portal-home/portal-home.page').then((m) => m.PortalHomePage)
      },
      {
        path: 'pedido/pdf-preview',
        canActivate: [nonProviderGuard],
        loadComponent: () =>
          import('./features/purchase-order-pdf/purchase-order-pdf.page').then(
            (m) => m.PurchaseOrderPdfPage
          )
      },
      {
        path: 'proveedor',
        canActivate: [providerOnlyGuard],
        loadComponent: () => import('./features/provider-home/provider-home.page').then((m) => m.ProviderHomePage)
      },
      {
        path: 'mis-ordenes',
        canActivate: [providerOnlyGuard],
        loadComponent: () => import('./features/supplier-orders/supplier-orders.page').then((m) => m.SupplierOrdersPage)
      },
      {
        path: 'guardados',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/saved-orders/saved-orders.page').then((m) => m.SavedOrdersPage)
      },
      {
        path: 'enviados',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/sent-orders/sent-orders.page').then((m) => m.SentOrdersPage)
      },
      {
        path: 'productos',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/productos-registration/productos-registration').then((m) => m.ProductosRegistration)
      },
      {
        path: 'proveedores',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/proveedores/proveedores').then((m) => m.Proveedores)
      },
      {
        path: 'proveedores/:id',
        canActivate: [nonProviderGuard],
        loadComponent: () => import('./features/proveedores/proveedores').then((m) => m.Proveedores)
      }
       // ...otras rutas hijas protegidas
    ]
  },
  // Rutas duplicadas eliminadas. Las rutas de guardados y enviados solo existen como hijas de portal con layout.
  { path: '**', redirectTo: 'login' }
];
