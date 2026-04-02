import { Component, input, output } from '@angular/core';
import { ISellData, ISellFormState } from './interfaces/sell-form.interface';

@Component({
  selector: 'app-sell-form',
  templateUrl: './sell-form.html',
  styleUrl: './sell-form.scss',
})
export class SellForm {
  maxShares = input.required<number>();
  submitting = input<boolean>(false);
  error = input<string>('');
  sellSubmit = output<ISellData>();

  form: ISellFormState = {
    qtyToSell: null,
    sellPrice: null,
    commission: null,
  };

  updateNumber(field: 'qtyToSell' | 'sellPrice' | 'commission', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.form[field] = raw ? +raw : null;
  }

  isValid(): boolean {
    const f = this.form;
    return !!(f.qtyToSell && f.qtyToSell > 0 && f.sellPrice && f.sellPrice > 0);
  }

  submit(): void {
    if (!this.isValid()) return;
    this.sellSubmit.emit({
      qtyToSell: this.form.qtyToSell!,
      sellPrice: this.form.sellPrice!,
      commission: this.form.commission ?? 0,
    });
  }

  resetForm(): void {
    this.form = {
      qtyToSell: null,
      sellPrice: null,
      commission: null,
    } as ISellFormState;
  }
}
