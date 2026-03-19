import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { IPortfolioItem, IPortfolio, ILot } from '../../interfaces/portfolio.interface';
import { PortfolioRestService } from '../../services/portfolio-rest';

interface NewLotForm {
  createdDate: string;
  qtyRemaining: number | null;
  costPerUnit: number | null;
  commission: number | null;
  currency: string;
  exchangeRate: number | null;
}

@Component({
  selector: 'app-shares-table',
  imports: [DatePipe, DecimalPipe],
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
        this.lotForms[isin] = {
          createdDate: '',
          qtyRemaining: null,
          costPerUnit: null,
          commission: null,
          currency: 'EUR',
          exchangeRate: 1,
        };
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

  lotExchangeRate(lot: ILot): number {
    return lot.exchangeRate ?? 1;
  }

  lotCostPerUnit(lot: ILot): number {
    return lot.costPerUnit * this.lotExchangeRate(lot);
  }

  lotTotalCost(lot: ILot): number {
    return lot.totalCost * this.lotExchangeRate(lot);
  }

  lotCurrentValue(lot: ILot, currPrice: number): number {
    return lot.qtyRemaining * currPrice * this.lotExchangeRate(lot);
  }

  lotPnl(lot: ILot, currPrice: number): number {
    return this.lotCurrentValue(lot, currPrice) - this.lotTotalCost(lot);
  }

  lotPnlPerc(lot: ILot, currPrice: number): number {
    const totalCost = this.lotTotalCost(lot);
    if (totalCost === 0) return 0;
    return (this.lotPnl(lot, currPrice) / totalCost) * 100;
  }

  computedTotalCost(isin: string): number {
    const form = this.lotForms[isin];
    if (!form?.qtyRemaining || !form?.costPerUnit) return 0;
    const value = form.qtyRemaining * form.costPerUnit;
    const commission = form.commission ?? 0;
    return Math.round((value + commission) * 100) / 100;
  }

  updateFormText(isin: string, field: 'createdDate' | 'currency', event: Event): void {
    this.lotForms[isin][field] = (event.target as HTMLInputElement).value;
  }

  updateFormNumber(
    isin: string,
    field: 'qtyRemaining' | 'costPerUnit' | 'commission' | 'exchangeRate',
    event: Event
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    this.lotForms[isin][field] = raw ? +raw : null;
  }

  isFormValid(isin: string): boolean {
    const form = this.lotForms[isin];
    if (
      !(
        form?.createdDate &&
        form?.qtyRemaining &&
        form.qtyRemaining > 0 &&
        form?.costPerUnit &&
        form.costPerUnit > 0
      )
    )
      return false;
    if (form.currency !== 'EUR' && (!form.exchangeRate || form.exchangeRate <= 0))
      return false;
    return true;
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
      commission: form.commission ?? 0,
      totalCost,
      currency: form.currency,
      exchangeRate: form.currency === 'EUR' ? 1 : form.exchangeRate!,
    };

    this.portfolioService.addLot(item.isin, newLot).subscribe({
      next: response => {
        this.portfolioUpdated.emit(response.data);
        this.lotForms[item.isin] = {
          createdDate: '',
          qtyRemaining: null,
          costPerUnit: null,
          commission: null,
          currency: 'EUR',
          exchangeRate: 1,
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
