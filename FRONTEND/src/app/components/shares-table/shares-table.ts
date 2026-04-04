import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  viewChildren,
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LotUtilsService } from 'app/utils/lot-utils.service';
import { PortfolioRestService } from '@services/portfolio-rest';
import {
  IPortfolioItem,
  IPortfolio,
  ILot,
  IGroupedPortfolioItem,
} from '@interfaces/portfolio.interface';
import { ISellData } from '@interfaces/sell-form.interface';
import { ITransferData } from '@interfaces/transfer.interface';
import type { TSortKey, TSortDir } from '@appTypes/shares-table.types';
import { LotForm } from '@forms/lot/lot-form';
import { SellForm } from '@forms/sell/sell-form';
import { TransactionModal } from '@modals/transaction-modal/transaction-modal';
import { TransferForm } from '@forms/transfer/transfer-form';
import { UtilsService } from 'app/utils/utils.service';

@Component({
  selector: 'app-shares-table',
  imports: [DatePipe, DecimalPipe, LotForm, SellForm, TransactionModal, TransferForm],
  templateUrl: './shares-table.html',
  styleUrls: ['./shares-table.scss'],
})
export class SharesTable {
  private portfolioService = inject(PortfolioRestService);
  private utils = inject(UtilsService);
  private lotUtils = inject(LotUtilsService);

  sellFormComponents = viewChildren(SellForm);

  data = input.required<IPortfolioItem[]>();
  groupByType = input<boolean>(false);
  portfolioUpdated = output<IPortfolio>();

  expandedItems = signal<Set<string>>(new Set());
  txnModalItem = signal<IPortfolioItem | null>(null);
  sortKey = signal<TSortKey | null>(null);
  sortDir = signal<TSortDir>('asc');

  sortedData = computed(() => {
    const items = [...this.data()];
    const key = this.sortKey();
    if (!key) return items;
    const dir = this.sortDir();
    return items.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  });

  groupedData = computed<IGroupedPortfolioItem[]>(() => {
    const items = this.data();
    const key = this.sortKey();
    const dir = this.sortDir();
    const groups = new Map<string, IGroupedPortfolioItem>();
    for (const item of items) {
      const type = item.type || 'Other';
      if (!groups.has(type)) {
        groups.set(type, {
          type,
          items: [],
          hide: false,
          weight: 0,
          marketValue: 0,
          invested: 0,
          dailyChangeEUR: 0,
          dailyChangePerc: 0,
          totalChangeEUR: 0,
          totalChangePerc: 0,
        });
      }
      const g = groups.get(type)!;
      g.items.push(item);
      g.weight += item.portfolioPerc;
      g.marketValue += item.marketValue;
      g.invested += item.totalInvested;
      g.dailyChangeEUR += item.dailyChangeEUR;
    }
    if (key) {
      for (const g of groups.values()) {
        g.items.sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return dir === 'asc' ? aVal - bVal : bVal - aVal;
          }
          const aStr = String(aVal ?? '');
          const bStr = String(bVal ?? '');
          return dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
    }

    return [...groups.values()].map(g => {
      g.dailyChangeEUR = g.items.reduce((sum, i) => sum + i.dailyChangeEUR, 0);
      g.dailyChangePerc = g.invested ? (g.dailyChangeEUR / g.invested) * 100 : 0;
      g.totalChangeEUR = g.marketValue - g.invested;
      g.totalChangePerc = g.invested ? (g.totalChangeEUR / g.invested) * 100 : 0;
      return g;
    });
  });

  displayGroups = computed<IGroupedPortfolioItem[]>(() => {
    if (this.groupByType()) {
      return this.groupedData();
    }
    return [
      {
        type: '',
        items: this.sortedData(),
        hide: false,
        weight: 0,
        marketValue: 0,
        invested: 0,
        dailyChangeEUR: 0,
        dailyChangePerc: 0,
        totalChangeEUR: 0,
        totalChangePerc: 0,
      },
    ];
  });

  submitting: Record<string, boolean> = {};
  sellSubmitting: Record<string, boolean> = {};
  sellError: Record<string, string> = {};
  transferSubmitting: Record<string, boolean> = {};
  transferError: Record<string, string> = {};

  activeLots = this.lotUtils.activeLots;
  lotCostPerUnit = this.lotUtils.lotCostPerUnit;
  lotTotalCost = this.lotUtils.lotTotalCost;
  lotCurrentValue = this.lotUtils.lotCurrentValue;
  lotPnl = this.lotUtils.lotPnl;
  lotPnlPerc = this.lotUtils.lotPnlPerc;

  toggleSort(key: TSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIndicator(key: TSortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ▲' : ' ▼';
  }

  toggleExpand(isin: string): void {
    const current = new Set(this.expandedItems());
    if (current.has(isin)) {
      current.delete(isin);
    } else {
      current.add(isin);
    }
    this.expandedItems.set(current);
  }

  isExpanded(isin: string): boolean {
    return this.expandedItems().has(isin);
  }

  addLot(item: IPortfolioItem, lot: ILot): void {
    this.submitting[item.isin] = true;
    this.portfolioService.addLot(item.isin, lot).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
        this.submitting[item.isin] = false;
      },
      error: error => {
        console.error('Error adding lot:', error);
        this.submitting[item.isin] = false;
      },
    });
  }

  sellShares(item: IPortfolioItem, sellData: ISellData): void {
    this.sellSubmitting[item.isin] = true;
    this.sellError[item.isin] = '';

    this.portfolioService.sellShares(item.isin, sellData).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
        this.sellSubmitting[item.isin] = false;
        const sellForm = this.sellFormComponents()[0];
        sellForm?.resetForm();
      },
      error: error => {
        console.error('Error selling shares:', error);
        this.sellError[item.isin] = error.message || 'Error selling shares';
        this.sellSubmitting[item.isin] = false;
      },
    });
  }

  deleteItem(item: IPortfolioItem): void {
    if (!confirm(`Delete "${item.name}" (${item.isin})? This cannot be undone.`)) return;
    this.portfolioService.deleteItem(item.isin).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
      },
      error: error => {
        console.error('Error deleting item:', error);
      },
    });
  }

  transferFunds(item: IPortfolioItem, data: ITransferData): void {
    this.transferSubmitting[item.isin] = true;
    this.transferError[item.isin] = '';

    this.portfolioService.transferFunds(item.isin, data).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
        this.transferSubmitting[item.isin] = false;
      },
      error: error => {
        console.error('Error transferring:', error);
        this.transferError[item.isin] = error.message || 'Error transferring funds';
        this.transferSubmitting[item.isin] = false;
      },
    });
  }

  formatNumber(value: number): string {
    return this.utils.formatNumber(value);
  }

  isPositive(value: number): boolean {
    return value > 0;
  }
}
