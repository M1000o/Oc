import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppToastHostComponent } from '../components/app-toast-host/app-toast-host.component';
import { PortalSidebarComponent } from './sidebar/portal-sidebar.component';
import { PortalHeaderComponent } from './header/portal-header.component';
import { PortalFooterComponent } from './footer/portal-footer.component';

@Component({
  selector: 'app-portal-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    AppToastHostComponent,
    PortalSidebarComponent,
    PortalHeaderComponent,
    PortalFooterComponent
  ],
  templateUrl: './portal-layout.component.html',
  styleUrl: './portal-layout.component.css'
})
export class PortalLayoutComponent {
  @Input({ required: true }) title = '';
  @Output() logoutRequest = new EventEmitter<void>();
  private readonly authService = inject(AuthService);

  protected sidebarVisible = true;
  protected readonly currentYear = new Date().getFullYear();
 
  protected toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  protected closeSidebar(): void {
    this.sidebarVisible = false;
  }

  protected handleNavigationClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 1000) {
      this.sidebarVisible = false;
    }
  }

  protected onLogoutClick(): void {
    this.authService.logout();
  }
}