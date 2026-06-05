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
    return type.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  getTooltipByType(txn: ITransaction): string {
    switch (txn.type) {
      case 'transfer_in':
        const breakdown = txn.transferBreakdown?.[0] as ITransferBreakdown;
        return 'From ' + this.getSourceName(breakdown);
      case 'transfer_out':
        return 'To ' + this.getDestinationName(txn.counterpartyIsin);
      default:
        return '';
    }
  }

  getDestinationName(counterPartyIsin: string | undefined): string {
    const destinationIsin = counterPartyIsin || '';
    const destination = this.portfolioIds().find(item => item.isin === destinationIsin);
    return destination ? destination.name : destinationIsin;
  }

  getSourceName(txn: ITransferBreakdown): string {
    const originIsin = txn.sourceLotId.split('-')[0];
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
