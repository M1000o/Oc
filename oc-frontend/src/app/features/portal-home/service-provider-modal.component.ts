import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

type ServiceId = number;

interface ApiResponse<T> {
  message: string;
  data: T;
}

interface ServiceResponse {
  id: number;
  nombre: string;
}

interface SupplierResponse {
  id: number;
  razon_social: string;
  ruc: string;
}

interface ServiceOption {
  id: ServiceId;
  label: string;
  icon: string;
}

interface ProviderOption {
  id: number;
  name: string;
  ruc: string;
  icon: string;
}

export interface ProviderSelection {
  serviceId: ServiceId;
  serviceName: string;
  providerId: number;
  providerName: string;
}

@Component({
  selector: 'app-service-provider-modal',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './service-provider-modal.component.html',
  styleUrl: './service-provider-modal.component.css'
})
export class ServiceProviderModalComponent implements OnInit {
  private readonly http = inject(HttpClient);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() providerSelected = new EventEmitter<ProviderSelection>();

  protected searchTerm = '';
  protected selectedServiceId: ServiceId | null = null;
  protected servicesLoading = true;
  protected servicesLoadError = '';
  protected providersLoading = false;
  protected providersLoadError = '';

  protected services: ServiceOption[] = [];
  protected providers: ProviderOption[] = [];

  ngOnInit(): void {
    this.loadServices();
  }

  protected get selectedServiceName(): string {
    if (this.selectedServiceId === null) {
      return '';
    }

    return this.services.find((service) => service.id === this.selectedServiceId)?.label ?? '';
  }

  protected get filteredProviders(): ProviderOption[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    return this.providers.filter((provider) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        provider.name.toLowerCase().includes(normalizedSearch) ||
        provider.ruc.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.close();
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected selectService(serviceId: ServiceId): void {
    this.selectedServiceId = serviceId;
    this.searchTerm = '';
    this.loadProviders(serviceId);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected selectProvider(provider: ProviderOption): void {
    if (this.selectedServiceId === null) {
      return;
    }

    this.providerSelected.emit({
      serviceId: this.selectedServiceId,
      serviceName: this.selectedServiceName,
      providerId: provider.id,
      providerName: provider.name
    });
  }

  private loadServices(): void {
    this.servicesLoading = true;
    this.servicesLoadError = '';

    this.http
      .get<ApiResponse<ServiceResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.services}`
      )
      .subscribe({
        next: (response) => {
          const services = (response.data ?? []).map((service) => ({
            id: service.id,
            label: service.nombre,
            icon: this.resolveServiceIcon(service.nombre)
          }));

          this.services = services;

          if (!services.length) {
            this.selectedServiceId = null;
            this.providers = [];
            return;
          }

          const selectedStillExists = services.some((service) => service.id === this.selectedServiceId);
          if (!selectedStillExists) {
            this.selectedServiceId = services[0].id;
          }

          if (this.selectedServiceId !== null) {
            this.loadProviders(this.selectedServiceId);
          }
        },
        error: () => {
          this.services = [];
          this.providers = [];
          this.selectedServiceId = null;
          this.servicesLoadError =
            'No se pudieron cargar los servicios. Verifica que el backend este disponible.';
          this.servicesLoading = false;
        },
        complete: () => {
          this.servicesLoading = false;
        }
      });
  }

  private loadProviders(serviceId: ServiceId): void {
    this.providersLoading = true;
    this.providersLoadError = '';
    this.providers = [];

    this.http
      .get<ApiResponse<SupplierResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.services}/${serviceId}/suppliers`
      )
      .subscribe({
        next: (response) => {
          this.providers = (response.data ?? []).map((provider) => ({
            id: provider.id,
            name: provider.razon_social,
            ruc: provider.ruc,
            icon: 'store'
          }));
        },
        error: () => {
          this.providers = [];
          this.providersLoadError =
            'No se pudieron cargar los proveedores para este servicio.';
          this.providersLoading = false;
        },
        complete: () => {
          this.providersLoading = false;
        }
      });
  }

  private resolveServiceIcon(serviceName: string): string {
    const normalized = serviceName.trim().toLowerCase();

    if (normalized.includes('carne')) {
      return 'set_meal';
    }

    if (normalized.includes('papa')) {
      return 'agriculture';
    }

    if (normalized.includes('abarrote')) {
      return 'storefront';
    }

    if (normalized.includes('licor')) {
      return 'wine_bar';
    }

    if (normalized.includes('crema')) {
      return 'water_drop';
    }

    if (normalized.includes('limpieza')) {
      return 'cleaning_services';
    }

    return 'category';
  }
}
