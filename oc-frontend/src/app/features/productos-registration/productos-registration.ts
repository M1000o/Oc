import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ProductRequest } from '../../core/interfaces/product-request.interface';
import { ProductResponse } from '../../core/interfaces/product-response.interface';
import { ServiceResponse } from '../../core/interfaces/services.interface';
import { SupplierResponse } from '../../core/interfaces/supplier.interface';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { ProductCatalogService } from '../../core/services/product-catalog.service';
import { MatIconModule } from '@angular/material/icon';

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  provider: string;
  price: number;
  unit: string;
  thumbClass: string;
  tagClass: string;
};

type ProductFormModel = {
  codigo_producto: string;
  nombre: string;
  precio: string;
  und_medida: string;
  proveedorId: number | null;
  servicioId: number | null;
};

type DeleteTarget = {
  id: number;
  name: string;
  sku: string;
};

@Component({
  selector: 'app-productos-registration',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './productos-registration.html',
  styleUrl: './productos-registration.css',
})
export class ProductosRegistration implements OnInit {
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly notificationService = inject(AppNotificationService);

  protected readonly pageSize = 4;
  protected readonly unitOptions = [
    { value: 'KG', label: 'Kilogramos' },
    { value: 'UND', label: 'Unidad' },
    { value: 'PAQ', label: 'Paquete' },
    { value: 'DOC', label: 'Docena' },
    { value: 'GR', label: 'Gramos' },
  ];

  protected searchTerm = '';
  protected currentPage = 1;
  protected products: ProductRow[] = [];
  protected suppliers: SupplierResponse[] = [];
  protected services: ServiceResponse[] = [];
  protected supplierServices: ServiceResponse[] = [];
  protected loadingTable = true;
  protected loadingCatalogs = true;
  protected loadingSupplierServices = false;
  protected tableError = '';
  protected catalogsError = '';
  protected isModalOpen = false;
  protected isSaving = false;
  protected isDeletingId: number | null = null;
  protected deleteTarget: DeleteTarget | null = null;
  protected modalMode: 'create' | 'edit' = 'create';
  protected editingProductId: number | null = null;
  protected formError = '';
  protected form: ProductFormModel = this.createEmptyForm();

  ngOnInit(): void {
    this.loadInitialData();
  }

  protected get filteredProducts(): ProductRow[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.products;
    }

    return this.products.filter((product) =>
      [product.sku, product.name, product.category, product.provider, product.unit].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }

  protected get paginatedProducts(): ProductRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
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

  protected get startItem(): number {
    if (!this.filteredProducts.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  protected get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredProducts.length);
  }

  protected get totalProductsCount(): number {
    return this.products.length;
  }

  protected get activeSuppliersCount(): number {
    return new Set(this.products.map((product) => product.provider)).size;
  }

  protected get linkedServicesCount(): number {
    return new Set(this.products.map((product) => product.category)).size;
  }

  protected onSearchChange(value: string): void {
    this.searchTerm = value;
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

  protected openCreateModal(): void {
    this.modalMode = 'create';
    this.editingProductId = null;
    this.form = this.createEmptyForm();
    this.formError = '';
    this.supplierServices = [];
    this.isModalOpen = true;
  }

  protected openEditModal(product: ProductRow): void {
    this.modalMode = 'edit';
    this.editingProductId = product.id;
    this.formError = '';
    this.form = {
      codigo_producto: product.sku,
      nombre: product.name,
      precio: product.price.toString(),
      und_medida: this.resolveUnitValue(product.unit),
      proveedorId: this.findSupplierIdByName(product.provider),
      servicioId: this.findServiceIdByName(product.category),
    };
    this.supplierServices = [];
    this.isModalOpen = true;
    if (this.form.proveedorId) {
      this.loadServicesBySupplier(this.form.proveedorId, this.form.servicioId);
    }
  }

  protected closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.isModalOpen = false;
    this.formError = '';
  }

