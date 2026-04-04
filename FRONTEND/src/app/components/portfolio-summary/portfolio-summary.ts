import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Button } from '../button/button';
import { IPortfolioSummary } from 'app/interfaces/portfolio.interface';
import { UtilsService } from 'app/utils/utils.service';

@Component({
  selector: 'app-portfolio-summary',
  imports: [Button, DecimalPipe],
  templateUrl: './portfolio-summary.html',
  styleUrls: ['./portfolio-summary.scss'],
})
export class PortfolioSummary {
  private utils = inject(UtilsService);
  isRefreshing = input<boolean>(false);
  summary = input.required<IPortfolioSummary>();
  onAddItem = output<void>();
  onRefreshData = output<void>();

  summaryExpanded = signal<boolean>(false);

  formatNumber(value: number): string {
    return this.utils.formatNumber(value);
  }

  addItem() {
    this.onAddItem.emit();
  }

  refreshData() {
    this.onRefreshData.emit();
  }
}
