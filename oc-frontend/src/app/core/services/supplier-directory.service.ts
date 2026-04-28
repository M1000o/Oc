import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import {
  SupplierDirectoryDetail,
  SupplierDirectoryItem,
} from '../interfaces/supplier-directory.interface';

@Injectable({
  providedIn: 'root',
})
export class SupplierDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api.baseUrl;
  private readonly suppliersEndpoint = environment.api.endpoints.suppliers;

  listDirectory(): Observable<ApiResponse<SupplierDirectoryItem[]>> {
    return this.http.get<ApiResponse<SupplierDirectoryItem[]>>(
      `${this.baseUrl}${this.suppliersEndpoint}/directory`,
    );
  }

  getSupplierDetail(id: number): Observable<ApiResponse<SupplierDirectoryDetail>> {
    return this.http.get<ApiResponse<SupplierDirectoryDetail>>(
      `${this.baseUrl}${this.suppliersEndpoint}/${id}`,
    );
  }
}
