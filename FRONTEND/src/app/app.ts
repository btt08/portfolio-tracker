import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FileUtilsService } from '@utils/file-utils.service';
import { PortfolioRestService } from '@services/portfolio-rest';
import { IAddItemData } from '@interfaces/add-item.interface';
import { IPortfolio, IPortfolioSummary } from '@interfaces/portfolio.interface';
import { AddItemModal } from '@components/modals/add-item-modal/add-item-modal';
import { SharesTable } from '@components/shares-table/shares-table';
import { PortfolioSummary } from '@components/portfolio-summary/portfolio-summary';
import { UtilsService } from './utils/utils.service';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  imports: [AddItemModal, RouterOutlet, SharesTable, PortfolioSummary],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  private portfolioService = inject(PortfolioRestService);
  private fileUtils = inject(FileUtilsService);
  private utils = inject(UtilsService);
  private autoRefreshSub?: Subscription;

  groupByType = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);
  loadError = signal<string>('');
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
    this.portfolioService.getportfolio().subscribe({
      next: rawData => {
        this.portfolioData.set(rawData.data || this.portfolioData());
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading portfolio:', error);
        this.loadError.set('Failed to load portfolio. Is the backend running?');
        this.isLoading.set(false);
      },
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
      next: rawData => {
        this.portfolioData.set(rawData.data || this.portfolioData());
      },
      error: error => {
        console.error('Error refreshing data:', error);
      },
      complete: () => {
        this.isRefreshing.set(false);
      },
    });
  }

  onPortfolioUpdated(portfolio: IPortfolio): void {
    this.portfolioData.set(portfolio);
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
}
