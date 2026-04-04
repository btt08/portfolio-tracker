import { Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required, min } from '@angular/forms/signals';
import { IPortfolioItem, ILot } from '@interfaces/portfolio.interface';
import { ILotFormModel, DEFAULTS } from '@interfaces/lot-form.interface';

@Component({
  selector: 'app-lot-form',
  imports: [DecimalPipe, FormField],
  templateUrl: './lot-form.html',
  styleUrls: ['./lot-form.scss'],
})
export class LotForm {
  item = input.required<IPortfolioItem>();
  submitting = input<boolean>(false);
  lotSubmit = output<ILot>();

  formModel = signal<ILotFormModel>({ ...DEFAULTS });
  lotForm = form(this.formModel, schema => {
    required(schema.createdDate);
    required(schema.qtyRemaining);
    min(schema.qtyRemaining, 0.0001);
    required(schema.costPerUnit);
    min(schema.costPerUnit, 0.0001);
  });

  totalCost = computed(() => {
    const data = this.formModel();
    if (!data.qtyRemaining || !data.costPerUnit) return 0;
    return (
      Math.round((data.qtyRemaining * data.costPerUnit + (data.commission ?? 0)) * 100) /
      100
    );
  });

  isNonEur = computed(() => this.formModel().currency !== 'EUR');

  isValid = computed(() => {
    return (
      this.lotForm.createdDate().valid() &&
      this.lotForm.qtyRemaining().valid() &&
      this.lotForm.costPerUnit().valid()
    );
  });

  submit(): void {
    const f = this.formModel();
    if (!f.createdDate || !f.qtyRemaining || !f.costPerUnit) return;
    if (this.isNonEur() && (!f.exchangeRate || f.exchangeRate <= 0)) return;

    const totalCost = this.totalCost();
    const createdDate = new Date(f.createdDate).toISOString();
    const existingLots = this.item().lots.length;

    const newLot: ILot = {
      id: `${this.item().isin}-${createdDate}-${existingLots}`,
      createdDate,
      qtyRemaining: f.qtyRemaining,
      costPerUnit: f.costPerUnit,
      commission: f.commission ?? 0,
      totalCost,
      currency: f.currency,
      exchangeRate: f.currency === 'EUR' ? 1 : f.exchangeRate!,
    };

    this.lotSubmit.emit(newLot);
    this.formModel.set({ ...DEFAULTS });
  }
}
