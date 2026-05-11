import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppNotificationService } from '../../core/services/app-notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { AppToastHostComponent } from '../../shared/components/app-toast-host/app-toast-host.component';

@Component({
  selector: 'app-set-password-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AppToastHostComponent],
  templateUrl: './set-password.page.html',
  styleUrl: './set-password.page.css'
})
export class SetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(AppNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private statusTimerId: number | null = null;

  private static readonly SUCCESS_FEEDBACK_MS = 2200;
  private static readonly ERROR_FEEDBACK_MS = 4500;

  protected readonly submitAttempted = signal(false);
  protected readonly resendAttempted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isResending = signal(false);

  protected readonly token = computed(() => this.route.snapshot.queryParamMap.get('token') ?? '');

  protected readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  protected readonly resendForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearStatusTimer());
  }

  protected submitPassword(): void {
    this.submitAttempted.set(true);
    this.clearStatusTimer();
    this.notificationService.dismiss();

    if (!this.token()) {
      this.showError(
        'No encontramos un token en la URL. Abre el enlace del correo de activacion o solicita un reenvio.'
      );
      return;
    }

    if (this.passwordForm.invalid || this.passwordsDoNotMatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { newPassword } = this.passwordForm.getRawValue();
    this.isSubmitting.set(true);
    this.authService
      .setPassword(this.token(), newPassword)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.passwordForm.reset();
          this.showSuccessAndRedirect(
            response.message ?? 'Contrasena establecida y cuenta activada correctamente.'
          );
        },
        error: (error) => {
          const errorBody = error?.error;
          let message = '';
          
          if (errorBody?.errors && typeof errorBody.errors === 'object') {
            message = Object.values(errorBody.errors).join('\n');
          }
          
          if (!message) {
            message = errorBody?.message || 'No se pudo establecer la contraseña. Intente nuevamente.';
          }
          this.showError(message);
        }
      });
  }

  protected resendActivation(): void {
    this.resendAttempted.set(true);
    this.clearStatusTimer();
    this.notificationService.dismiss();

    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isResending.set(true);
    this.authService
      .resendActivation(this.resendForm.getRawValue().email.trim())
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: (response) =>
          this.showSuccess(response.message ?? 'Se envio un nuevo token de activacion.'),
        error: (error) => {
          const errorBody = error?.error;
          let message = '';
          
          if (errorBody?.errors && typeof errorBody.errors === 'object') {
            message = Object.values(errorBody.errors).join('\n');
          }
          
          if (!message) {
            message = errorBody?.message || 'No se pudo reenviar el token de activacion.';
          }
          this.showError(message);
        }
      });
  }

  protected hasPasswordError(
    controlName: 'newPassword' | 'confirmPassword',
    errorCode?: string
  ): boolean {
    const control = this.passwordForm.controls[controlName];
    const shouldShow = control.touched || this.submitAttempted();

    if (!shouldShow) {
      return false;
    }

    return errorCode ? !!control.errors?.[errorCode] : control.invalid;
  }

  protected hasResendError(errorCode?: string): boolean {
    const control = this.resendForm.controls.email;
    const shouldShow = control.touched || this.resendAttempted();

    if (!shouldShow) {
      return false;
    }

    return errorCode ? !!control.errors?.[errorCode] : control.invalid;
  }

  protected passwordsDoNotMatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return !!newPassword && !!confirmPassword && newPassword !== confirmPassword;
  }

  private showSuccessAndRedirect(message: string): void {
    this.notificationService.success(message, SetPasswordPage.SUCCESS_FEEDBACK_MS);
    this.statusTimerId = window.setTimeout(() => {
      this.notificationService.dismiss();
      this.router.navigate(['/login']);
    }, SetPasswordPage.SUCCESS_FEEDBACK_MS);
  }

  private showSuccess(message: string): void {
    this.notificationService.success(message, SetPasswordPage.SUCCESS_FEEDBACK_MS);
  }

  private showError(message: string): void {
    this.notificationService.error(message, SetPasswordPage.ERROR_FEEDBACK_MS);
  }

  private clearStatusTimer(): void {
    if (this.statusTimerId !== null) {
      window.clearTimeout(this.statusTimerId);
      this.statusTimerId = null;
    }
  }
}
