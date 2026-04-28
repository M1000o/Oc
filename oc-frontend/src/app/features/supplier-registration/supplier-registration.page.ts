import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ApiResponse } from '../../core/interfaces/api-response.interface';
import { ServiceResponse } from '../../core/interfaces/services.interface';
import { BankResponse } from '../../core/interfaces/bank-response.interface';
import { SupplierFormPayload } from '../../core/interfaces/supplier.interface';
import { AccountType } from '../../core/interfaces/account-type.type';
import { OnlyNumbers } from '../../directives/only-numbers.directive';
import { OnlyLetters } from '../../directives/only-letters.directive';
import { AppToastHostComponent } from '../../shared/components/app-toast-host/app-toast-host.component';

@Component({
  selector: 'app-supplier-registration-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, OnlyNumbers, OnlyLetters, AppToastHostComponent],
  templateUrl: './supplier-registration.page.html',
  styleUrl: './supplier-registration.page.css'
})
export class SupplierRegistrationPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly notificationService = inject(AppNotificationService);
  private statusTimerId: number | null = null;

  private static readonly SUCCESS_FEEDBACK_MS = 2200;
  private static readonly ERROR_FEEDBACK_MS = 4500;

  protected readonly serviceQuery = signal('');
  protected readonly services = signal<ServiceResponse[]>([]);
  protected readonly banks = signal<BankResponse[]>([]);
  protected readonly loadingCatalogs = signal(true);
  protected readonly loadingError = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly submitAttempted = signal(false);

  protected readonly accountTypeOptions: Array<{ value: AccountType; label: string }> = [
    { value: 'CUENTA_AHORRO', label: 'Ahorros' },
    { value: 'CUENTA_CORRIENTE', label: 'Corriente' }
  ];

  protected readonly creditDayOptions = [
    { value: 7, label: '7' },
    { value: 15, label: '15' },
    { value: 21, label: '21' },
    { value: 30, label: '30' },
    { value: 45, label: '45' },
    { value: 60, label: '60' }
  ];

  private readonly bankRules: any = {
    1: {
      cuenta: [20],
      cci: [20]
    },
    2: {
      cuenta: [12,13],
      cci: [20]
    },
    3: { 
      cuenta: [13],
      cci: [20]
    },
    4: { 
      cuenta: [13, 14],
      cci: [20]
    }
  }


  protected readonly form = this.fb.group({
    ruc: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{11}$/)]),
    razon_social: this.fb.nonNullable.control('', [Validators.required]),
    services: this.fb.nonNullable.control<number[]>([], [Validators.minLength(1)]),
    nombre_contacto: this.fb.nonNullable.control('', [Validators.required]),
    apellido_p_contacto: this.fb.nonNullable.control('', [Validators.required]),
    apellido_m_contacto: this.fb.nonNullable.control(''),
    telefono_contacto: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{9}$/)
    ]),
    correo_pedidos: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    bank: this.fb.control<number | null>(null),
    accountType: this.fb.nonNullable.control<AccountType>('CUENTA_AHORRO', [Validators.required]),
    accountNumber_Soles: this.fb.nonNullable.control({ value: '', disabled: true }, [Validators.required]),
    cci_soles: this.fb.nonNullable.control({ value: '', disabled: true }),
    accountNumber_Dolares: this.fb.nonNullable.control({ value: '', disabled: true }),
    cci_dolares: this.fb.nonNullable.control({ value: '', disabled: true }),
    is_detraccion: this.fb.nonNullable.control(false),
    accountNumber_Detraccion: this.fb.nonNullable.control(''),
    correo_constancia: this.fb.nonNullable.control('', [Validators.email]),
    creditDays: this.fb.nonNullable.control(7, [Validators.required])
  });

  protected readonly filteredServices = computed(() => {
    const query = this.serviceQuery().trim().toLowerCase();
    const services = this.services();

    if (!query) {
      return services;
    }

    return services.filter((service) => service.nombre.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearStatusTimer());

    this.loadCatalogs();

    this.form.controls.is_detraccion.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isDetraccion) => this.toggleDetraccionValidators(isDetraccion));

    this.form.controls.accountNumber_Soles.addValidators(
      this.validarCuentaPorBanco('cuenta')
    );
      
    this.form.controls.cci_soles.addValidators(
      this.validarCuentaPorBanco('cci')
    );
      
    this.form.controls.accountNumber_Dolares.addValidators(
      this.validarCuentaPorBanco('cuenta')
    );
      
    this.form.controls.cci_dolares.addValidators(
      this.validarCuentaPorBanco('cci')
    );

    this.form.controls.bank.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bankId) => {

         const fields = [
          'accountNumber_Soles',
          'cci_soles',
          'accountNumber_Dolares',
          'cci_dolares'
        ];

        fields.forEach(field => {
          const control = this.form.get(field);

          if (!control) return;

          control.setValue('', { emitEvent: false });

          if (bankId) {
            control.enable({ emitEvent: false });
          } else {
            control.disable({ emitEvent: false });
          }

          control.updateValueAndValidity({ emitEvent: false });
        });
      });

    this.toggleDetraccionValidators(this.form.controls.is_detraccion.value);
  }

  protected updateServiceQuery(query: string): void {
    this.serviceQuery.set(query);
  }

  protected isServiceSelected(serviceId: number): boolean {
    return this.form.controls.services.value.includes(serviceId);
  }

  protected toggleService(serviceId: number, checked: boolean): void {
    const current = this.form.controls.services.value;
    const next = checked ? [...current, serviceId] : current.filter((id) => id !== serviceId);

    this.form.controls.services.setValue([...new Set(next)]);
    this.form.controls.services.markAsDirty();
    this.form.controls.services.markAsTouched();
  }

  protected selectCreditDay(days: number): void {
    this.form.controls.creditDays.setValue(days);
    this.form.controls.creditDays.markAsDirty();
    this.form.controls.creditDays.markAsTouched();
  }

  protected resetForm(): void {
    this.form.reset({
      ruc: '',
      razon_social: '',
      services: [],
      nombre_contacto: '',
      apellido_p_contacto: '',
      apellido_m_contacto: '',
      telefono_contacto: '',
      correo_pedidos: '',
      bank: null,
      accountType: 'CUENTA_AHORRO',
      accountNumber_Soles: '',
      cci_soles: '',
      accountNumber_Dolares: '',
      cci_dolares: '',
      is_detraccion: false,
      accountNumber_Detraccion: '',
      correo_constancia: '',
      creditDays: 7
    });
    this.serviceQuery.set('');
    this.submitAttempted.set(false);
    this.notificationService.dismiss();
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.clearStatusTimer();
    this.notificationService.dismiss();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: SupplierFormPayload = {
      ruc: raw.ruc.trim(),
      razon_social: raw.razon_social.trim(),
      services: raw.services,
      nombre_contacto: raw.nombre_contacto.trim(),
      apellido_p_contacto: raw.apellido_p_contacto.trim(),
      apellido_m_contacto: raw.apellido_m_contacto.trim(),
      telefono_contacto: raw.telefono_contacto.trim(),
      correo_pedidos: raw.correo_pedidos.trim(),
      bank: raw.bank,
      accountType: raw.accountType,
      accountNumber_Soles: raw.accountNumber_Soles.trim(),
      cci_soles: raw.cci_soles.trim(),
      accountNumber_Dolares: raw.accountNumber_Dolares.trim(),
      cci_dolares: raw.cci_dolares.trim(),
      is_detraccion: raw.is_detraccion,
      accountNumber_Detraccion: raw.accountNumber_Detraccion.trim(),
      correo_constancia: raw.correo_constancia.trim(),
      creditDays: raw.creditDays
    };

    this.isSubmitting.set(true);
    this.http
      .post<{ message: string; userId: number }>(
        `${environment.api.baseUrl}${environment.api.endpoints.supplierForm}`,
        payload
      )
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.resetForm();
          this.showSuccessAndRedirect(
            response.message ?? 'Registro recibido. Revise su correo para activar la cuenta.'
          );
        },
        error: (error) => {
          const fallback =
            'No se pudo enviar el registro. Si el backend mantiene este endpoint protegido, primero inicia sesion.';
          const message =
            error?.error?.message ||
            error?.error?.error ||
            (typeof error?.error === 'string' ? error.error : '') ||
            fallback;

          this.showError(message);
        }
      });
  }

  protected hasError(
    controlName: keyof typeof this.form.controls,
    errorCode?: string
  ): boolean {
    const control = this.form.controls[controlName];
    const shouldShow = control.touched || this.submitAttempted();

    if (!shouldShow) {
      return false;
    }

    return errorCode ? !!control.errors?.[errorCode] : control.invalid;
  }

  protected controlError(
    controlName: keyof typeof this.form.controls,
    label: string,
    customMessages: Partial<Record<string, string>> = {}
  ): string {
    const control = this.form.controls[controlName];
    const errors = control.errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return customMessages['required'] ?? `${label} es obligatorio.`;
    }

    if (errors['pattern']) {
      return customMessages['pattern'] ?? `${label} tiene un formato invalido.`;
    }

    if (errors['email']) {
      return customMessages['email'] ?? `${label} no es valido.`;
    }

    if (errors['minlength']) {
      return customMessages['minlength'] ?? `Debe completar ${label}.`;
    }

    if (errors['longitudInvalida']) {
      return 'Número no válido para el banco seleccionado.';
    }
    
    if (errors['soloNumeros']) {
      return 'Solo se permiten números.';
    }

    return `${label} no es valido.`;
  }

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);
    this.loadingError.set('');

    forkJoin({
      services: this.http.get<ApiResponse<ServiceResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.services}`
      ),
      banks: this.http.get<ApiResponse<BankResponse[]>>(
        `${environment.api.baseUrl}${environment.api.endpoints.banks}`
      )
    })
      .pipe(finalize(() => this.loadingCatalogs.set(false)))
      .subscribe({
        next: ({ services, banks }) => {
          this.services.set(services.data ?? []);
          this.banks.set(banks.data ?? []);
        },
        error: () => {
          this.loadingError.set(
            'No se pudieron cargar los servicios o bancos. Segun el backend actual, estos endpoints pueden requerir JWT.'
          );
        }
      });
  }

  private toggleDetraccionValidators(isDetraccion: boolean): void {
    const detraccionControl = this.form.controls.accountNumber_Detraccion;

    if (isDetraccion) {
      detraccionControl.addValidators([Validators.required]);
    } else {
      detraccionControl.removeValidators([Validators.required]);
      detraccionControl.setValue('');
    }

    detraccionControl.updateValueAndValidity({ emitEvent: false });
  }

  private showSuccessAndRedirect(message: string): void {
    this.notificationService.success(message, SupplierRegistrationPage.SUCCESS_FEEDBACK_MS);
    this.statusTimerId = window.setTimeout(() => {
      this.notificationService.dismiss();
      this.router.navigate(['/login']);
    }, SupplierRegistrationPage.SUCCESS_FEEDBACK_MS);
  }

  private showError(message: string): void {
    this.notificationService.error(message, SupplierRegistrationPage.ERROR_FEEDBACK_MS);
    this.statusTimerId = window.setTimeout(() => {
      this.notificationService.dismiss();
    }, SupplierRegistrationPage.ERROR_FEEDBACK_MS);
  }

  private clearStatusTimer(): void {
    if (this.statusTimerId !== null) {
      window.clearTimeout(this.statusTimerId);
      this.statusTimerId = null;
    }
  }

  protected getPlaceholder(tipo: 'cuenta' | 'cci'): string {
    const bankId = this.form.controls.bank.value;
  
    if (!bankId || !this.bankRules[bankId]) {
      return 'Ingrese número';
    }
  
    const longitudes = this.bankRules[bankId][tipo];
  
    return tipo === 'cci'
      ? `CCI (${longitudes[0]} dígitos)`
      : `Cuenta (${longitudes.join(' o ')} dígitos)`;
  }

  private validarCuentaPorBanco = (tipo: 'cuenta' | 'cci') => {
    return (control: any) => {
      const value = (control.value || '').replace(/\D/g, '');
      const bankId = this.form.controls.bank.value;
  
      if (!value) return null;
      if (!/^\d+$/.test(value)) return { soloNumeros: true };
  
      if (!bankId || !this.bankRules[bankId]) return null;
  
      const longitudes = this.bankRules[bankId][tipo];
  
      if (!longitudes.includes(value.length)) {
        return { longitudInvalida: true };
      }
  
      return null;
    };
  }

  getMaxLength(tipo: 'cuenta' | 'cci'): number {
    const bankId = this.form.controls.bank.value;
  
    if (!bankId || !this.bankRules[bankId]) {
      return 20;
    }
  
    return Math.max(...this.bankRules[bankId][tipo]);
  }
}
