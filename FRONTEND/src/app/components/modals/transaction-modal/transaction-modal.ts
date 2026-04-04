import { Component, input, output } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ITransaction } from '@interfaces/portfolio.interface';

@Component({
  selector: 'app-transaction-modal',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './transaction-modal.html',
  styleUrls: ['./transaction-modal.scss'],
})
export class TransactionModal {
  itemName = input.required<string>();
  transactions = input.required<ITransaction[]>();
  close = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  formatType(type: string): string {
    return type.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
}
