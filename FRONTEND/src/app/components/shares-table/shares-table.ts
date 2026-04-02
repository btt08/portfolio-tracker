import {
  Component,
  inject,
  input,
  output,
  signal,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { IPortfolioItem, IPortfolio, ILot } from '../../interfaces/portfolio.interface';
import { PortfolioRestService } from '../../services/portfolio-rest';
import {
  activeLots,
  lotCostPerUnit,
  lotTotalCost,
  lotCurrentValue,
  lotPnl,
  lotPnlPerc,
} from '../../utils/lot-utils';
import { LotForm } from '../lot-form/lot-form';
import { SellForm } from '../sell-form/sell-form';
import { ISellData } from '../sell-form/interfaces/sell-form.interface';

@Component({
  selector: 'app-shares-table',
  imports: [DatePipe, DecimalPipe, LotForm, SellForm],
  templateUrl: './shares-table.html',
  styleUrl: './shares-table.scss',
})
export class SharesTable {
  private portfolioService = inject(PortfolioRestService);

  @ViewChildren(SellForm) sellFormComponents!: QueryList<SellForm>;

  data = input.required<IPortfolioItem[]>();
  portfolioUpdated = output<IPortfolio>();

  expandedItems = signal<Set<string>>(new Set());
  submitting: Record<string, boolean> = {};
  sellSubmitting: Record<string, boolean> = {};
  sellError: Record<string, string> = {};

  activeLots = activeLots;
  lotCostPerUnit = lotCostPerUnit;
  lotTotalCost = lotTotalCost;
  lotCurrentValue = lotCurrentValue;
  lotPnl = lotPnl;
  lotPnlPerc = lotPnlPerc;

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
        // Reset the sell form
        const sellForm = this.sellFormComponents.find(() => true);
        sellForm?.resetForm();
      },
      error: error => {
        console.error('Error selling shares:', error);
        this.sellError[item.isin] = error.message || 'Error selling shares';
        this.sellSubmitting[item.isin] = false;
      },
    });
  }
}
