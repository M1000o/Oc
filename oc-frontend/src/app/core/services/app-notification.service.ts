import { Injectable, signal } from '@angular/core';

export type AppNotificationKind = 'success' | 'error';

export interface AppNotificationState {
  kind: AppNotificationKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private timeoutId: number | null = null;

  protected readonly stateSignal = signal<AppNotificationState | null>(null);

  readonly state = this.stateSignal.asReadonly();

  success(message: string, durationMs = 2200): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = 4500): void {
    this.show('error', message, durationMs);
  }

  show(kind: AppNotificationKind, message: string, durationMs = 4200): void {
    this.clearTimeout();
    this.stateSignal.set({ kind, message });

    if (durationMs > 0) {
      this.timeoutId = window.setTimeout(() => {
        this.dismiss();
      }, durationMs);
    }
  }

  dismiss(): void {
    this.clearTimeout();
    this.stateSignal.set(null);
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
