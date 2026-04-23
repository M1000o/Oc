import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import {
  PurchaseOrderRequest,
  PurchaseOrderResponse
} from '../interfaces/purchase-order.interface';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);

  previewNextPurchaseOrderNumber(): Observable<{ data: string; error: string }> {
    return this.http
      .get<ApiResponse<string>>(
        `${environment.api.baseUrl}${environment.api.endpoints.purchaseOrders}/next-number`
      )
      .pipe(
        map((response) => ({
          data: response.data ?? '',
          error: ''
        })),
        catchError(() =>
          of({
            data: '',
            error: 'No se pudo generar el numero de orden de compra.'
          })
        )
      );
  }

  createPurchaseOrder(
    request: PurchaseOrderRequest
  ): Observable<{ data: PurchaseOrderResponse | null; error: string }> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse>>(
        `${environment.api.baseUrl}${environment.api.endpoints.purchaseOrders}`,
        request
      )
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
              'No se pudo finalizar la orden de compra.'
          })
        )
      );
  }
}
