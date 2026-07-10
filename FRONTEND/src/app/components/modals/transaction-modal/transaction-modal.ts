import { Component, inject, input, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import {
  IPortfolioId,
  ITransaction,
  ITransferBreakdown,
} from '@interfaces/portfolio.interface';
import { PortfolioRestService } from 'app/services/portfolio-rest';

@Component({
  selector: 'app-transaction-modal',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './transaction-modal.html',
  styleUrls: ['./transaction-modal.scss'],
})
export class TransactionModal {
  private portfolioService = inject(PortfolioRestService);

  showName = input<boolean>(false);
  transactions = input.required<ITransaction[]>();

  expandedTxn = signal<string | null>(null);
  portfolioIds = signal<IPortfolioId[]>([]);

  ngOnInit(): void {
    this.portfolioService.getPortfolioIds().subscribe({
      next: ids => this.portfolioIds.set(ids),
      error: err => console.error('Error fetching portfolio IDs', err),
    });
  }

  expandTxn(txn: ITransaction): void {
    this.expandedTxn.set(this.expandedTxn() === txn.id ? null : txn.id);
  }

  formatType(type: string): string {
    if (this.showName()) {
      return type.split('_')[0];
    }
    return type.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  getTooltipByType(txn: ITransaction): string {
    if (this.showName()) {
      return '';
    }

    switch (txn.type) {
      case 'transfer_in':
        return `From ${this.getSourceName(txn)}`;
      case 'transfer_out':
        return `To ${this.getDestinationName(txn)}`;
      default:
        return '';
    }
  }

  getType(type: string): string {
    if (this.showName()) {
      return type.split('_')[0];
    }
    return type;
  }

  getDestinationName(txn: ITransaction): string {
    const isTransferOut = txn.type === 'transfer_out';
    const isin = isTransferOut ? txn.counterpartyIsin : txn.id.split('-')[0];

    const destination = this.portfolioIds().find(item => item.isin === isin);
    return destination ? destination.name : (isin ?? '');
  }

  getSourceName(txn: ITransaction): string {
    const breakdown = txn.transferBreakdown?.[0] as ITransferBreakdown;
    if (!breakdown) {
      return '';
    }
    const originIsin = breakdown.sourceLotId.split('-')[0];
    const origin = this.portfolioIds().find(item => item.isin === originIsin);
    return origin ? origin.name : originIsin;
  }

  hasTransferDetails(txn: ITransaction): boolean {
    return (
      this.isTransfer(txn) &&
      (!!txn.transferBreakdown?.length ||
        txn.operationAmount !== undefined ||
        txn.operationPPU !== undefined)
    );
  }

  private isTransfer(txn: ITransaction): boolean {
    return txn.type === 'transfer_in' || txn.type === 'transfer_out';
  }
}
