import { Injectable } from '@angular/core';
import { ProviderSelection } from '../interfaces/provider-option.interface';
import { UnitOption } from '../../features/portal-home/product-selection-modal.component';

export interface OrderSummaryDraftRow {
  id: number;
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
  deliverySite: string;
  deliveryArea: string;
  notes: string;
  nextRowId: number;
}

@Injectable({ providedIn: 'root' })
export class OrderSummaryDraftService {
  private readonly storageKey = 'oc.portal-home.summary.v1';

  hasDraft(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const draft = window.localStorage.getItem(this.storageKey);
    if (!draft) {
      return false;
    }

    try {
      const data = JSON.parse(draft) as Partial<OrderSummaryDraftState>;
      return Array.isArray(data.rows) && data.rows.length > 0;
    } catch {
      return false;
    }
  }

  save(state: OrderSummaryDraftState): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  load(): Partial<OrderSummaryDraftState> | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Partial<OrderSummaryDraftState>;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }
}
