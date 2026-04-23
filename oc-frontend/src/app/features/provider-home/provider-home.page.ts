import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-provider-home-page',
  imports: [CommonModule, MatIconModule],
  templateUrl: './provider-home.page.html',
  styleUrl: './provider-home.page.css'
})
export class ProviderHomePage {
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
