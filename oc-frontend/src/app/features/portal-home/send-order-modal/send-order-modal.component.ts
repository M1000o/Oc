import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Output, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface SendOrderModalSubmitPayload {
  recipientEmail: string;
  emailSubject: string;
  emailMessage: string;
}

export interface SendOrderModalPreviewPayload {
  attachmentName: string;
}

@Component({
  selector: 'app-send-order-modal',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './send-order-modal.component.html',
  styleUrl: './send-order-modal.component.css'
})
export class SendOrderModalComponent {
  readonly recipientEmail = input('');
  readonly emailSubject = input('');
  readonly emailMessage = input('');
  readonly attachmentName = input('');
  readonly isLoadingRecipientEmail = input(false);
  readonly isSubmitting = input(false);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() sendRequest = new EventEmitter<SendOrderModalSubmitPayload>();
  @Output() previewRequest = new EventEmitter<SendOrderModalPreviewPayload>();

  protected draftRecipientEmail = '';
  protected draftEmailSubject = '';
  protected draftEmailMessage = '';

  constructor() {
    effect(() => {
      this.draftRecipientEmail = this.recipientEmail();
      this.draftEmailSubject = this.emailSubject();
      this.draftEmailMessage = this.emailMessage();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.sendRequest.emit({
      recipientEmail: this.draftRecipientEmail.trim(),
      emailSubject: this.draftEmailSubject.trim(),
      emailMessage: this.draftEmailMessage.trim()
    });
  }

  protected previewAttachment(): void {
    this.previewRequest.emit({
      attachmentName: this.attachmentName().trim()
    });
  }
}
