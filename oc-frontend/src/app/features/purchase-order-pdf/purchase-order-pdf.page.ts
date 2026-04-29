import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseOrderResponse } from '../../core/interfaces/purchase-order.interface';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { SupplierDirectoryService } from '../../core/services/supplier-directory.service';

interface PurchaseOrderPdfLineItem {
  item: string;
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrderPdfPreviewData {
  orderNumber: string;
  supplierName: string;
  supplierRuc: string;
  supplierEmail: string;
  supplierContact: string;
  deliverySite: string;
  deliveryArea: string;
  deliveryDate: string;
  paymentTerms: string;
  notes: string;
  generatedBy: string;
  lineItems: PurchaseOrderPdfLineItem[];
  subtotal: number;
  igv: number;
  total: number;
}

interface PurchaseOrderPdfViewModel {
  companyName: string;
  companyRuc: string;
  companyAddress: string;
  documentNumber: string;
  issueDate: string;
  supplierName: string;
  supplierRuc: string;
  supplierContact: string;
  supplierEmail: string;
  deliverySite: string;
  deliveryArea: string;
  requiredDate: string;
  paymentTerms: string;
  currencyLabel: string;
  subtotal: number;
  igv: number;
  total: number;
  notes: string;
  generatedBy: string;
  lineItems: PurchaseOrderPdfLineItem[];
}

@Component({
  selector: 'app-purchase-order-pdf-page',
  imports: [CommonModule, MatIconModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './purchase-order-pdf.page.html',
  styleUrl: './purchase-order-pdf.page.css'
})
export class PurchaseOrderPdfPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currencyPipe = inject(CurrencyPipe);
  private readonly datePipe = inject(DatePipe);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly supplierDirectoryService = inject(SupplierDirectoryService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly viewModel = signal<PurchaseOrderPdfViewModel | null>(null);

  constructor() {
    this.loadViewModel();
  }

  protected goBack(): void {
    this.router.navigate(['/portal/pedido']);
  }

  protected exportPdf(): void {
    window.print();
  }

  protected formatCurrency(value: number): string {
    return this.currencyPipe.transform(value, 'PEN', 'symbol', '1.2-2') ?? `S/ ${value.toFixed(2)}`;
  }

  private loadViewModel(): void {
    const orderId = this.toPositiveInt(this.route.snapshot.queryParamMap.get('orderId'));
    if (orderId) {
      this.loadFromBackend(orderId);
      return;
    }

    this.loadFromPreviewData();
  }

  private loadFromBackend(orderId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.purchaseOrderService.getPurchaseOrder(orderId).subscribe(({ data, error }) => {
      if (error || !data) {
        this.isLoading.set(false);
        this.errorMessage.set(error || 'No se pudo cargar la orden de compra.');
        return;
      }

      this.supplierDirectoryService.getSupplierDetail(data.supplierId).subscribe({
        next: (response) => {
          this.viewModel.set(this.buildFromOrder(data, response.data ?? null));
          this.isLoading.set(false);
        },
        error: () => {
          this.viewModel.set(this.buildFromOrder(data, null));
          this.isLoading.set(false);
        }
      });
    });
  }

  private loadFromPreviewData(): void {
    const rawPreviewData = this.route.snapshot.queryParamMap.get('previewData');
    if (!rawPreviewData) {
      this.isLoading.set(false);
      this.errorMessage.set('No se encontró información para la vista previa del PDF.');
      return;
    }

    try {
      const preview = JSON.parse(rawPreviewData) as PurchaseOrderPdfPreviewData;
      this.viewModel.set(this.buildFromPreview(preview));
      this.isLoading.set(false);
    } catch {
      this.isLoading.set(false);
      this.errorMessage.set('No se pudo interpretar la vista previa del PDF.');
    }
  }

  private buildFromOrder(
    order: PurchaseOrderResponse,
    supplier: {
      diasCreditoLabel?: string | null;
      contactoNombre?: string | null;
      contactoEmail?: string | null;
      correoConstancias?: string | null;
    } | null
  ): PurchaseOrderPdfViewModel {
    return {
      companyName: 'GRUPO KONG S.A.C.',
      companyRuc: '20601234567',
      companyAddress: 'Av. Empresarial 456, Lima, Peru',
      documentNumber: order.purchaseOrderNumber,
      issueDate: this.formatDisplayDate(order.orderDate),
      supplierName: order.supplierName,
      supplierRuc: order.supplierRuc,
      supplierContact: supplier?.contactoNombre?.trim() || 'No registrado',
      supplierEmail:
        supplier?.contactoEmail?.trim() ||
        supplier?.correoConstancias?.trim() ||
        'No registrado',
      deliverySite: order.sede,
      deliveryArea: order.area,
      requiredDate: this.formatDisplayDate(order.deliveryDate),
      paymentTerms: supplier?.diasCreditoLabel?.trim() || 'No configurado',
      currencyLabel: 'Soles (PEN)',
      subtotal: Number(order.subtotal ?? 0),
      igv: Number(order.igv ?? 0),
      total: Number(order.total ?? 0),
      notes: order.notas?.trim() || 'Sin observaciones registradas.',
      generatedBy: `Generado por Grupo Kong Sistemas · Usuario: ${order.createdBy}`,
      lineItems: order.details.map((detail, index) => ({
        item: `${index + 1}`.padStart(2, '0'),
        sku: detail.codigoProducto,
        description: detail.nombreProducto,
        unit: detail.unidadMedida,
        quantity: detail.cantidad,
        unitPrice: Number(detail.precioUnitario ?? 0),
        total: Number(detail.subtotal ?? 0)
      }))
    };
  }

  private buildFromPreview(preview: PurchaseOrderPdfPreviewData): PurchaseOrderPdfViewModel {
    return {
      companyName: 'GRUPO KONG S.A.C.',
      companyRuc: '20601234567',
      companyAddress: 'Av. Empresarial 456, Lima, Peru',
      documentNumber: preview.orderNumber,
      issueDate: this.formatDisplayDate(new Date().toISOString()),
      supplierName: preview.supplierName,
      supplierRuc: preview.supplierRuc,
      supplierContact: preview.supplierContact || 'No registrado',
      supplierEmail: preview.supplierEmail || 'No registrado',
      deliverySite: preview.deliverySite,
      deliveryArea: preview.deliveryArea,
      requiredDate: this.formatDisplayDate(preview.deliveryDate),
      paymentTerms: preview.paymentTerms || 'No configurado',
      currencyLabel: 'Soles (PEN)',
      subtotal: preview.subtotal,
      igv: preview.igv,
      total: preview.total,
      notes: preview.notes || 'Sin observaciones registradas.',
      generatedBy: preview.generatedBy || 'Generado por Grupo Kong Sistemas',
      lineItems: preview.lineItems
    };
  }

  private formatDisplayDate(value: string): string {
    if (!value) {
      return '';
    }

    return this.datePipe.transform(value, 'dd/MM/yyyy') ?? value;
  }

  private toPositiveInt(value: string | null): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }
}
