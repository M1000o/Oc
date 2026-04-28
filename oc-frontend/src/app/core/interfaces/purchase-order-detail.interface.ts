export interface PurchaseOrderDetailRequest {
  productId: number;
  cantidad: number;
  precioUnitario: number;
}

export interface PurchaseOrderDetailResponse {
  id: number;
  productoId: number;
  codigoProducto: string;
  nombreProducto: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}
