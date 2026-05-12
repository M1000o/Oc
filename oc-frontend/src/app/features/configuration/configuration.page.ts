import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseOrderCompanyConfiguration } from '../../core/interfaces/configuration.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ConfigurationService } from '../../core/services/configuration.service';

@Component({
  selector: 'app-configuration-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './configuration.page.html',
  styleUrl: './configuration.page.css'
})
export class ConfigurationPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly configurationService = inject(ConfigurationService);
  private readonly notificationService = inject(AppNotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(180)]],
    companyRuc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    companyAddress: ['', [Validators.required, Validators.maxLength(280)]]
  });

  protected loading = true;
  protected saving = false;
  protected errorMessage = '';
  protected lastSavedConfiguration: PurchaseOrderCompanyConfiguration | null = null;

  ngOnInit(): void {
    this.loadConfiguration();
  }

  protected loadConfiguration(): void {
    this.loading = true;
    this.errorMessage = '';

    this.configurationService.getPurchaseOrderCompanyConfiguration().subscribe((result) => {
      this.loading = false;

      if (result.error || !result.data) {
        if (result.error) {
          this.errorMessage = result.error;
        }
        this.lastSavedConfiguration = null;
        this.form.reset({
          companyName: '',
          companyRuc: '',
          companyAddress: ''
        });
        return;
      }

      this.lastSavedConfiguration = result.data;
      this.form.reset(result.data);
    });
  }

  protected saveConfiguration(): void {
    this.errorMessage = '';
    this.notificationService.dismiss();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revisa los campos marcados antes de guardar.';
      return;
    }

    this.saving = true;
    const payload = this.normalizePayload(this.form.getRawValue());

    this.configurationService.updatePurchaseOrderCompanyConfiguration(payload).subscribe((result) => {
      this.saving = false;

      if (result.error || !result.data) {
        this.errorMessage = result.error || 'No se pudo guardar la configuración.';
        return;
      }

      this.lastSavedConfiguration = result.data;
      this.form.reset(result.data);
      this.notificationService.success(
        'Configuración guardada. Los próximos PDFs usarán estos datos.',
        3200
      );
    });
  }

  protected resetForm(): void {
    if (this.lastSavedConfiguration) {
      this.form.reset(this.lastSavedConfiguration);
      this.errorMessage = '';
      this.notificationService.dismiss();
    }
  }

  protected hasFieldError(field: keyof PurchaseOrderCompanyConfiguration): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  protected getFieldError(field: keyof PurchaseOrderCompanyConfiguration): string {
    const control = this.form.controls[field];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('pattern')) {
      return 'El RUC debe tener 11 dígitos.';
    }

    if (control.hasError('maxlength')) {
      return 'El texto supera el máximo permitido.';
    }

    return '';
  }

  private normalizePayload(
    value: PurchaseOrderCompanyConfiguration
  ): PurchaseOrderCompanyConfiguration {
    return {
      companyName: value.companyName.trim().replace(/\s+/g, ' '),
      companyRuc: value.companyRuc.trim(),
      companyAddress: value.companyAddress.trim().replace(/\s+/g, ' ')
    };
  }
}
