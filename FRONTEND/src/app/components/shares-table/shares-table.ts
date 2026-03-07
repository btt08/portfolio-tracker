import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IPortfolioItem, IPortfolio, ILot } from '../../interfaces/portfolio.interface';
import { PortfolioRestService } from '../../services/portfolio-rest';

interface NewLotForm {
  createdDate: string;
  qtyRemaining: number | null;
  costPerUnit: number | null;
}

@Component({
  selector: 'app-shares-table',
  imports: [DecimalPipe, DatePipe, FormsModule],
  templateUrl: './shares-table.html',
  styleUrl: './shares-table.scss',
})
export class SharesTable {
  private portfolioService = inject(PortfolioRestService);

  data = input.required<IPortfolioItem[]>();
  portfolioUpdated = output<IPortfolio>();

  expandedItems = signal<Set<string>>(new Set());
  lotForms: Record<string, NewLotForm> = {};
  submitting: Record<string, boolean> = {};

  toggleExpand(isin: string): void {
    const current = new Set(this.expandedItems());
    if (current.has(isin)) {
      current.delete(isin);
    } else {
      current.add(isin);
      if (!this.lotForms[isin]) {
        this.lotForms[isin] = { createdDate: '', qtyRemaining: null, costPerUnit: null };
      }
    }
    this.expandedItems.set(current);
  }

  isExpanded(isin: string): boolean {
    return this.expandedItems().has(isin);
  }

  activeLots(lots: ILot[]): ILot[] {
    return lots.filter(l => l.qtyRemaining > 0);
  }

  lotCurrentValue(lot: ILot, currPrice: number): number {
    return lot.qtyRemaining * currPrice;
  }

  lotPnl(lot: ILot, currPrice: number): number {
    return this.lotCurrentValue(lot, currPrice) - lot.totalCost;
  }

  lotPnlPerc(lot: ILot, currPrice: number): number {
    if (lot.totalCost === 0) return 0;
    return (this.lotPnl(lot, currPrice) / lot.totalCost) * 100;
  }

  computedTotalCost(isin: string): number {
    const form = this.lotForms[isin];
    if (!form?.qtyRemaining || !form?.costPerUnit) return 0;
    return Math.round(form.qtyRemaining * form.costPerUnit * 100) / 100;
  }

  isFormValid(isin: string): boolean {
    const form = this.lotForms[isin];
    return !!(
      form?.createdDate &&
      form?.qtyRemaining &&
      form.qtyRemaining > 0 &&
      form?.costPerUnit &&
      form.costPerUnit > 0
    );
  }

  addLot(item: IPortfolioItem): void {
    const form = this.lotForms[item.isin];
    if (!this.isFormValid(item.isin)) return;

    this.submitting[item.isin] = true;
    const totalCost = this.computedTotalCost(item.isin);
    const createdDate = new Date(form.createdDate).toISOString();
    const existingLots = item.lots.length;

    const newLot: ILot = {
      id: `${item.isin}-${createdDate}-${existingLots}`,
      createdDate,
      qtyRemaining: form.qtyRemaining!,
      costPerUnit: form.costPerUnit!,
      totalCost,
    };

    this.portfolioService.addLot(item.isin, newLot).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
        this.lotForms[item.isin] = {
          createdDate: '',
          qtyRemaining: null,
          costPerUnit: null,
        };
        this.submitting[item.isin] = false;
      },
      error: error => {
        console.error('Error adding lot:', error);
        this.submitting[item.isin] = false;
      },
    });
  }
}
