import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { PurchaseOrderCompanyConfiguration } from '../../core/interfaces/configuration.interface';
import { ConfigurationService } from '../../core/services/configuration.service';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { SupplierDirectoryService } from '../../core/services/supplier-directory.service';
import { PurchaseOrderResponse } from '../../core/interfaces/purchase-order.interface';

interface PurchaseOrderPdfLineItem {
  item: string;
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
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
  selector: 'app-purchase-order-detail-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './purchase-order-detail-modal.component.html',
  styleUrl: './purchase-order-detail-modal.component.css'
})
export class PurchaseOrderDetailModalComponent implements OnInit {
  private readonly configurationService = inject(ConfigurationService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly supplierDirectoryService = inject(SupplierDirectoryService);
  private readonly currencyPipe = inject(CurrencyPipe);
  private readonly datePipe = inject(DatePipe);
  private readonly dialogRef = inject(MatDialogRef<PurchaseOrderDetailModalComponent>);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly viewModel = signal<PurchaseOrderPdfViewModel | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { orderId: number }) {}

  ngOnInit(): void {
    this.loadOrderDetail();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected formatCurrency(value: number): string {
    return this.currencyPipe.transform(value, 'S/', 'symbol', '1.2-2') ?? `S/ ${value.toFixed(2)}`;
  }

  private loadOrderDetail(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      order: this.purchaseOrderService.getSupplierOrderDetail(this.data.orderId),
      configuration: this.configurationService.getPurchaseOrderCompanyConfiguration()
    }).subscribe(({ order, configuration }) => {
      if (order.error || !order.data) {
        this.isLoading.set(false);
        this.errorMessage.set(order.error || 'No se pudo cargar la orden de compra.');
        return;
      }

      if (configuration.error || !configuration.data) {
        this.isLoading.set(false);
        this.errorMessage.set(
          configuration.error || 'Configura los datos de la empresa antes de visualizar el PDF.'
        );
        return;
      }

      const purchaseOrder = order.data;
      const company = configuration.data;

      this.supplierDirectoryService.getSupplierDetail(purchaseOrder.supplierId).subscribe({
        next: (response) => {
          this.viewModel.set(this.buildViewModel(purchaseOrder, response.data ?? null, company));
          this.isLoading.set(false);
        },
        error: () => {
          this.viewModel.set(this.buildViewModel(purchaseOrder, null, company));
          this.isLoading.set(false);
        }
      });
    });
  }

  private buildViewModel(
    order: PurchaseOrderResponse,
    supplier: any,
    company: PurchaseOrderCompanyConfiguration
  ): PurchaseOrderPdfViewModel {
    return {
      companyName: company.companyName,
      companyRuc: company.companyRuc,
      companyAddress: company.companyAddress,
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
      generatedBy: `Generado por Grupo Kong Sistemas`,
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

  private formatDisplayDate(value: string): string {
    if (!value) return '';
    return this.datePipe.transform(value, 'dd/MM/yyyy') ?? value;
  }

}
