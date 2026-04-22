import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface OrderSummaryDraftAware {
  confirmDiscardDraft(): boolean;
}

export const orderSummaryDraftGuard: CanDeactivateFn<OrderSummaryDraftAware> = (component) => {
  return component.confirmDiscardDraft();
};
