import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { UnitRequest, UnitResponse } from '../interfaces/unidad-medida.interface';

@Injectable({
  providedIn: 'root'
})
export class UnidadMedidaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api.baseUrl;
  private readonly endpoint = environment.api.endpoints.units; // Usando el endpoint correcto

  listAll(): Observable<ApiResponse<UnitResponse[]>> {
    return this.http.get<ApiResponse<UnitResponse[]>>(
      `${this.baseUrl}${this.endpoint}`
    );
  }

  getById(id: number): Observable<ApiResponse<UnitResponse>> {
    return this.http.get<ApiResponse<UnitResponse>>(
      `${this.baseUrl}${this.endpoint}/${id}`
    );
  }

  create(payload: UnitRequest): Observable<ApiResponse<UnitResponse>> {
    return this.http.post<ApiResponse<UnitResponse>>(
      `${this.baseUrl}${this.endpoint}`,
      payload
    );
  }

  update(id: number, payload: UnitRequest): Observable<ApiResponse<UnitResponse>> {
    return this.http.put<ApiResponse<UnitResponse>>(
      `${this.baseUrl}${this.endpoint}/${id}`,
      payload
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.baseUrl}${this.endpoint}/${id}`
    );
  }
}
