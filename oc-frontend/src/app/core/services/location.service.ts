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

  createSede(sede: Partial<SedeOption>): Observable<{ data: SedeOption | null; error: string }> {
    return this.http.post<ApiResponse<SedeOption>>(this.sedesEndpoint, sede).pipe(
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
            'No se pudo crear la sede.'
        })
      )
    );
  }

  updateSede(id: number, sede: Partial<SedeOption>): Observable<{ data: SedeOption | null; error: string }> {
    return this.http.put<ApiResponse<SedeOption>>(`${this.sedesEndpoint}/${id}`, sede).pipe(
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
            'No se pudo actualizar la sede.'
        })
      )
    );
  }

  deleteSede(id: number): Observable<{ success: boolean; error: string }> {
    return this.http.delete<ApiResponse<void>>(`${this.sedesEndpoint}/${id}`).pipe(
      map(() => ({
        success: true,
        error: ''
      })),
      catchError((error) =>
        of({
          success: false,
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudo eliminar la sede.'
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

  createArea(area: Partial<AreaOption>): Observable<{ data: AreaOption | null; error: string }> {
    return this.http.post<ApiResponse<AreaOption>>(this.areasEndpoint, area).pipe(
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
            'No se pudo crear el área.'
        })
      )
    );
  }

  updateArea(id: number, area: Partial<AreaOption>): Observable<{ data: AreaOption | null; error: string }> {
    return this.http.put<ApiResponse<AreaOption>>(`${this.areasEndpoint}/${id}`, area).pipe(
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
            'No se pudo actualizar el área.'
        })
      )
    );
  }

  deleteArea(id: number): Observable<{ success: boolean; error: string }> {
    return this.http.delete<ApiResponse<void>>(`${this.areasEndpoint}/${id}`).pipe(
      map(() => ({
        success: true,
        error: ''
      })),
      catchError((error) =>
        of({
          success: false,
          error:
            error?.error?.message ||
            error?.error?.error ||
            'No se pudo eliminar el área.'
        })
      )
    );
  }
}
