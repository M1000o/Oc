import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, HostListener, Output, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, switchMap } from 'rxjs';
import { ProductResponse } from '../../../core/interfaces/product-response.interface';
import { ProviderSelection } from '../../../core/interfaces/provider-option.interface';
import { ProductCatalogService } from '../../../core/services/product-catalog.service';

export type UnitOption = 'KG' | 'UND' | 'PAQ' | 'DOC' | 'GR' | 'UN' | 'CJ';

export interface ProductSelectionItem {
  productId: number;
  sku: string;
  name: string;
  unit: UnitOption;
  unitPrice: number;
  quantity: number;
  serviceId: number;
  serviceName: string;
}

interface ProductRow extends ProductSelectionItem {
  id: number;
}

@Component({
  selector: 'app-product-selection-modal',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './product-selection-modal.component.html',
  styleUrl: './product-selection-modal.component.css'
})
export class ProductSelectionModalComponent {
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly supportedUnits: UnitOption[] = ['KG', 'UND', 'PAQ', 'DOC', 'GR', 'UN', 'CJ'];

  readonly providerSelection = input<ProviderSelection | null>(null);
  readonly initialSelections = input<ProductSelectionItem[]>([]);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() productsConfirmed = new EventEmitter<ProductSelectionItem[]>();

  protected readonly searchTerm = signal('');
  protected readonly productsLoading = signal(false);
  protected readonly productsLoadError = signal('');

  protected readonly products = signal<ProductRow[]>([]);

  protected readonly filteredProducts = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();

    return this.products().filter((product) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch)
      );
    });
  });

  protected readonly selectedProductsCount = computed(
    () => this.products().filter((product) => product.quantity > 0).length
  );

  constructor() {
    toObservable(this.providerSelection)
      .pipe(
        filter((selection): selection is ProviderSelection => selection !== null),
        switchMap((selection) => {
          this.productsLoading.set(true);
          this.productsLoadError.set('');

          return this.productCatalogService.getProductsByServiceAndSupplier(
            selection.serviceId,
            selection.providerId
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ data, error }) => {
        this.products.set(
          data.map((product) => this.toProductRow(product, this.initialSelections()))
        );
        this.productsLoadError.set(error);
        this.productsLoading.set(false);
      });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected decrementQuantity(productId: number): void {
    this.updateQuantity(productId, this.getQuantity(productId) - 1);
  }

  protected incrementQuantity(productId: number): void {
    this.updateQuantity(productId, this.getQuantity(productId) + 1);
  }

  protected updateQuantity(productId: number, value: number | string): void {
    const parsedValue = Number(value);
    const nextQuantity = Number.isFinite(parsedValue) ? Math.max(0, Math.trunc(parsedValue)) : 0;

    this.products.update((products) =>
      products.map((product) =>
        product.id === productId
          ? {
              ...product,
              quantity: nextQuantity
            }
          : product
      )
    );
  }

  protected confirmSelection(): void {
    const selectedProducts = this.products()
      .filter((product) => product.quantity > 0)
      .map(({ id, sku, name, unit, unitPrice, quantity, serviceId, serviceName }) => ({
        productId: id,
        sku,
        name,
        unit,
        unitPrice,
        quantity,
        serviceId,
        serviceName
      }));

    if (!selectedProducts.length) {
      return;
    }

    this.productsConfirmed.emit(selectedProducts);
  }

  private getQuantity(productId: number): number {
    return this.products().find((product) => product.id === productId)?.quantity ?? 0;
  }

  private toProductRow(
    product: ProductResponse,
    initialSelections: ProductSelectionItem[]
  ): ProductRow {
    const sku = this.toSku(product);
    const existingSelection = initialSelections.find((item) => item.sku === sku);

    return {
      id: product.id,
      productId: product.id,
      sku,
      name: product.nombre,
      unit: this.toUnitOption(product.und_medida),
      unitPrice: this.toNumber(product.precio),
      quantity: existingSelection?.quantity ?? 0,
      serviceId: product.servicioId,
      serviceName: product.servicioNombre
    };
  }

  private toSku(product: ProductResponse): string {
    const normalizedCode = typeof product.codigo_producto === 'string' ? product.codigo_producto.trim() : '';
    return normalizedCode.length ? normalizedCode : `${product.id}`.padStart(3, '0');
  }

  private toUnitOption(value: unknown): UnitOption {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    return this.isUnitOption(normalized) ? normalized : 'UND';
  }

  private isUnitOption(value: string): value is UnitOption {
    return this.supportedUnits.includes(value as UnitOption);
  }

  private toNumber(value: number | string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
