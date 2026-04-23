export interface ProductResponse {
  id: number;
  codigo_producto: string;
  nombre: string;
  precio: number | string;
  proveedorId: number;
  und_medida: string;
  proveedorRuc: string;
  servicioId: number;
  servicioNombre: string;
}
