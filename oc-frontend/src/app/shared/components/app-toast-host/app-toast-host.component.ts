import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppNotificationService } from '../../../core/services/app-notification.service';

@Component({
  selector: 'app-toast-host',
  imports: [CommonModule],
  templateUrl: './app-toast-host.component.html',
  styleUrl: './app-toast-host.component.css'
})
export class AppToastHostComponent {
  protected readonly notificationService = inject(AppNotificationService);
  protected readonly notification = this.notificationService.state;

  protected dismiss(): void {
    this.notificationService.dismiss();
  }
}
