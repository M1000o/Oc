import { UnitOption } from "../../features/portal-home/portal-selection-modal/product-selection-modal.component";
import { ProviderSelection } from "./provider-option.interface";

export interface OrderSummaryDraftRow {
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

export interface OrderSummaryDraftState {
  rows: OrderSummaryDraftRow[];
  summaryProviderSelection: ProviderSelection | null;
  dispatchDate: string;
  deliverySiteId: number;
  deliverySite: string;
  deliveryAreaId: number;
  deliveryArea: string;
  notes: string;
  nextRowId: number;
}
