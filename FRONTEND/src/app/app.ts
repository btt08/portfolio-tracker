import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CurrencyRestService } from '@services/currency-rest';
import { FileUtilsService } from '@utils/file-utils.service';
import { PortfolioRestService } from '@services/portfolio-rest';
import { IAddItemData } from '@interfaces/add-item.interface';
import { ICurrency } from './interfaces/currency.interface';
import {
  IPortfolio,
  IPortfolioItem,
  IPortfolioSummary,
} from '@interfaces/portfolio.interface';
import { AddItemModal } from '@components/modals/add-item-modal/add-item-modal';
import { Modal } from './components/modals/modal/modal';
import { PortfolioSummary } from '@components/portfolio-summary/portfolio-summary';
import { SharesTable } from '@components/shares-table/shares-table';
import { UtilsService } from './utils/utils.service';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  imports: [AddItemModal, Modal, PortfolioSummary, SharesTable, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  private currencyService = inject(CurrencyRestService);
  private portfolioService = inject(PortfolioRestService);
  private fileUtils = inject(FileUtilsService);
  private utils = inject(UtilsService);
  private autoRefreshSub?: Subscription;

  currencyData = signal<ICurrency[]>([]);
  excludedItems = computed<IPortfolioItem[]>(() => this.filterExcludedItems());
  groupByType = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);
  isReorderMode = signal<boolean>(false);
  loadError = signal<string>('');
  pendingOrder = signal<string[]>([]);
  portfolioData = signal<IPortfolio>({
    items: [],
    summary: {
      portfolioMarketValue: 0,
      portfolioChangeEUR: 0,
      portfolioChangePerc: 0,
      portfolioDailyChangeEUR: 0,
      portfolioDailyChangePerc: 0,
    } as IPortfolioSummary,
  });
  showAddModal = signal<boolean>(false);
  summaryExpanded = signal<boolean>(false);
  title = signal<string>('My Portfolio');

  ngOnInit() {
    this.portfolioService.getPortfolio().subscribe({
      next: rawData => this.portfolioData.set(rawData || this.portfolioData()),
      error: error => this.loadError.set('Failed to load portfolio: ' + error.message),
      complete: () => this.isLoading.set(false),
    });

    this.currencyService.getCurrencies().subscribe({
      next: data => this.currencyData.set(data),
      error: error => this.loadError.set('Failed to load currencies: ' + error.message),
    });

    this.autoRefreshSub = interval(AUTO_REFRESH_INTERVAL_MS).subscribe(() => {
      if (!this.isRefreshing()) {
        this.refreshData();
      }
    });
  }

  ngOnDestroy() {
    this.autoRefreshSub?.unsubscribe();
  }

  formatNumber(value: number): string {
    return this.utils.formatNumber(value);
  }

  refreshData() {
    this.isRefreshing.set(true);
    this.loadError.set('');
    this.portfolioService.refreshPortfolio().subscribe({
      next: rawData => this.portfolioData.set(rawData || this.portfolioData()),
      error: error => this.loadError.set('Failed to refresh data: ' + error.message),
      complete: () => this.isRefreshing.set(false),
    });
  }

  onPortfolioUpdated(portfolio: IPortfolio): void {
    this.portfolioData.set(portfolio);
    this.isReorderMode.set(false);
    this.pendingOrder.set([]);
  }

  toggleGroupByType(): void {
    const nextValue = !this.groupByType();
    this.groupByType.set(nextValue);

    if (nextValue) {
      this.isReorderMode.set(false);
      this.pendingOrder.set([]);
    }
  }

  startReorderMode(): void {
    if (this.groupByType()) return;
    this.isReorderMode.set(true);
    this.pendingOrder.set(this.portfolioData().items.map(item => item.isin));
  }

  cancelReorderMode(): void {
    this.isReorderMode.set(false);
    this.pendingOrder.set([]);
  }

  onReorderDraftChanged(isins: string[]): void {
    this.pendingOrder.set(isins);
  }

  saveOrder(): void {
    const draftOrder = this.pendingOrder();
    const fallbackOrder = this.portfolioData().items.map(item => item.isin);
    const isins = draftOrder.length ? draftOrder : fallbackOrder;

    this.portfolioService.reorderPortfolio(isins).subscribe({
      next: response => {
        this.portfolioData.set(response.data);
        this.isReorderMode.set(false);
        this.pendingOrder.set([]);
      },
      error: error => {
        console.error('Error saving portfolio order:', error);
      },
    });
  }

  addItem(data: IAddItemData): void {
    this.portfolioService.addPortfolioItem(data).subscribe({
      next: response => {
        this.portfolioData.set(response.data);
        this.showAddModal.set(false);
      },
      error: error => {
        console.error('Error adding item:', error);
      },
    });
  }

  exportCsv(): void {
    this.fileUtils.exportCsv(this.portfolioData().items);
  }

  exportJson(): void {
    this.fileUtils.exportJson();
  }

  importJson(): void {
    this.fileUtils.importJson().subscribe({
      next: response => {
        this.portfolioData.set(response.data);
      },
      error: error => {
        console.error('Error importing portfolio:', error);
        alert('Import failed. Check console for details.');
      },
    });
  }

  private filterExcludedItems(): IPortfolioItem[] {
    return this.portfolioData().items.filter(item => item.isExcluded);
  }
}
