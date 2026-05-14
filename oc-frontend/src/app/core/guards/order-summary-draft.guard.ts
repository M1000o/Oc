import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface OrderSummaryDraftAware {
  confirmDiscardDraft(): Observable<boolean> | Promise<boolean> | boolean;
}

export const orderSummaryDraftGuard: CanDeactivateFn<OrderSummaryDraftAware> = (component) => {
  if (component && typeof component.confirmDiscardDraft === 'function') {
    return component.confirmDiscardDraft();
  }
  return true;
};
