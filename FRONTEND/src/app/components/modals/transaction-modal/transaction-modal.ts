import { Component, input } from '@angular/core';
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

  isTransfer(txn: ITransaction): boolean {
    return txn.type === 'transfer_in' || txn.type === 'transfer_out';
  }

  hasTransferDetails(txn: ITransaction): boolean {
    return (
      this.isTransfer(txn) &&
      (!!txn.transferBreakdown?.length ||
        txn.operationAmount !== undefined ||
        txn.operationPPU !== undefined)
    );
  }
}
