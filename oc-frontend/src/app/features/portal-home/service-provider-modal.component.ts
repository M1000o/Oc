import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, OnInit, Output, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { switchMap, tap, catchError, of, filter } from 'rxjs';
import { ApiResponse } from '../../core/interfaces/api-response.interface';
import { ServiceResponse, ServiceOption, ServiceId } from '../../core/interfaces/services.interface';
import { SupplierResponse } from '../../core/interfaces/supplier.interface';
import { ProviderOption, ProviderSelection } from '../../core/interfaces/provider-option.interface';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-service-provider-modal',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './service-provider-modal.component.html',
  styleUrl: './service-provider-modal.component.css'
})
export class ServiceProviderModalComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() providerSelected = new EventEmitter<ProviderSelection>();

  //Signals
  searchTerm = signal('');
  selectedServiceId = signal<ServiceId | null >(null);

  services = signal<ServiceOption[]>([]);
  providers = signal<ProviderOption[]>([]);

  servicesLoading = signal(true);
  providersLoading = signal(false);

  servicesLoadingDelayed = signal(false);
  providersLoadingDelayed = signal(false);

  servicesLoadError = signal('');
  providersLoadError = signal('');

  private servicesLoadingTimer: ReturnType<typeof setTimeout> | null = null;
  private providersLoadingTimer: ReturnType<typeof setTimeout> | null = null;


  //Computed 
  selectedServiceName = computed(() => {
    const id = this.selectedServiceId();
    return this.services().find(s => s.id === id)?.label ?? '';
  });

  filteredProviders  = computed(() => {
    const search = this.searchTerm().toLocaleLowerCase().trim();

    return this.providers().filter(provider => {
      if(!search) return true;

      return (
        provider.name.toLocaleLowerCase().includes(search) || 
        provider.ruc.toLocaleLowerCase().includes(search)
      );
    });
  });


  constructor(){
    toObservable(this.selectedServiceId)
    .pipe(
      filter(id => id !== null),
      switchMap(id => {
        this.setProvidersLoading(true);
        this.providersLoadError.set('');

        return this.http.get<ApiResponse<SupplierResponse[]>>(
          `${environment.api.baseUrl}${environment.api.endpoints.services}/${id}/suppliers`
        ).pipe(
          catchError(() => {
            this.providersLoadError.set('No se pudo cargar los proveedores.');
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(response => {
      if(response){
        const providers = (response.data ?? []).map(p => ({
          id: p.id,
          name: p.razon_social,
          ruc: p.ruc,
          icon: 'store'
        }));
        this.providers.set(providers);
      } else {
        this.providers.set([]);
      }
      this.setProvidersLoading(false);
    });
  }


  ngOnInit(): void {
    this.loadServices();
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.close();
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected selectService(serviceId: ServiceId): void{
    this.searchTerm.set('');
    this.selectedServiceId.set(serviceId);
  }

  protected selectProvider(provider: ProviderOption): void {
    const serviceId = this.selectedServiceId();

    if(serviceId === null) return;

    this.providerSelected.emit({
      serviceId,
      serviceName: this.selectedServiceName(),
      providerId: provider.id,
      providerName: provider.name
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private setServicesLoading(value: boolean): void {
    this.servicesLoading.set(value);
 
    if (this.servicesLoadingTimer) {
      clearTimeout(this.servicesLoadingTimer);
      this.servicesLoadingTimer = null;
    }
 
    if (value) {
      this.servicesLoadingTimer = setTimeout(() => {
        if (this.servicesLoading()) {
          this.servicesLoadingDelayed.set(true);
        }
      }, 150);
    } else {
      this.servicesLoadingDelayed.set(false);
    }
  }

  private setProvidersLoading(value: boolean): void {
    this.providersLoading.set(value);
 
    if (this.providersLoadingTimer) {
      clearTimeout(this.providersLoadingTimer);
      this.providersLoadingTimer = null;
    }
 
    if (value) {
      this.providersLoadingTimer = setTimeout(() => {
        if (this.providersLoading()) {
          this.providersLoadingDelayed.set(true);
        }
      }, 150);
    } else {
      this.providersLoadingDelayed.set(false);
    }
  }



  //Load Services

  private loadServices(): void {
    this.setServicesLoading(true);
    this.servicesLoadError.set('');

    this.http
      .get<ApiResponse<ServiceResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.services}`
      )
      .pipe(
        tap(response => {
          const services = (response.data ?? []).map(service => ({
            id: service.id,
            label: service.nombre,
            icon: this.resolveServiceIcon(service.nombre)
          }));

          this.services.set(services);

          if(services.length){
            this.selectedServiceId.set(services[0].id);
          }
        }),
        catchError(() => {
          this.services.set([]);
          this.servicesLoadError.set(
            'No se pudieron cargar los servicios. Verifica que el backend este disponible.'
          );
          return of(null);
        }),
        tap(() => this.setServicesLoading(false))
      )
      .subscribe();
  }

  private resolveServiceIcon(serviceName: string): string {
    const normalized = serviceName.trim().toLowerCase();

    if (normalized.includes('carne')) return 'set_meal';
    if (normalized.includes('papa')) return 'agriculture';
    if (normalized.includes('abarrote')) return 'storefront';
    if (normalized.includes('licor')) return 'wine_bar';
    if (normalized.includes('crema')) return 'water_drop';
    if (normalized.includes('limpieza')) return 'cleaning_services';

    return 'category';
  }
}
