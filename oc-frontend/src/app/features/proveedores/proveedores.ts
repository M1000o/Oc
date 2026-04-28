import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ProductResponse } from '../../core/interfaces/product-response.interface';
import {
  SupplierDirectoryDetail,
  SupplierDirectoryItem,
  SupplierDirectoryStatus,
} from '../../core/interfaces/supplier-directory.interface';
import { ProductCatalogService } from '../../core/services/product-catalog.service';
import { SupplierDirectoryService } from '../../core/services/supplier-directory.service';

type SupplierProductRow = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precio: number;
};

@Component({
  selector: 'app-proveedores',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit, OnDestroy {
  private readonly supplierDirectoryService = inject(SupplierDirectoryService);
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private routeSubscription?: Subscription;

  protected readonly pageSize = 5;
  protected suppliers: SupplierDirectoryItem[] = [];
  protected selectedSupplier: SupplierDirectoryDetail | null = null;
  protected searchTerm = '';
  protected activeCategory = 'Todos';
  protected currentPage = 1;
  protected loadingDirectory = true;
  protected loadingDetail = false;
  protected directoryError = '';
  protected detailError = '';
  protected supplierProducts: SupplierProductRow[] = [];
  protected detailProductsError = '';

  ngOnInit(): void {
    this.loadDirectory();
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');

      if (!rawId) {
        this.selectedSupplier = null;
        this.detailError = '';
        this.detailProductsError = '';
        this.supplierProducts = [];
        return;
      }

      const supplierId = Number(rawId);
      if (!Number.isFinite(supplierId)) {
        this.detailError = 'El proveedor solicitado no es válido.';
        this.selectedSupplier = null;
        return;
      }

      this.loadSupplierDetail(supplierId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected get isDetailView(): boolean {
    return this.selectedSupplier !== null || this.loadingDetail || !!this.detailError;
  }

  protected get filteredSuppliers(): SupplierDirectoryItem[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.suppliers.filter((supplier) => {
      const matchesCategory =
        this.activeCategory === 'Todos' || supplier.categorias.includes(this.activeCategory);

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        supplier.razonSocial,
        supplier.ruc,
        supplier.contactoNombre ?? '',
        supplier.contactoEmail ?? '',
        supplier.contactoTelefono ?? '',
        supplier.estado,
        ...supplier.categorias,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }

  protected get paginatedSuppliers(): SupplierDirectoryItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSuppliers.slice(start, start + this.pageSize);
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSuppliers.length / this.pageSize));
  }

  protected get startItem(): number {
    if (!this.filteredSuppliers.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  protected get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSuppliers.length);
  }

  protected get totalSuppliersCount(): number {
    return this.suppliers.length;
  }

  protected get totalCategoriesCount(): number {
    return this.availableCategories.length;
  }

  protected get activeSuppliersCount(): number {
    return this.suppliers.filter((supplier) => supplier.estado === 'ACTIVO').length;
  }

  protected get pendingReviewsCount(): number {
    return this.suppliers.filter((supplier) => supplier.estado === 'REVISION').length;
  }

  protected get healthRatio(): string {
    if (!this.suppliers.length) {
      return '0%';
    }

    const ratio = (this.activeSuppliersCount / this.suppliers.length) * 100;
    return `${ratio.toFixed(1)}%`;
  }

  protected get availableCategories(): string[] {
    return Array.from(
      new Set(this.suppliers.flatMap((supplier) => supplier.categorias).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
  }

  protected get visibleCategoryFilters(): string[] {
    return ['Todos', ...this.availableCategories.slice(0, 4)];
  }

  protected get complianceItems(): SupplierDirectoryItem[] {
    return this.suppliers.slice(0, 2);
  }

  protected get pageItems(): Array<number | string> {
    const total = this.totalPages;

    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (this.currentPage <= 3) {
      return [1, 2, 3, '...', total];
    }

    if (this.currentPage >= total - 2) {
      return [1, '...', total - 2, total - 1, total];
    }

    return [1, '...', this.currentPage, '...', total];
  }

  protected setCategory(category: string): void {
    this.activeCategory = category;
    this.currentPage = 1;
  }

  protected onSearchTermChange(): void {
    this.currentPage = 1;
  }

  protected setPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  protected previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  protected nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  protected openSupplierProfile(supplier: SupplierDirectoryItem): void {
    void this.router.navigate(['/portal/proveedores', supplier.id]);
  }

  protected goBackToDirectory(): void {
    this.selectedSupplier = null;
    this.detailError = '';
    void this.router.navigate(['/portal/proveedores']);
  }

  protected retryDirectory(): void {
    this.loadDirectory();
  }

  protected retryDetail(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const id = this.selectedSupplier?.id ?? (routeId ? Number(routeId) : NaN);

    if (Number.isFinite(id)) {
      this.loadSupplierDetail(id);
    }
  }

  protected exportCsv(): void {
    const header = [
      'Proveedor',
      'RUC',
      'Contacto',
      'Email',
      'Telefono',
      'Categorias',
      'Productos',
      'Estado',
    ];

    const rows = this.filteredSuppliers.map((supplier) => [
      supplier.razonSocial,
      supplier.ruc,
      supplier.contactoNombre ?? 'Sin contacto',
      supplier.contactoEmail ?? 'Sin correo',
      supplier.contactoTelefono ?? 'Sin telefono',
      supplier.categorias.join(' | '),
      supplier.totalProductos,
      this.getStatusLabel(supplier.estado),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'directorio-proveedores.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected getSupplierInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected getStatusLabel(status: SupplierDirectoryStatus): string {
    switch (status) {
      case 'ACTIVO':
        return 'Activo';
      case 'REVISION':
        return 'En revisión';
      default:
        return 'Inactivo';
    }
  }

  protected getStatusClass(status: SupplierDirectoryStatus): string {
    switch (status) {
      case 'ACTIVO':
        return 'status-chip active';
      case 'REVISION':
        return 'status-chip review';
      default:
        return 'status-chip inactive';
    }
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Sin registro';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Sin registro';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }

  protected trackBySupplierId(_: number, supplier: SupplierDirectoryItem): number {
    return supplier.id;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private loadDirectory(): void {
    this.loadingDirectory = true;
    this.directoryError = '';

    this.supplierDirectoryService.listDirectory().subscribe({
      next: ({ data }) => {
        this.suppliers = data ?? [];
        this.loadingDirectory = false;
        this.syncPagination();
      },
      error: (error) => {
        this.directoryError = this.extractErrorMessage(
          error,
          'No se pudo cargar el directorio de proveedores.',
        );
        this.loadingDirectory = false;
      },
    });
  }

  private loadSupplierDetail(id: number): void {
    this.loadingDetail = true;
    this.detailError = '';
    this.detailProductsError = '';
    this.supplierProducts = [];

    forkJoin({
      detail: this.supplierDirectoryService.getSupplierDetail(id),
      products: this.productCatalogService.listProductsBySupplier(id),
    }).subscribe({
      next: ({ detail, products }) => {
        this.selectedSupplier = detail.data;
        this.supplierProducts = (products.data ?? []).map((product) => this.mapSupplierProduct(product));
        this.loadingDetail = false;
      },
      error: (error) => {
        this.selectedSupplier = null;
        this.supplierProducts = [];
        this.detailError = this.extractErrorMessage(
          error,
          'No se pudo cargar el detalle del proveedor.',
        );
        this.loadingDetail = false;
      },
    });
  }

  private syncPagination(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (!this.filteredSuppliers.length) {
      this.currentPage = 1;
    }
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    return candidate?.error?.message || candidate?.error?.error || candidate?.message || fallback;
  }

  private mapSupplierProduct(product: ProductResponse): SupplierProductRow {
    return {
      id: product.id,
      codigo: product.codigo_producto?.trim() || `PRD-${product.id}`,
      nombre: product.nombre?.trim() || 'Producto sin nombre',
      categoria: product.servicioNombre?.trim() || 'Sin categoría',
      unidad: this.resolveUnitLabel(product.und_medida),
      precio: this.toNumber(product.precio),
    };
  }

  private resolveUnitLabel(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      KG: 'Kilogramos',
      UND: 'Unidad',
      PAQ: 'Paquete',
      DOC: 'Docena',
      GR: 'Gramos',
    };

    return (value && labels[value]) || value || 'Unidad';
  }

  private toNumber(value: number | string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
