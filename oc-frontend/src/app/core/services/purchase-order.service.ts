import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, EMPTY, expand, forkJoin, map, Observable, of, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import {
  PurchaseOrderEmailRequest,
  PurchaseOrderEmailResponse,
  PurchaseOrderFilter,
  PurchaseOrderRequest,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  PurchaseOrderStatusPayload,
  PurchaseOrderSummary
} from '../interfaces/purchase-order.interface';
import { PageResponse } from '../interfaces/page-response.interface';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.baseUrl}${environment.api.endpoints.purchaseOrders}`;

  createPurchaseOrder(
    request: PurchaseOrderRequest
  ): Observable<{ data: PurchaseOrderResponse | null; error: string }> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse>>(this.endpoint, request)
      .pipe(
        map((response) => ({
          data: response.data ?? null,
          error: ''
        })),
        catchError((error) => {
          const detail = error?.error?.errors;
          const firstError = detail ? Object.values(detail)[0] as string : null;
          
          return of({
            data: null,
            error:
              firstError ||
              error?.error?.message ||
              error?.error?.error ||
              'No se pudo finalizar la orden de compra.'
          });
        })
      );
  }

  updatePurchaseOrder(
    id: number,
    request: PurchaseOrderRequest
  ): Observable<{ data: PurchaseOrderResponse | null; error: string }> {
    return this.http.put<ApiResponse<PurchaseOrderResponse>>(`${this.endpoint}/${id}`, request).pipe(
      map((response) => ({
        data: response.data ?? null,
        error: ''
      })),
      catchError((error) => {
        const detail = error?.error?.errors;
        const firstError = detail ? Object.values(detail)[0] as string : null;
        
        return of({
          data: null,
          error:
            firstError ||
            error?.error?.message ||
            error?.error?.error ||
            'No se pudo actualizar la orden de compra.'
        });
      })
    );
  }

  getPurchaseOrder(id: number): Observable<{ data: PurchaseOrderResponse | null; error: string }> {
    return this.http.get<ApiResponse<PurchaseOrderResponse>>(`${this.endpoint}/${id}`).pipe(
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
            'No se pudo cargar la orden de compra.'
        })
      )
    );
  }

  changePurchaseOrderStatus(
    id: number,
    payload: PurchaseOrderStatusPayload
  ): Observable<{ data: PurchaseOrderResponse | null; error: string }> {
    return this.http.patch<ApiResponse<PurchaseOrderResponse>>(`${this.endpoint}/${id}/status`, payload).pipe(
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
            'No se pudo actualizar el estado de la orden.'
        })
      )
    );
  }

  sendPurchaseOrderEmail(
    id: number,
    request: PurchaseOrderEmailRequest
  ): Observable<{ data: PurchaseOrderEmailResponse | null; error: string }> {
    return this.http.post<ApiResponse<PurchaseOrderEmailResponse>>(`${this.endpoint}/${id}/send-email`, request).pipe(
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
            'No se pudo enviar el correo de la orden de compra.'
        })
      )
    );
  }

  listPurchaseOrdersPage(
    filter: PurchaseOrderFilter,
    page = 0,
    size = 50
  ): Observable<{ data: PageResponse<PurchaseOrderSummary> | null; error: string }> {
    return this.http
      .get<ApiResponse<PageResponse<PurchaseOrderSummary>>>(this.endpoint, {
        params: this.buildParams(filter, page, size)
      })
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
              'No se pudieron cargar las órdenes de compra.'
          })
        )
      );
  }

  listAllPurchaseOrdersByStatus(
    status: PurchaseOrderStatus
  ): Observable<{ data: PurchaseOrderSummary[]; error: string }> {
    return this.fetchAllPages({ status }).pipe(
      map((data) => ({
        data,
        error: ''
      })),
      catchError((error) =>
        of({
          data: [],
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudieron cargar las órdenes de compra.'
        })
      )
    );
  }

  listAllPurchaseOrders(): Observable<{ data: PurchaseOrderSummary[]; error: string }> {
    return this.fetchAllPages({}).pipe(
      map((data) => ({
        data,
        error: ''
      })),
      catchError((error) =>
        of({
          data: [],
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudieron cargar las órdenes de compra.'
        })
      )
    );
  }

  listAllPurchaseOrdersByStatuses(
    statuses: PurchaseOrderStatus[]
  ): Observable<{ data: PurchaseOrderSummary[]; error: string }> {
    return forkJoin(statuses.map((status) => this.fetchAllPages({ status }))).pipe(
      map((groups) => ({
        data: groups
          .flat()
          .sort((left, right) => new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime()),
        error: ''
      })),
      catchError((error) =>
        of({
          data: [],
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudieron cargar las órdenes de compra.'
        })
      )
    );
  }

  private fetchAllPages(filter: PurchaseOrderFilter): Observable<PurchaseOrderSummary[]> {
    return this.http
      .get<ApiResponse<PageResponse<PurchaseOrderSummary>>>(this.endpoint, {
        params: this.buildParams(filter, 0, 50)
      })
      .pipe(
        map((response) => response.data),
        expand((page) =>
          page && page.number + 1 < page.totalPages
            ? this.http
                .get<ApiResponse<PageResponse<PurchaseOrderSummary>>>(this.endpoint, {
                  params: this.buildParams(filter, page.number + 1, page.size || 50)
                })
                .pipe(map((response) => response.data))
            : EMPTY
        ),
        reduce((all, page) => [...all, ...(page?.content ?? [])], [] as PurchaseOrderSummary[])
      );
  }

  private buildParams(filter: PurchaseOrderFilter, page: number, size: number): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'orderDate,DESC');

    if (filter.status) {
      params = params.set('status', filter.status);
    }

    if (filter.supplierId) {
      params = params.set('supplierId', filter.supplierId);
    }

    if (filter.fechaDesde) {
      params = params.set('fechaDesde', filter.fechaDesde);
    }

    if (filter.fechaHasta) {
      params = params.set('fechaHasta', filter.fechaHasta);
    }

    if (filter.sede) {
      params = params.set('sede', filter.sede);
    }

    if (filter.area) {
      params = params.set('area', filter.area);
    }

    return params;
  }
}
