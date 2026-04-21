import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { PortalLayoutComponent } from '../../shared/layout/portal-layout.component';
import { ServiceProviderModalComponent } from './service-provider-modal.component';
import { ProviderSelection } from '../../core/interfaces/provider-option.interface';

type UnitOption = 'UN' | 'PAQ' | 'CJ';

interface OrderRow {
  id: number;
  code: string;
  description: string;
  unit: UnitOption | '';
  quantity: number;
}

@Component({
  selector: 'app-portal-home-page',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    PortalLayoutComponent,
    ServiceProviderModalComponent
  ],
  templateUrl: './portal-home.page.html',
  styleUrl: './portal-home.page.css'
})
export class PortalHomePage {
  private readonly authService = inject(AuthService);
  private nextRowId = 1;
  private statusTimeoutId?: number;

  protected readonly unitOptions: UnitOption[] = ['UN', 'PAQ', 'CJ'];
  protected orderDate = this.toDateInputValue(new Date());
  protected dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
  protected notes = '';
  protected statusMessage = '';
  protected statusKind: 'success' | 'error' | '' = '';
  protected showServiceProviderModal = false;
  protected rows: OrderRow[] = [this.createRow(), this.createRow()];

  protected logout(): void {
    this.authService.logout();
  }

  protected addRow(): void {
    this.rows = [...this.rows, this.createRow()];
  }

  protected openServiceProviderModal(): void {
    this.showServiceProviderModal = true;
  }

  protected closeServiceProviderModal(): void {
    this.showServiceProviderModal = false;
  }

  protected onProviderSelected(selection: ProviderSelection): void {
    this.showServiceProviderModal = false;
    this.showStatus('success', `Proveedor seleccionado: ${selection.providerName}.`);
  }

  protected removeRow(rowId: number): void {
    if (this.rows.length === 1) {
      this.showStatus('error', 'Debe existir al menos un item en el pedido.');
      return;
    }

    this.rows = this.rows.filter((row) => row.id !== rowId);
  }

  protected resetOrder(): void {
    this.orderDate = this.toDateInputValue(new Date());
    this.dispatchDate = this.toDateInputValue(this.addDays(new Date(), 2));
    this.notes = '';
    this.rows = [this.createRow(), this.createRow()];
    this.clearStatus();
  }

  protected saveOrder(): void {
    const validRows = this.rows.filter(
      (row) => row.description.trim().length > 0 && row.quantity > 0
    );

    if (!validRows.length) {
      this.showStatus(
        'error',
        'Agrega al menos una fila con denominacion y cantidad mayor a cero antes de guardar.'
      );
      return;
    }

    this.showStatus('success', `Pedido guardado con ${validRows.length} item(s).`);
  }

  private createRow(): OrderRow {
    const row: OrderRow = {
      id: this.nextRowId,
      code: '',
      description: '',
      unit: '',
      quantity: 0
    };

    this.nextRowId += 1;
    return row;
  }

  private addDays(baseDate: Date, days: number): Date {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showStatus(kind: 'success' | 'error', message: string): void {
    this.statusKind = kind;
    this.statusMessage = message;

    if (this.statusTimeoutId) {
      window.clearTimeout(this.statusTimeoutId);
    }

    this.statusTimeoutId = window.setTimeout(() => {
      this.clearStatus();
    }, 4200);
  }

  private clearStatus(): void {
    this.statusKind = '';
    this.statusMessage = '';
  }
}
