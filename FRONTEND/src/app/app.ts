import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { PortfolioRestService } from './services/portfolio-rest';
import { PortfolioMapperService } from './services/portfolio-mapper';
import { IPortfolio, IPortfolioSummary } from './interfaces/portfolio.interface';
import { SharesTable } from './components/shares-table/shares-table';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, RouterOutlet, SharesTable],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  private portfolioService = inject(PortfolioRestService);
  private portfolioMapper = inject(PortfolioMapperService);

  protected readonly title = signal('portfolio-frontend');
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
  ngOnInit() {
    this.portfolioService.getportfolio().subscribe(rawData => {
      const mappedData = this.portfolioMapper.mapRawToPortfolio(rawData.data || []);
      this.portfolioData.set(mappedData);
    });
  }

  formatNumber(value: number): string {
    const formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    console.log(
      `Formatted number: ${formatted} ----> `,
      value >= 0 ? `+${formatted}` : formatted
    );
    return value >= 0 ? `+${formatted}` : formatted;
  }

  refreshData() {
    this.portfolioService.refreshPortfolio().subscribe(rawData => {
      const mappedData = this.portfolioMapper.mapRawToPortfolio(rawData.data || []);
      this.portfolioData.set(mappedData);
    });
  }
}
