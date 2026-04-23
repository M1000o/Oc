import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface OrderSummaryDraftAware {
  confirmDiscardDraft(): boolean;
}

export const orderSummaryDraftGuard: CanDeactivateFn<OrderSummaryDraftAware> = (component) => {
  if (component && typeof component.confirmDiscardDraft === 'function') {
    return component.confirmDiscardDraft();
  }
  return true;
};
