import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ProductRequest } from '../interfaces/product-request.interface';
import { ProductResponse } from '../interfaces/product-response.interface';
import { ServiceId, ServiceResponse } from '../interfaces/services.interface';
import { SupplierResponse } from '../interfaces/supplier.interface';
import { UnitResponse } from '../interfaces/unit.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api.baseUrl;
  private readonly productsEndpoint = environment.api.endpoints.products;
  private readonly servicesEndpoint = environment.api.endpoints.services;
  private readonly suppliersEndpoint = environment.api.endpoints.suppliers;
  private readonly unitsEndpoint = environment.api.endpoints.units;

  listAllProducts(): Observable<ApiResponse<ProductResponse[]>> {
    return this.http.get<ApiResponse<ProductResponse[]>>(
      `${this.baseUrl}${this.productsEndpoint}`
    );
  }

  listServices(): Observable<ApiResponse<ServiceResponse[]>> {
    return this.http.get<ApiResponse<ServiceResponse[]>>(
      `${this.baseUrl}${this.servicesEndpoint}`
    );
  }

  listSuppliers(): Observable<ApiResponse<SupplierResponse[]>> {
    return this.http.get<ApiResponse<SupplierResponse[]>>(
      `${this.baseUrl}${this.suppliersEndpoint}`
    );
  }

  listUnits(): Observable<ApiResponse<UnitResponse[]>> {
    return this.http.get<ApiResponse<UnitResponse[]>>(
      `${this.baseUrl}${this.unitsEndpoint}`
    );
  }

  listServicesBySupplier(supplierId: number): Observable<ApiResponse<ServiceResponse[]>> {
    return this.http.get<ApiResponse<ServiceResponse[]>>(
      `${this.baseUrl}${this.suppliersEndpoint}/${supplierId}/servicios`
    );
  }

  listProductsBySupplier(supplierId: number): Observable<ApiResponse<ProductResponse[]>> {
    return this.http.get<ApiResponse<ProductResponse[]>>(
      `${this.baseUrl}${this.productsEndpoint}/by-supplier/${supplierId}`
    );
  }

  createProduct(payload: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.post<ApiResponse<ProductResponse>>(
      `${this.baseUrl}${this.productsEndpoint}`,
      payload
    );
  }

  updateProduct(id: number, payload: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.put<ApiResponse<ProductResponse>>(
      `${this.baseUrl}${this.productsEndpoint}/${id}`,
      payload
    );
  }

  deleteProduct(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.baseUrl}${this.productsEndpoint}/${id}`
    );
  }

  getProductsByServiceAndSupplier(
    serviceId: ServiceId,
    supplierId: number
  ): Observable<{ data: ProductResponse[]; error: string }> {
    return this.http
      .get<ApiResponse<ProductResponse[]>>(
        `${this.baseUrl}${this.productsEndpoint}/by-service/${serviceId}/by-supplier/${supplierId}`
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
