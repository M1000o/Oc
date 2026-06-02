import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { UnitRequest, UnitResponse } from '../../../core/interfaces/unidad-medida.interface';
import { UnidadMedidaService } from '../../../core/services/unidad-medida.service';

@Component({
  selector: 'app-unit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './unit-modal.component.html',
  styleUrl: './unit-modal.component.css'
})
export class UnitModalComponent {
  private readonly unitService = inject(UnidadMedidaService);

  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() unitId: number | null = null;
  @Input() initialData: Partial<UnitRequest> | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<UnitResponse>();

  protected isSaving = false;
  protected formError = '';
  protected form: UnitRequest = {
    codigo: '',
    nombre: ''
  };

  ngOnChanges(): void {
    if (this.isOpen) {
      if (this.mode === 'edit' && this.initialData) {
        this.form = {
          codigo: this.initialData.codigo || '',
          nombre: this.initialData.nombre || ''
        };
      } else if (this.mode === 'create') {
        this.form = { codigo: '', nombre: '' };
      }
      this.formError = '';
    }
  }

  protected closeModal(): void {
    if (this.isSaving) return;
    this.closed.emit();
  }

  protected save(): void {
    if (!this.form.codigo.trim() || !this.form.nombre.trim()) {
      this.formError = 'El código y el nombre son obligatorios.';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    const request$ = this.mode === 'create'
      ? this.unitService.create(this.form)
      : this.unitService.update(this.unitId!, this.form);

    request$.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: ({ data }) => {
        this.saved.emit(data);
      },
      error: (err) => {
        this.formError = err?.error?.message || err?.message || 'Error al guardar la unidad de medida.';
      }
    });
  }
}
