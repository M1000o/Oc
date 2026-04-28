import {
  PurchaseOrderDetailRequest,
  PurchaseOrderDetailResponse
} from './purchase-order-detail.interface';

export type PurchaseOrderStatus = 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'CANCELADO';

export interface PurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  deliveryDate: string;
  sede: string;
  area: string;
  saveDraft?: boolean;
  details: PurchaseOrderDetailRequest[];
  notas?: string;
}

export interface PurchaseOrderResponse {
  id: number;
  purchaseOrderNumber: string;
  supplierId: number;
  supplierRuc: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string;
  sede: string;
  area: string;
  status: PurchaseOrderStatus;
  notas: string | null;
  createdBy: string;
  subtotal: number;
  igv: number;
  total: number;
  details: PurchaseOrderDetailResponse[];
}

export interface PurchaseOrderSummary {
  id: number;
  purchaseOrderNumber: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string;
  sede: string;
  area: string;
  status: PurchaseOrderStatus;
  total: number;
}

export interface PurchaseOrderFilter {
  status?: PurchaseOrderStatus;
  supplierId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  sede?: string;
  area?: string;
}

export interface PurchaseOrderStatusPayload {
  status: PurchaseOrderStatus;
  motivo?: string;
}
