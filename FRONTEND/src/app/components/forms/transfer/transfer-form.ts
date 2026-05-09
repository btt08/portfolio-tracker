import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormField, required, min } from '@angular/forms/signals';
import { IPortfolioItem } from '@interfaces/portfolio.interface';
import { ITransferData } from '@interfaces/transfer.interface';
import { ITransferFormModel, DEFAULTS } from '@interfaces/transfer-form.interface';
import { Button } from 'app/components/buttons/button/button';

@Component({
  selector: 'app-transfer-form',
  imports: [Button, FormField],
  templateUrl: './transfer-form.html',
  styleUrls: ['./transfer-form.scss'],
})
export class TransferForm {
  sourceIsin = input.required<string>();
  maxShares = input.required<number>();
  allItems = input.required<IPortfolioItem[]>();
  submitting = input<boolean>(false);
  error = input<string>('');
  onAddItem = output<void>();
  transferSubmit = output<ITransferData>();

  formModel = signal<ITransferFormModel>({ ...DEFAULTS });
  transferForm = form(this.formModel, schema => {
    required(schema.date);
    required(schema.targetIsin);
    required(schema.sourceQtySold);
    required(schema.sourcePricePerUnit);
    required(schema.targetQtyReceived);
    required(schema.targetPricePerUnit);
    min(schema.sourceQtySold, 0.0001);
    min(schema.sourcePricePerUnit, 0.0001);
    min(schema.targetQtyReceived, 0.0001);
    min(schema.targetPricePerUnit, 0.0001);
  });

  targetOptions = computed(() =>
    this.allItems().filter(
      i => i.isin !== this.sourceIsin() && i.type.toLowerCase() === 'fund'
    )
  );

  isValid = computed(() => {
    return (
      this.transferForm.targetIsin().valid() &&
      this.transferForm.targetIsin().value() !== 'new' &&
      this.transferForm.sourceQtySold().valid() &&
      this.transferForm.sourcePricePerUnit().valid() &&
      this.transferForm.targetQtyReceived().valid() &&
      this.transferForm.targetPricePerUnit().valid()
    );
  });

  submit(event?: Event): void {
    event?.preventDefault();
    const f = this.formModel();
    if (!this.checkFormValidity()) return;
    else {
      this.transferSubmit.emit({
        date: f.date,
        targetIsin: f.targetIsin,
        sourceQtySold: f.sourceQtySold!,
        sourcePricePerUnit: f.sourcePricePerUnit!,
        sourceAmountSold: (f.sourceQtySold ?? 0) * (f.sourcePricePerUnit ?? 0)!,
        targetQtyReceived: f.targetQtyReceived!,
        targetPricePerUnit: f.targetPricePerUnit!,
        targetAmountReceived: (f.targetQtyReceived ?? 0) * (f.targetPricePerUnit ?? 0)!,
      });
      this.resetForm();
    }
  }

  resetForm(): void {
    this.formModel.set({ ...DEFAULTS });
  }

  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedIsin = select.value;
    if (selectedIsin === 'new') {
      this.onAddItem.emit();
    }
  }

  private checkFormValidity(): boolean {
    const f = this.formModel();
    return (
      !!f.targetIsin &&
      !!f.sourceQtySold &&
      !!f.sourcePricePerUnit &&
      !!f.targetQtyReceived &&
      !!f.targetPricePerUnit
    );
  }
}
