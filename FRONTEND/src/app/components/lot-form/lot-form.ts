import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IPortfolioItem, ILot } from '../../interfaces/portfolio.interface';

interface NewLotForm {
  createdDate: string;
  qtyRemaining: number | null;
  costPerUnit: number | null;
  commission: number | null;
  currency: string;
  exchangeRate: number | null;
}

@Component({
  selector: 'app-lot-form',
  imports: [DecimalPipe],
  templateUrl: './lot-form.html',
  styleUrl: './lot-form.scss',
})
export class LotForm {
  item = input.required<IPortfolioItem>();
  submitting = input<boolean>(false);
  lotSubmit = output<ILot>();

  form: NewLotForm = {
    createdDate: '',
    qtyRemaining: null,
    costPerUnit: null,
    commission: null,
    currency: 'EUR',
    exchangeRate: 1,
  };

  computedTotalCost(): number {
    if (!this.form.qtyRemaining || !this.form.costPerUnit) return 0;
    const value = this.form.qtyRemaining * this.form.costPerUnit;
    const commission = this.form.commission ?? 0;
    return Math.round((value + commission) * 100) / 100;
  }

  updateText(field: 'createdDate' | 'currency', event: Event): void {
    this.form[field] = (event.target as HTMLInputElement).value;
  }

  updateNumber(
    field: 'qtyRemaining' | 'costPerUnit' | 'commission' | 'exchangeRate',
    event: Event
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    this.form[field] = raw ? +raw : null;
  }

  isValid(): boolean {
    const f = this.form;
    if (
      !(
        f.createdDate &&
        f.qtyRemaining &&
        f.qtyRemaining > 0 &&
        f.costPerUnit &&
        f.costPerUnit > 0
      )
    )
      return false;
    if (f.currency !== 'EUR' && (!f.exchangeRate || f.exchangeRate <= 0)) return false;
    return true;
  }

  submit(): void {
    if (!this.isValid()) return;
    const f = this.form;
    const totalCost = this.computedTotalCost();
    const createdDate = new Date(f.createdDate).toISOString();
    const existingLots = this.item().lots.length;

    const newLot: ILot = {
      id: `${this.item().isin}-${createdDate}-${existingLots}`,
      createdDate,
      qtyRemaining: f.qtyRemaining!,
      costPerUnit: f.costPerUnit!,
      commission: f.commission ?? 0,
      totalCost,
      currency: f.currency,
      exchangeRate: f.currency === 'EUR' ? 1 : f.exchangeRate!,
    };

    this.lotSubmit.emit(newLot);
    this.resetForm();
  }

  private resetForm(): void {
    this.form = {
      createdDate: '',
      qtyRemaining: null,
      costPerUnit: null,
      commission: null,
      currency: 'EUR',
      exchangeRate: 1,
    };
  }
}
