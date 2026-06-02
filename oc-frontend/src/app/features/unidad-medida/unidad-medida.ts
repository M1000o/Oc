import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UnitResponse } from '../../core/interfaces/unidad-medida.interface';
import { UnidadMedidaService } from '../../core/services/unidad-medida.service';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { MatIconModule } from '@angular/material/icon';
import { UnitModalComponent } from '../../shared/components/unit-modal/unit-modal.component';

@Component({
  selector: 'app-unidad-medida',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, UnitModalComponent],
  templateUrl: './unidad-medida.html',
  styleUrl: './unidad-medida.css',
})
export class UnidadMedida implements OnInit {
  private readonly unidadMedidaService = inject(UnidadMedidaService);
  private readonly notificationService = inject(AppNotificationService);

  protected readonly pageSize = 10;
  protected searchTerm = '';
  protected currentPage = 1;
  protected unidades: UnitResponse[] = [];
  protected loadingTable = true;
  protected tableError = '';
  protected isModalOpen = false;
  protected isDeletingId: number | null = null;
  protected deleteTarget: UnitResponse | null = null;
  protected modalMode: 'create' | 'edit' = 'create';
  protected editingId: number | null = null;
  protected editingData: Partial<UnitResponse> | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  protected get filteredUnidades(): UnitResponse[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.unidades;

    return this.unidades.filter((u) =>
      [u.codigo, u.nombre].some((v) =>
        (v || '').toLowerCase().includes(term)
      )
    );
  }

  protected get paginatedUnidades(): UnitResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUnidades.slice(start, start + this.pageSize);
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUnidades.length / this.pageSize));
  }

  protected get pageItems(): Array<number | string> {
    const total = this.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (this.currentPage <= 3) return [1, 2, 3, '...', total];
    if (this.currentPage >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', this.currentPage, '...', total];
  }

  protected get startItem(): number {
    return this.filteredUnidades.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  protected get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUnidades.length);
  }

  protected onSearchChange(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  protected setPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  protected previousPage(): void {
    if (this.currentPage > 1) this.currentPage -= 1;
  }

  protected nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage += 1;
  }

  protected openCreateModal(): void {
    this.modalMode = 'create';
    this.editingId = null;
    this.editingData = null;
    this.isModalOpen = true;
  }

  protected openEditModal(unidad: UnitResponse): void {
    this.modalMode = 'edit';
    this.editingId = unidad.id;
    this.editingData = { ...unidad };
    this.isModalOpen = true;
  }

  protected onModalClosed(): void {
    this.isModalOpen = false;
  }

  protected onModalSaved(data: UnitResponse): void {
    if (this.modalMode === 'create') {
      this.unidades = [data, ...this.unidades];
      this.notificationService.success('Unidad de medida creada exitosamente');
    } else {
      this.unidades = this.unidades.map((u) => u.id === data.id ? data : u);
      this.notificationService.success('Unidad de medida actualizada exitosamente');
    }
    this.isModalOpen = false;
  }

  protected openDeleteModal(unidad: UnitResponse): void {
    this.deleteTarget = unidad;
  }

  protected closeDeleteModal(): void {
    if (this.isDeletingId !== null) return;
    this.deleteTarget = null;
  }

  protected confirmDelete(): void {
    if (!this.deleteTarget) return;
    const targetId = this.deleteTarget.id;
    this.isDeletingId = targetId;

    this.unidadMedidaService.delete(targetId).pipe(finalize(() => this.isDeletingId = null)).subscribe({
      next: ({ message }) => {
        this.unidades = this.unidades.filter((u) => u.id !== targetId);
        this.deleteTarget = null;
        this.notificationService.success(message);
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || err?.message || 'Error al eliminar la unidad de medida.');
      }
    });
  }

  protected loadData(): void {
    this.loadingTable = true;
    this.tableError = '';
    this.unidadMedidaService.listAll().subscribe({
      next: ({ data }) => {
        this.unidades = data || [];
        this.loadingTable = false;
      },
      error: (err) => {
        this.tableError = err?.error?.message || err?.message || 'No se pudieron cargar las unidades de medida.';
        this.loadingTable = false;
      }
    });
  }
}
