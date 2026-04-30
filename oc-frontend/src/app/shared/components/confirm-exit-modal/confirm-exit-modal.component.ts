import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-exit-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './confirm-exit-modal.component.html',
  styleUrl: './confirm-exit-modal.component.css',
})
export class ConfirmExitModalComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmExitModalComponent>);

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onConfirm(): void {
    this.dialogRef.close(true);
  }
}
