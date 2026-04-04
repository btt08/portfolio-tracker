import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormField, required, min } from '@angular/forms/signals';
import { ISellData, ISellFormModel, DEFAULTS } from '@interfaces/sell-form.interface';

@Component({
  selector: 'app-sell-form',
  imports: [FormField],
  templateUrl: './sell-form.html',
  styleUrl: './sell-form.scss',
})
export class SellForm {
  maxShares = input.required<number>();
  submitting = input<boolean>(false);
  error = input<string>('');
  sellSubmit = output<ISellData>();

  formModel = signal<ISellFormModel>({ ...DEFAULTS });
  sellForm = form(this.formModel, schema => {
    required(schema.qtyToSell);
    min(schema.qtyToSell, 0.0001);
    required(schema.sellPrice);
    min(schema.sellPrice, 0.0001);
  });

  isValid = computed(
    () => this.sellForm.qtyToSell().valid() && this.sellForm.sellPrice().valid()
  );

  submit(): void {
    const f = this.formModel();
    if (!f.qtyToSell || !f.sellPrice) return;
    this.sellSubmit.emit({
      qtyToSell: f.qtyToSell,
      sellPrice: f.sellPrice,
      commission: f.commission ?? 0,
    });
  }

  resetForm(): void {
    this.formModel.set({ ...DEFAULTS });
  }
}
