import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const providerOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isProviderUser() ? true : router.createUrlTree([authService.getDefaultPortalRoute()]);
};

export const nonProviderGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isProviderUser()
    ? router.createUrlTree([authService.getDefaultPortalRoute()])
    : true;
};