  protected saveProduct(): void {
    this.formError = '';
    this.notificationService.dismiss();
    const payload = this.buildPayload();

    if (!payload) {
      return;
    }

    this.isSaving = true;
    const request$ =
      this.modalMode === 'create'
        ? this.productCatalogService.createProduct(payload)
        : this.productCatalogService.updateProduct(this.editingProductId!, payload);

    request$
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: ({ data, message }) => {
          const mapped = this.mapProduct(data);

          if (this.modalMode === 'create') {
            this.products = [mapped, ...this.products];
            this.currentPage = 1;
          } else {
            this.products = this.products.map((product) =>
              product.id === mapped.id ? mapped : product,
            );
          }

          this.isModalOpen = false;
          this.showSuccess(message);
          this.syncPagination();
        },
        error: (error) => {
          const message = this.extractErrorMessage(
            error,
            this.modalMode === 'create'
              ? 'No se pudo crear el producto.'
              : 'No se pudo actualizar el producto.',
          );
          this.formError = message;
          this.showError(message);
        },
      });
  }

  protected openDeleteModal(product: ProductRow): void {
    this.deleteTarget = {
      id: product.id,
      name: product.name,
      sku: product.sku,
    };
  }

  protected closeDeleteModal(): void {
    if (this.isDeletingId !== null) {
      return;
    }

    this.deleteTarget = null;
  }

  protected confirmDeleteProduct(): void {
    if (!this.deleteTarget) {
      return;
    }

    const target = this.deleteTarget;
    this.isDeletingId = target.id;
    this.notificationService.dismiss();

    this.productCatalogService
      .deleteProduct(target.id)
      .pipe(finalize(() => (this.isDeletingId = null)))
      .subscribe({
        next: ({ message }) => {
          this.products = this.products.filter((item) => item.id !== target.id);
          this.syncPagination();
          this.deleteTarget = null;
          this.showSuccess(message);
        },
        error: (error) => {
          this.showError(this.extractErrorMessage(error, 'No se pudo eliminar el producto.'));
        },
      });
  }

  protected retryLoad(): void {
    this.loadInitialData();
  }

  protected onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  protected onSupplierChange(supplierId: number | null): void {
    this.form.proveedorId = supplierId;
    this.form.servicioId = null;
    this.supplierServices = [];

    if (supplierId) {
      this.loadServicesBySupplier(supplierId);
    }
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(price);
  }

  protected trackBySku(_: number, product: ProductRow): string {
    return product.sku;
  }

  private loadInitialData(): void {
    this.loadingTable = true;
    this.loadingCatalogs = true;
    this.tableError = '';
    this.catalogsError = '';

    forkJoin({
      products: this.productCatalogService.listAllProducts(),
      suppliers: this.productCatalogService.listSuppliers(),
      services: this.productCatalogService.listServices(),
    }).subscribe({
      next: ({ products, suppliers, services }) => {
        this.products = (products.data ?? []).map((product) => this.mapProduct(product));
        this.suppliers = suppliers.data ?? [];
        this.services = services.data ?? [];
        this.loadingTable = false;
        this.loadingCatalogs = false;
        this.syncPagination();
      },
      error: (error) => {
        const message = this.extractErrorMessage(
          error,
          'No se pudo cargar el catalogo de productos. Verifica que el backend esté disponible.',
        );
        this.tableError = message;
        this.catalogsError = message;
        this.loadingTable = false;
        this.loadingCatalogs = false;
      },
    });
  }

  private loadServicesBySupplier(supplierId: number, preferredServiceId: number | null = null): void {
    this.loadingSupplierServices = true;
    this.formError = '';

    this.productCatalogService
      .listServicesBySupplier(supplierId)
      .pipe(finalize(() => (this.loadingSupplierServices = false)))
      .subscribe({
        next: ({ data }) => {
          this.supplierServices = data ?? [];

          const hasPreferred =
            preferredServiceId !== null &&
            this.supplierServices.some((service) => service.id === preferredServiceId);

          this.form.servicioId = hasPreferred ? preferredServiceId : null;
        },
        error: (error) => {
          this.supplierServices = [];
          this.form.servicioId = null;
          this.formError = this.extractErrorMessage(
            error,
            'No se pudieron cargar las categorias del proveedor seleccionado.',
          );
        },
      });
  }

  private mapProduct(product: ProductResponse): ProductRow {
    const category = product.servicioNombre?.trim() || 'Sin categoria';

    return {
      id: product.id,
      sku: product.codigo_producto?.trim() || `${product.id}`,
      name: product.nombre?.trim() || 'Producto sin nombre',
      category,
      provider: product.proveedorName?.trim() || 'Proveedor no disponible',
      price: this.toNumber(product.precio),
      unit: this.resolveUnitLabel(product.und_medida),
      thumbClass: this.resolveThumbClass(category),
      tagClass: this.resolveTagClass(category),
    };
  }

  private buildPayload(): ProductRequest | null {
    const codigo = this.form.codigo_producto.trim().toUpperCase();
    const nombre = this.form.nombre.trim();
    const precio = Number(this.form.precio || 0);

    if (!codigo || !nombre || !this.form.und_medida || !this.form.proveedorId || !this.form.servicioId) {
      this.formError = 'Completa codigo, nombre, unidad, proveedor y categoria.';
      return null;
    }

    if (!Number.isFinite(precio)) {
      this.formError = 'El precio debe ser un número válido.';
      return null;
    }

    return {
      codigo_producto: codigo,
      nombre,
      descripcion: '',
      precio,
      und_medida: this.form.und_medida,
      proveedorId: this.form.proveedorId,
      servicioId: this.form.servicioId,
    };
  }

  private createEmptyForm(): ProductFormModel {
    return {
      codigo_producto: '',
      nombre: '',
      precio: '',
      und_medida: 'UND',
      proveedorId: null,
      servicioId: null,
    };
  }

  private resolveThumbClass(category: string): string {
    const normalized = category.toLowerCase();

    if (normalized.includes('furniture') || normalized.includes('mueble')) {
      return 'thumb-chair';
    }

    if (normalized.includes('optic') || normalized.includes('foto') || normalized.includes('cam')) {
      return 'thumb-camera';
    }

    if (normalized.includes('audio')) {
      return 'thumb-headphones';
    }

    return 'thumb-watch';
  }

  private resolveTagClass(category: string): string {
    const normalized = category.toLowerCase();
    return normalized.includes('furniture') || normalized.includes('mueble')
      ? 'tag-tertiary'
      : 'tag-secondary';
  }

  private resolveUnitLabel(value: string | null | undefined): string {
    const option = this.unitOptions.find((item) => item.value === value);
    return option?.label ?? value ?? 'Unidad';
  }

  private resolveUnitValue(label: string): string {
    const option = this.unitOptions.find((item) => item.label === label);
    return option?.value ?? 'UND';
  }

  private findSupplierIdByName(name: string): number | null {
    return this.suppliers.find((supplier) => supplier.razon_social === name)?.id ?? null;
  }

  private findServiceIdByName(name: string): number | null {
    return this.services.find((service) => service.nombre === name)?.id ?? null;
  }

  private syncPagination(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (!this.filteredProducts.length) {
      this.currentPage = 1;
    }
  }

  private toNumber(value: number | string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: { message?: string; error?: string; errors?: Record<string, string> };
      message?: string;
    };

    if (candidate?.error?.errors && typeof candidate.error.errors === 'object') {
      return Object.values(candidate.error.errors).join('\n');
    }

    return candidate?.error?.message || candidate?.error?.error || candidate?.message || fallback;
  }

  private showSuccess(message: string): void {
    this.notificationService.success(message, 2200);
  }

  private showError(message: string): void {
    this.notificationService.error(message, 4500);
  }
}
