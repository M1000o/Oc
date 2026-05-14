import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseOrderCompanyConfiguration } from '../../core/interfaces/configuration.interface';
import { AreaOption, SedeOption } from '../../core/interfaces/location.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ConfigurationService } from '../../core/services/configuration.service';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-configuration-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './configuration.page.html',
  styleUrl: './configuration.page.css'
})
export class ConfigurationPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly configurationService = inject(ConfigurationService);
  private readonly locationService = inject(LocationService);
  private readonly notificationService = inject(AppNotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(180)]],
    companyRuc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    companyAddress: ['', [Validators.required, Validators.maxLength(280)]]
  });

  protected readonly sedeForm = this.formBuilder.nonNullable.group({
    id: [null as number | null],
    name: ['', [Validators.required, Validators.maxLength(100)]]
  });

  protected readonly areaForm = this.formBuilder.nonNullable.group({
    id: [null as number | null],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    sedeId: [null as number | null, [Validators.required]]
  });

  protected loading = true;
  protected saving = false;
  protected errorMessage = '';
  protected lastSavedConfiguration: PurchaseOrderCompanyConfiguration | null = null;

  protected sedes: SedeOption[] = [];
  protected areas: AreaOption[] = [];
  protected selectedSedeId: number | null = null;

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadSedes();
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

  protected loadSedes(): void {
    this.locationService.getSedes().subscribe((result) => {
      this.sedes = result.data;
    });
  }

  protected loadAreas(sedeId: number): void {
    this.selectedSedeId = sedeId;
    this.areaForm.patchValue({ sedeId });
    this.locationService.getAreasBySede(sedeId).subscribe((result) => {
      this.areas = result.data;
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

  protected saveSede(): void {
    if (this.sedeForm.invalid) {
      this.sedeForm.markAllAsTouched();
      return;
    }

    const { id, name } = this.sedeForm.getRawValue();
    const obs = id 
      ? this.locationService.updateSede(id, { name }) 
      : this.locationService.createSede({ name });

    obs.subscribe((result) => {
      if (result.error) {
        this.notificationService.error(result.error);
        return;
      }
      this.notificationService.success(id ? 'Sede actualizada' : 'Sede creada');
      this.sedeForm.reset();
      this.loadSedes();
    });
  }

  protected editSede(sede: SedeOption): void {
    this.sedeForm.reset({ id: sede.id, name: sede.name });
  }

  protected deleteSede(id: number): void {
    if (!confirm('¿Estás seguro de eliminar esta sede? También se eliminarán sus áreas.')) return;

    this.locationService.deleteSede(id).subscribe((result) => {
      if (result.error) {
        this.notificationService.error(result.error);
        return;
      }
      this.notificationService.success('Sede eliminada');
      this.loadSedes();
      if (this.selectedSedeId === id) {
        this.selectedSedeId = null;
        this.areas = [];
      }
    });
  }

  protected saveArea(): void {
    if (this.areaForm.invalid) {
      this.areaForm.markAllAsTouched();
      return;
    }

    const { id, nombre, sedeId } = this.areaForm.getRawValue();
    if (!sedeId) return;

    const obs = id 
      ? this.locationService.updateArea(id, { nombre, sedeId }) 
      : this.locationService.createArea({ nombre, sedeId });

    obs.subscribe((result) => {
      if (result.error) {
        this.notificationService.error(result.error);
        return;
      }
      this.notificationService.success(id ? 'Área actualizada' : 'Área creada');
      this.areaForm.reset({ id: null, nombre: '', sedeId });
      this.loadAreas(sedeId);
    });
  }

  protected editArea(area: AreaOption): void {
    this.areaForm.reset({ id: area.id, nombre: area.nombre, sedeId: area.sedeId });
  }

  protected deleteArea(area: AreaOption): void {
    if (!confirm('¿Estás seguro de eliminar esta área?')) return;

    this.locationService.deleteArea(area.id).subscribe((result) => {
      if (result.error) {
        this.notificationService.error(result.error);
        return;
      }
      this.notificationService.success('Área eliminada');
      this.loadAreas(area.sedeId);
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
