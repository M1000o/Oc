import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnInit, Output, inject, signal, computed, DestroyRef, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { switchMap, filter } from 'rxjs';
import { ServiceOption, ServiceId } from '../../core/interfaces/services.interface';
import { ProviderOption, ProviderSelection } from '../../core/interfaces/provider-option.interface';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ServiceProviderModal } from '../../core/services/service-provider-modal.service';
@Component({
  selector: 'app-service-provider-modal',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './service-provider-modal.component.html',
  styleUrl: './service-provider-modal.component.css'
})
export class ServiceProviderModalComponent implements OnInit {

  private readonly svc = inject(ServiceProviderModal);
  private readonly destroyRef = inject(DestroyRef);

  readonly lockedProviderSelection = input<ProviderSelection | null>(null);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() providerSelected = new EventEmitter<ProviderSelection>();

  searchTerm = signal('');
  serviceSearchTerm = signal('');
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


  selectedServiceName = computed(() =>
    this.services().find(s => s.id === this.selectedServiceId())?.label ?? ''
  );

  lockedProvider = computed(() => {
    const selection = this.lockedProviderSelection();

    if (!selection) {
      return null;
    }

    return {
      id: selection.providerId,
      name: selection.providerName,
      ruc: selection.providerRuc,
      icon: 'store'
    } satisfies ProviderOption;
  });

  lockedProviderAvailableForSelectedService = computed(() => {
    const lockedProviderId = this.lockedProviderSelection()?.providerId ?? null;

    if (lockedProviderId === null) {
      return false;
    }

    return this.providers().some((provider) => provider.id === lockedProviderId);
  });

  filteredProviders  = computed(() => {
    const search = this.searchTerm().toLocaleLowerCase().trim();

    return this.providers().filter(provider => {
      return (
        !search ||
        provider.name.toLocaleLowerCase().includes(search) ||
        provider.ruc.toLocaleLowerCase().includes(search)
      );
    });
  });

  filteredServices = computed(() => {
    const search = this.serviceSearchTerm().toLocaleLowerCase().trim();

    return this.services().filter((service) => {
      return !search || service.label.toLocaleLowerCase().includes(search);
    });
  });


  constructor(){
    toObservable(this.selectedServiceId)
    .pipe(
      filter((id): id is ServiceId => id !== null),
      switchMap(id => {
        this.setProvidersLoading(true);
        this.providersLoadError.set('');
        return this.svc.getProviders(id);
      }),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(({ data, error }) => {
        this.providers.set(data);
        this.providersLoadError.set(error);
        this.setProvidersLoading(false);
    });
  }


  ngOnInit(): void {
    this.setServicesLoading(true);


    this.svc.getServices().subscribe(({ data, error }) => {
      this.services.set(data);
      this.servicesLoadError.set(error);

      if (data.length) {
        const lockedServiceId = this.lockedProviderSelection()?.serviceId ?? null;
        const defaultServiceId = lockedServiceId && data.some((service) => service.id === lockedServiceId)
          ? lockedServiceId
          : data[0].id;

        this.selectedServiceId.set(defaultServiceId);
      }

      this.setServicesLoading(false);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void { 
    this.close(); 
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected selectService(serviceId: ServiceId): void{
    this.searchTerm.set('');
    this.selectedServiceId.set(serviceId);
  }

  protected selectProvider(provider: ProviderOption): void {
    const serviceId = this.selectedServiceId();

    if(serviceId === null) return;

    const lockedSelection = this.lockedProviderSelection();
    const resolvedProvider = lockedSelection
      ? {
          id: lockedSelection.providerId,
          name: lockedSelection.providerName,
          ruc: lockedSelection.providerRuc
        }
      : provider;

    this.providerSelected.emit({
      serviceId,
      serviceName: this.selectedServiceName(),
      providerId: resolvedProvider.id,
      providerName: resolvedProvider.name,
      providerRuc: resolvedProvider.ruc,
      selectedServiceIds: lockedSelection?.selectedServiceIds,
      selectedServiceNames: lockedSelection?.selectedServiceNames
    });
  }

  private setServicesLoading(value: boolean): void {
    this.servicesLoading.set(value);
 
    if (this.servicesLoadingTimer) clearTimeout(this.servicesLoadingTimer);
 
    if (value) {
      this.servicesLoadingTimer = setTimeout(() => {
        if (this.servicesLoading()) this.servicesLoadingDelayed.set(true);
      }, 150);
    } else {
      this.servicesLoadingDelayed.set(false);
    }
  }

  private setProvidersLoading(value: boolean): void {
    this.providersLoading.set(value);
 
    if (this.providersLoadingTimer) clearTimeout(this.providersLoadingTimer);
 
    if (value) {
      this.providersLoadingTimer = setTimeout(() => {
        if (this.providersLoading()) this.providersLoadingDelayed.set(true);
      }, 150);
    } else {
      this.providersLoadingDelayed.set(false);
    }
  }
}
