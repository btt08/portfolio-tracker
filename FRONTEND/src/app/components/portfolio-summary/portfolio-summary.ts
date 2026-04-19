import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Button } from '../buttons/button/button';
import { IPortfolioItem, IPortfolioSummary } from 'app/interfaces/portfolio.interface';
import { UtilsService } from 'app/utils/utils.service';

@Component({
  selector: 'app-portfolio-summary',
  imports: [Button, DecimalPipe],
  templateUrl: './portfolio-summary.html',
  styleUrls: ['./portfolio-summary.scss'],
})
export class PortfolioSummary {
  private utils = inject(UtilsService);

  excludedItems = input<IPortfolioItem[]>([]);
  isRefreshing = input<boolean>(false);
  summary = input.required<IPortfolioSummary>();
  onAddItem = output<void>();
  onRefreshData = output<void>();

  summaryExpanded = signal<boolean>(false);

  formatNumber(value: number): string {
    return this.utils.formatNumber(value);
  }

  calcTotalInvestedValue(): number {
    const excludedItems = this.excludedItems();
    const investedValue = this.summary().portfolioInvested;
    const excludedValue = excludedItems.reduce(
      (acc, item) => acc + item.totalInvested,
      0
    );
    return investedValue + excludedValue;
  }

  calcTotalMarketValue(): number {
    const excludedItems = this.excludedItems();
    const marketValue = this.summary().portfolioMarketValue;
    const excludedValue = excludedItems.reduce((acc, item) => acc + item.marketValue, 0);
    return marketValue + excludedValue;
  }

  addItem() {
    this.onAddItem.emit();
  }

  refreshData() {
    this.onRefreshData.emit();
  }
}
