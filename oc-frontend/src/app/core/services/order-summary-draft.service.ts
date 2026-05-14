import { Injectable } from '@angular/core';
import { OrderSummaryDraftState } from '../interfaces/order-summary.interface';

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
