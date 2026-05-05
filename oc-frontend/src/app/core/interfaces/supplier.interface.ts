import { AccountType } from "./account-type.type";

export interface SupplierFormPayload {
    ruc: string;
    razon_social: string;
    services: number[];
    nombre_contacto: string;
    apellido_p_contacto: string;
    apellido_m_contacto: string;
    telefono_contacto: string;
    correo_pedidos: string;
    bank: number | null;
    accountType: AccountType;
    accountNumber_Soles: string;
    cci_soles: string;
    accountNumber_Dolares: string;
    cci_dolares: string;
    is_detraccion: boolean;
    accountNumber_Detraccion: string;
    correo_constancia: string | null;
    creditDays: number;
}

export interface SupplierResponse {
    id: number;
    razon_social: string;
    ruc: string;
}