import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { PortfolioRestService } from './services/portfolio-rest';
import { IPortfolio, IPortfolioSummary } from './interfaces/portfolio.interface';
import { SharesTable } from './components/shares-table/shares-table';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, RouterOutlet, SharesTable],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  private portfolioService = inject(PortfolioRestService);
  private autoRefreshSub?: Subscription;

  protected readonly title = signal('Portfolio tracker');
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
  isRefreshing = signal<boolean>(false);

  ngOnInit() {
    this.portfolioService.getportfolio().subscribe({
      next: rawData => {
        this.portfolioData.set(rawData.data || this.portfolioData());
      },
      error: error => {
        console.error('Error loading portfolio:', error);
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
    const formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return value >= 0 ? `+${formatted}` : formatted;
  }

  refreshData() {
    this.isRefreshing.set(true);
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
}
