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
  transactions = input.required<ITransaction[]>();

  formatType(type: string): string {
    return type.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
}
