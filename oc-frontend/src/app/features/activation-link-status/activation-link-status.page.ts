import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type LinkReason = 'used' | 'expired' | 'invalid';

@Component({
  selector: 'app-activation-link-status-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './activation-link-status.page.html',
  styleUrl: './activation-link-status.page.css'
})
export class ActivationLinkStatusPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly reason = computed<LinkReason>(() => {
    const value = this.route.snapshot.queryParamMap.get('reason') ?? '';
    if (value === 'used' || value === 'expired' || value === 'invalid') {
      return value;
    }
    return 'invalid';
  });

  protected readonly backendMessage = computed(() =>
    this.route.snapshot.queryParamMap.get('message') ?? ''
  );

  protected readonly title = computed(() => {
    switch (this.reason()) {
      case 'used':
        return 'Este enlace ya fue usado';
      case 'expired':
        return 'Este enlace ya caduco';
      default:
        return 'El enlace no es valido';
    }
  });

  protected readonly description = computed(() => {
    switch (this.reason()) {
      case 'used':
        return 'Tu cuenta ya fue activada con este enlace. Ahora puedes iniciar sesion con tu usuario y contraseña.';
      case 'expired':
        return 'El tiempo de validez del enlace termino. Solicita un nuevo token de activacion para continuar.';
      default:
        return 'No pudimos validar este enlace de activacion. Solicita uno nuevo e intenta nuevamente.';
    }
  });
}
