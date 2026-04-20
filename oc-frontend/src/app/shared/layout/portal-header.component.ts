import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-portal-header',
  imports: [MatIconModule],
  templateUrl: './portal-header.component.html',
  styleUrl: './portal-header.component.css'
})
export class PortalHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() sidebarVisible = true;
  @Output() toggleSidebarRequest = new EventEmitter<void>();

  protected onToggleSidebarClick(): void {
    this.toggleSidebarRequest.emit();
  }
}