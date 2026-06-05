import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  output,
  viewChildren,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { PortfolioRestService } from '@services/portfolio-rest';
import { PortfolioUtilsService } from 'app/utils/portfolio.utils';
import { ICurrency } from 'app/interfaces/currency.interface';
import {
  IGroupedPortfolioItem,
  ILot,
  IPortfolioItem,
  IPortfolio,
} from '@interfaces/portfolio.interface';
import { ISellData } from '@interfaces/sell-form.interface';
import { ITransferData } from '@interfaces/transfer.interface';
import type { TSortKey, TSortDir } from '@appTypes/shares-table.types';
import { Button } from '../buttons/button/button';
import { GroupHeader } from './components/group-header/group-header';
import { ItemRow } from './components/item-row-data/item-row';
import { LotForm } from '../forms/lot/lot-form';
import { LotTable } from './components/lot-table/lot-table';
import { Modal } from '../modals/modal/modal';
import { SellForm } from '@forms/sell/sell-form';
import { TransactionModal } from '@modals/transaction-modal/transaction-modal';
import { TransferForm } from '@forms/transfer/transfer-form';

@Component({
  selector: 'app-shares-table',
  imports: [
    Button,
    CdkDrag,
    CdkDropList,
    GroupHeader,
    ItemRow,
    LotForm,
    LotTable,
    Modal,
    SellForm,
    TransactionModal,
    TransferForm,
  ],
  templateUrl: './shares-table.html',
  styleUrls: ['./shares-table.scss'],
})
export class SharesTable {
  private portfolioService = inject(PortfolioRestService);
  private portfolioUtils = inject(PortfolioUtilsService);
  private groupCollapseInitialized = signal<boolean>(false);

  sellFormComponents = viewChildren(SellForm);

  currencyData = input.required<ICurrency[]>();
  data = input.required<IPortfolioItem[]>();
  groupByType = input<boolean>(false);
  isReorderMode = input<boolean>(false);
  onAddItem = output<void>();
  portfolioUpdated = output<IPortfolio>();
  reorderDraftChanged = output<string[]>();

  addModalItem = signal<IPortfolioItem | null>(null);
  collapsedGroups = signal<Set<string>>(new Set());
  expandedItems = signal<Set<string>>(new Set());
  reorderDraft = signal<IPortfolioItem[]>([]);
  sortDir = signal<TSortDir>('asc');
  sortKey = signal<TSortKey | null>(null);
  transferModalItem = signal<IPortfolioItem | null>(null);
  txnModalItem = signal<IPortfolioItem | null>(null);

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
    return this.portfolioUtils.mapItemsToGroups(items, key, dir);
  });

  displayGroups = computed<IGroupedPortfolioItem[]>(() => {
    if (this.groupByType()) {
      return this.groupedData().map(group => ({
        ...group,
        hide: this.collapsedGroups().has(group.type),
      }));
    }

    if (this.isReorderMode()) {
      return [
        this.portfolioUtils.getDefaultGroupedPortfolioItem('', this.reorderDraft()),
      ];
    }

    return [this.portfolioUtils.getDefaultGroupedPortfolioItem('', this.sortedData())];
  });

  submitting: Record<string, boolean> = {};
  sellSubmitting: Record<string, boolean> = {};
  sellError: Record<string, string> = {};
  transferSubmitting: Record<string, boolean> = {};
  transferError: Record<string, string> = {};

  constructor() {
    effect(() => {
      const groups = this.groupedData();
      if (this.groupCollapseInitialized() || groups.length === 0) {
        return;
      }

      this.collapsedGroups.set(new Set(groups.map(group => group.type)));
      this.groupCollapseInitialized.set(true);
    });

    effect(() => {
      const items = this.data();

      if (!this.isReorderMode()) {
        this.reorderDraft.set([]);
        return;
      }

      this.sortKey.set(null);
      this.reorderDraft.set([...items]);
      this.reorderDraftChanged.emit(items.map(item => item.isin));
    });
  }

  toggleSort(key: TSortKey): void {
    if (this.isReorderMode()) {
      return;
    }

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

  toggleGroupVisibility(type: string): void {
    const collapsedGroups = new Set(this.collapsedGroups());
    collapsedGroups.has(type) ? collapsedGroups.delete(type) : collapsedGroups.add(type);
    this.collapsedGroups.set(collapsedGroups);
  }

  isGroupCollapsed(type: string): boolean {
    return this.collapsedGroups().has(type);
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
        console.log('Transfer successful, form reset');
      },
      error: error => {
        console.error('Error transferring:', error);
        this.transferError[item.isin] = error.message || 'Error transferring funds';
        this.transferSubmitting[item.isin] = false;
      },
    });
  }

  deleteLot(isin: string, lot: ILot): void {
    if (!confirm(`Delete lot? This cannot be undone.`)) return;
    this.portfolioService.deleteLot(isin, lot.id).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
      },
      error: error => {
        console.error('Error deleting lot:', error);
      },
    });
  }

  onDrop(event: CdkDragDrop<IPortfolioItem[]>): void {
    if (!this.isReorderMode() || this.groupByType()) {
      return;
    }

    const nextOrder = [...this.reorderDraft()];
    moveItemInArray(nextOrder, event.previousIndex, event.currentIndex);
    this.reorderDraft.set(nextOrder);
    this.reorderDraftChanged.emit(nextOrder.map(item => item.isin));
  }
}
