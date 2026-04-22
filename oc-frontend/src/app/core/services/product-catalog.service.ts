import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ProductResponse } from '../interfaces/product-response.interface';
import { ServiceId } from '../interfaces/services.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductCatalogService {
  private readonly http = inject(HttpClient);

  getProductsByServiceAndSupplier(
    serviceId: ServiceId,
    supplierId: number
  ): Observable<{ data: ProductResponse[]; error: string }> {
    return this.http
      .get<ApiResponse<ProductResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.products}/by-service/${serviceId}/by-supplier/${supplierId}`
      )
      .pipe(
        map((response) => ({
          data: response.data ?? [],
          error: ''
        })),
        catchError(() =>
          of({
            data: [],
            error: 'No se pueden cargar los productos para este servicio y proveedor.'
          })
        )
      );
  }
}
