import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ProductResponse } from '../../core/interfaces/product-response.interface';
import { ServiceResponse } from '../../core/interfaces/services.interface';
import {
  SupplierDirectoryDetail,
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
  selector: 'app-proveedor-detail',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proveedor-detail.html',
  styleUrl: './proveedor-detail.css',
})
export class ProveedorDetail implements OnInit, OnDestroy {
  private readonly supplierDirectoryService = inject(SupplierDirectoryService);
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private routeSubscription?: Subscription;

  protected supplier: SupplierDirectoryDetail | null = null;
  protected supplierProducts: SupplierProductRow[] = [];
  protected supplierServices: ServiceResponse[] = [];
  protected loadingDetail = true;
  protected detailError = '';
  protected activeTab: 'productos' | 'servicios' = 'productos';
  protected productSearch = '';
  protected serviceSearch = '';

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const supplierId = rawId ? Number(rawId) : NaN;

      if (!Number.isFinite(supplierId)) {
        this.loadingDetail = false;
        this.detailError = 'El proveedor solicitado no es válido.';
        this.supplier = null;
        return;
      }

      this.loadSupplierDetail(supplierId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected get filteredProducts(): SupplierProductRow[] {
    const query = this.productSearch.trim().toLowerCase();

    if (!query) {
      return this.supplierProducts;
    }

    return this.supplierProducts.filter((product) =>
      [product.codigo, product.nombre, product.categoria, product.unidad]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }

  protected get filteredServices(): ServiceResponse[] {
    const query = this.serviceSearch.trim().toLowerCase();

    if (!query) {
      return this.supplierServices;
    }

    return this.supplierServices.filter((service) => service.nombre.toLowerCase().includes(query));
  }

  protected goBackToDirectory(): void {
    void this.router.navigate(['/portal/proveedores']);
  }

  protected retryDetail(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const supplierId = rawId ? Number(rawId) : NaN;

    if (Number.isFinite(supplierId)) {
      this.loadSupplierDetail(supplierId);
    }
  }

  protected setActiveTab(tab: 'productos' | 'servicios'): void {
    this.activeTab = tab;
  }

  protected exportProductsCsv(): void {
    const header = ['Código', 'Nombre', 'Categoría', 'Unidad', 'Precio'];
    const rows = this.filteredProducts.map((product) => [
      product.codigo,
      product.nombre,
      product.categoria,
      product.unidad,
      this.formatCurrency(product.precio),
    ]);

    this.downloadCsv('productos-proveedor.csv', [header, ...rows]);
  }

  protected exportProfileCsv(): void {
    if (!this.supplier) {
      return;
    }

    const header = [
      'Proveedor',
      'RUC',
      'Contacto',
      'Email',
      'Telefono',
      'Categorias',
      'Productos',
      'Servicios',
      'Estado',
    ];
    const row = [
      this.supplier.razonSocial,
      this.supplier.ruc,
      this.supplier.contactoNombre ?? 'No registrado',
      this.supplier.contactoEmail ?? 'No registrado',
      this.supplier.contactoTelefono ?? 'No registrado',
      this.supplier.categorias.join(' | '),
      this.supplierProducts.length,
      this.supplierServices.length,
      this.getStatusLabel(this.supplier.estado),
    ];

    this.downloadCsv('perfil-proveedor.csv', [header, row]);
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
        return 'badge-active';
      case 'REVISION':
        return 'badge-active badge-review';
      default:
        return 'badge-active badge-inactive';
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

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected trackByProductId(_: number, product: SupplierProductRow): number {
    return product.id;
  }

  protected trackByServiceId(_: number, service: ServiceResponse): number {
    return service.id;
  }

  private loadSupplierDetail(id: number): void {
    this.loadingDetail = true;
    this.detailError = '';
    this.supplier = null;
    this.supplierProducts = [];
    this.supplierServices = [];

    forkJoin({
      detail: this.supplierDirectoryService.getSupplierDetail(id),
      products: this.productCatalogService.listProductsBySupplier(id),
      services: this.productCatalogService.listServicesBySupplier(id),
    }).subscribe({
      next: ({ detail, products, services }) => {
        this.supplier = detail.data;
        this.supplierProducts = (products.data ?? []).map((product) =>
          this.mapSupplierProduct(product),
        );
        this.supplierServices = services.data ?? [];
        this.loadingDetail = false;
      },
      error: (error) => {
        this.detailError = this.extractErrorMessage(
          error,
          'No se pudo cargar el detalle del proveedor.',
        );
        this.loadingDetail = false;
      },
    });
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

  private downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    return candidate?.error?.message || candidate?.error?.error || candidate?.message || fallback;
  }
}
