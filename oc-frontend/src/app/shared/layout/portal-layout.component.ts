import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PortalFooterComponent } from './portal-footer.component';
import { PortalHeaderComponent } from './portal-header.component';
import { PortalSidebarComponent } from './portal-sidebar.component';

@Component({
  selector: 'app-portal-layout',
  imports: [
    CommonModule,
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
    this.logoutRequest.emit();
  }
}