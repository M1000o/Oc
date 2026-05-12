import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AreaOption, SedeOption } from '../interfaces/location.interface';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly sedesEndpoint = `${environment.api.baseUrl}${environment.api.endpoints.sedes}`;
  private readonly areasEndpoint = `${environment.api.baseUrl}${environment.api.endpoints.areas}`;

  getSedes(): Observable<{ data: SedeOption[]; error: string }> {
    return this.http.get<ApiResponse<SedeOption[]>>(this.sedesEndpoint).pipe(
      map((response) => ({
        data: response.data ?? [],
        error: ''
      })),
      catchError((error) =>
        of({
          data: [],
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudieron cargar las sedes.'
        })
      )
    );
  }

  getAreasBySede(sedeId: number): Observable<{ data: AreaOption[]; error: string }> {
    return this.http
      .get<ApiResponse<AreaOption[]>>(this.areasEndpoint, {
        params: new HttpParams().set('sedeId', sedeId)
      })
      .pipe(
        map((response) => ({
          data: response.data ?? [],
          error: ''
        })),
        catchError((error) =>
          of({
            data: [],
            error:
              error?.error?.message ||
              error?.error?.error ||
              'No se pudieron cargar las áreas.'
          })
        )
      );
  }
}
