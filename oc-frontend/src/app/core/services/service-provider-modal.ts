import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { ServiceId, ServiceOption, ServiceResponse } from '../interfaces/services.interface';
import { ProviderOption } from '../interfaces/provider-option.interface';
import { SupplierResponse } from '../interfaces/supplier.interface';

@Injectable({
  providedIn: 'root',
})
export class ServiceProviderModal {
  
  private readonly http  = inject(HttpClient);

  getServices(): Observable<{ data: ServiceOption[]; error: string}> {
    return this.http
        .get<ApiResponse<ServiceResponse[]>>(
          `${environment.api.baseUrl}${environment.api.endpoints.services}`
        )
        .pipe(
          map(response => ({
            data: (response.data ?? []).map(service => ({
              id: service.id,
              label: service.nombre,
              icon: this.resolveServiceIcon(service.nombre)
            })),
            error: '' 
          })),
          catchError(() => of({
            data: [],
            error: 'No se puede cargar los servicios. Verifica que el backend este disponible.'
          }))
        );
  }

  getProviders(serviceId: ServiceId): Observable<{ data: ProviderOption[]; error: string}> {
    return this.http
      .get<ApiResponse<SupplierResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.services}/${serviceId}/suppliers`
      )
      .pipe(
        map(response => ({
          data: (response.data ?? []).map(provider => ({
            id: provider.id,
            name: provider.razon_social,
            ruc: provider.ruc,
            icon: 'store'
          })),
          error: ''
        })),
        catchError(() => of({
          data: [],
          error: 'No se puede cargar los proveedores para este servicio.'
        }))
      );
  }

  private resolveServiceIcon(serviceName: string): string {
    const normalized = serviceName.trim().toLowerCase();
 
    if (normalized.includes('carne'))    return 'set_meal';
    if (normalized.includes('papa'))     return 'agriculture';
    if (normalized.includes('abarrote')) return 'storefront';
    if (normalized.includes('licor'))    return 'wine_bar';
    if (normalized.includes('crema'))    return 'water_drop';
    if (normalized.includes('limpieza')) return 'cleaning_services';
 
    return 'category';
  }
}
