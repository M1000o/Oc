import { ServiceId } from "./services.interface";

export interface ProviderOption {
    id: number;
    name: string;
    ruc: string;
    icon: string;
}

export interface ProviderSelection {
    serviceId: ServiceId;
    serviceName: string;
    providerId: number;
    providerName: string;
}