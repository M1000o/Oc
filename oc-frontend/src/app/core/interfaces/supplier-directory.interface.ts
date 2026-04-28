export type SupplierDirectoryStatus = 'ACTIVO' | 'REVISION' | 'INACTIVO';

export interface SupplierDirectoryItem {
  id: number;
  razonSocial: string;
  ruc: string;
  contactoNombre: string | null;
  contactoEmail: string | null;
  contactoTelefono: string | null;
  categorias: string[];
  totalProductos: number;
  estado: SupplierDirectoryStatus;
}

export interface SupplierDirectoryDetail {
  id: number;
  razonSocial: string;
  ruc: string;
  diasCredito: number | null;
  diasCreditoLabel: string;
  tieneCuentaDetraccion: boolean;
  cuentaDetraccion: string | null;
  correoConstancias: string | null;
  contactoNombre: string | null;
  contactoEmail: string | null;
  contactoTelefono: string | null;
  categorias: string[];
  totalProductos: number;
  estado: SupplierDirectoryStatus;
  fechaRegistro: string | null;
}
