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
    canActivate: [authGuard, nonProviderGuard],
    canDeactivate: [orderSummaryDraftGuard],
    loadComponent: () =>
      import('./features/portal-home/portal-home.page').then((m) => m.PortalHomePage)
  },
  {
    path: 'portal/proveedor',
    canActivate: [authGuard, providerOnlyGuard],
    loadComponent: () =>
      import('./features/provider-home/provider-home.page').then((m) => m.ProviderHomePage)
  },
  {
    path: 'portal/guardados',
    canActivate: [authGuard, nonProviderGuard],
    loadComponent: () =>
      import('./features/saved-orders/saved-orders.page').then((m) => m.SavedOrdersPage)
  },
  {
    path: 'portal/enviados',
    canActivate: [authGuard, nonProviderGuard],
    loadComponent: () =>
      import('./features/sent-orders/sent-orders.page').then((m) => m.SentOrdersPage)
  },
  { path: '**', redirectTo: 'login' }
];
