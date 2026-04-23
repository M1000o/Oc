export interface PurchaseOrderDetailRequest {
  descripcion: string;
  cantidad: number;
}

export interface PurchaseOrderDetailResponse {
  id: number;
  descripcion: string;
  cantidad: number;
}
