import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const isBackendRequest = req.url.startsWith(environment.api.baseUrl);
  const isPublicRequest =
    req.url.includes(environment.api.endpoints.login) ||
    req.url.includes(environment.api.endpoints.setPassword) ||
    req.url.includes(environment.api.endpoints.resendActivation);

  const authorizedRequest =
    accessToken && isBackendRequest && !isPublicRequest
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      : req;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicRequest) {
        authService.clearSession();
      }

      return throwError(() => error);
    })
  );
};
