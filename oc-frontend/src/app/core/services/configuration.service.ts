import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { PurchaseOrderCompanyConfiguration } from '../interfaces/configuration.interface';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.baseUrl}${environment.api.endpoints.configuration}`;

  getPurchaseOrderCompanyConfiguration(): Observable<{
    data: PurchaseOrderCompanyConfiguration | null;
    error: string;
  }> {
    return this.http
      .get<ApiResponse<PurchaseOrderCompanyConfiguration>>(`${this.endpoint}/purchase-order-company`)
      .pipe(
        map((response) => ({
          data: response.data ?? null,
          error: ''
        })),
        catchError((error) =>
          of({
            data: null,
            error:
              error?.error?.message ||
              error?.error?.error ||
              'No se pudo cargar la configuración de órdenes de compra.'
          })
        )
      );
  }

  updatePurchaseOrderCompanyConfiguration(
    payload: PurchaseOrderCompanyConfiguration
  ): Observable<{ data: PurchaseOrderCompanyConfiguration | null; error: string }> {
    return this.http
      .put<ApiResponse<PurchaseOrderCompanyConfiguration>>(
        `${this.endpoint}/purchase-order-company`,
        payload
      )
      .pipe(
        map((response) => ({
          data: response.data ?? null,
          error: ''
        })),
        catchError((error) => {
          const detail = error?.error?.errors;
          const firstError = detail ? (Object.values(detail)[0] as string) : null;

          return of({
            data: null,
            error:
              firstError ||
              error?.error?.message ||
              error?.error?.error ||
              'No se pudo guardar la configuración de órdenes de compra.'
          });
        })
      );
  }
}
