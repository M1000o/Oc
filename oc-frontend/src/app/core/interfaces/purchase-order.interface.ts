import {
  PurchaseOrderDetailRequest,
  PurchaseOrderDetailResponse
} from './purchase-order-detail.interface';

export interface PurchaseOrderRequest {
  purchaseOrderNumber?: string;
  servicioId?: number;
  servicioIds?: number[];
  proveedorId: number;
  fechaEntrega: string;
  local: string;
  area: string;
  status?: 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EN_PROCESO' | 'COMPLETADO';
  details: PurchaseOrderDetailRequest[];
  notas?: string;
}

export interface PurchaseOrderResponse {
  id: number;
  purchaseOrderNumber: string;
  supplierId: number;
  serviceId: number;
  serviceIds?: number[];
  status: string;
  orderDate: string;
  deliveryDate: string;
  sede: string;
  area: string;
  notas: string | null;
  details: PurchaseOrderDetailResponse[];
  createdAt: string;
}
