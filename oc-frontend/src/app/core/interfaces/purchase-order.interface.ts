import { UnitOption } from '../../features/portal-home/portal-selection-modal/product-selection-modal.component';
import {
  PurchaseOrderDetailRequest,
  PurchaseOrderDetailResponse
} from './purchase-order-detail.interface';

export type PurchaseOrderStatus = 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'CANCELADO';

export type DeliveryStatus =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'ENTREGADO'
  | 'ENTREGADO_PARCIAL'
  | 'EN_REVISION'
  | 'PARCIAL'
  | 'RECHAZADO'
  | 'RECIBIDO'
  | 'COMPLETO'
  | 'ATRASADO';

export type CalidadStatus = 'PENDIENTE' | 'EN_REVISION' | 'PARCIAL' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

export interface PurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  deliveryDate: string;
  sedeId: number;
  areaId: number;
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
  sedeId: number;
  sede: string;
  areaId: number;
  area: string;
  status: PurchaseOrderStatus;
  deliveryStatus: DeliveryStatus;
  calidadStatus: CalidadStatus;
  notas: string | null;
  createdBy: string;
  subtotal: number;
  igv: number;
  total: number;
  details: PurchaseOrderDetailResponse[];
}

export type PurchaseOrderEmailStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface PurchaseOrderEmailRequest {
  message: string;
}

export interface PurchaseOrderEmailResponse {
  orderId: number;
  purchaseOrderNumber: string;
  recipientEmail: string;
  status: PurchaseOrderEmailStatus;
  sentAt: string;
  pdfFileName: string | null;
  pdfStoredPath: string | null;
}

export interface PurchaseOrderSummary {
  id: number;
  purchaseOrderNumber: string;
  supplierName: string;
  clientName: string;
  orderDate: string;
  deliveryDate: string;
  sedeId: number;
  sede: string;
  areaId: number;
  area: string;
  status: PurchaseOrderStatus;
  deliveryStatus: DeliveryStatus;
  calidadStatus: CalidadStatus;
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

export interface DeliveryStatusPayload {
  deliveryStatus: DeliveryStatus;
  notas?: string;
}

export interface PurchaseOrderQualityStatusPayload {
  calidadStatus: CalidadStatus;
  deliveryStatus: DeliveryStatus;
  motivo?: string;
  details?: PurchaseOrderQualityDetailPayload[];
}

export interface PurchaseOrderQualityDetailPayload {
  purchaseOrderDetailId: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  motivo?: string;
}

export interface OrderRow {
  id: number;
  productId: number;
  code: string;
  description: string;
  unit: UnitOption;
  unitPrice: number;
  quantity: number;
  serviceId: number;
  serviceName: string;
}
