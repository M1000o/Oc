export interface ProductResponse {
  id: number;
  codigo_producto: string;
  nombre: string;
  precio: number | string;
  proveedorId: number;
  proveedorName: string;
  unidadMedidaId: number | null;
  und_medida: string;
  unidadMedidaNombre: string | null;
  proveedorRuc: string;
  servicioId: number;
  servicioNombre: string;
}
