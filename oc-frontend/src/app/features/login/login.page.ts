import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected submit(): void {
    this.submitAttempted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    const redirectTo =
      this.route.snapshot.queryParamMap.get('redirectTo') || this.authService.getDefaultPortalRoute();

    this.isSubmitting.set(true);
    this.authService
      .login(username.trim(), password)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(redirectTo),
        error: (error) => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'No se pudo iniciar sesion. Verifique sus credenciales.';
          this.errorMessage.set(message);
        }
      });
  }

  protected hasError(controlName: 'username' | 'password', errorCode?: string): boolean {
    const control = this.form.controls[controlName];
    const shouldShow = control.touched || this.submitAttempted();

    if (!shouldShow) {
      return false;
    }

    return errorCode ? !!control.errors?.[errorCode] : control.invalid;
  }
}
