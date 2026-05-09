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
    required(schema.sourcePPU);
    required(schema.targetQtyReceived);
    required(schema.targetPPU);
    min(schema.sourceQtySold, 0.0001);
    min(schema.sourcePPU, 0.0001);
    min(schema.targetQtyReceived, 0.0001);
    min(schema.targetPPU, 0.0001);
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
      this.transferForm.sourcePPU().valid() &&
      this.transferForm.targetQtyReceived().valid() &&
      this.transferForm.targetPPU().valid()
    );
  });

  submit(event?: Event): void {
    event?.preventDefault();
    const f = this.formModel();
    if (!this.checkFormValidity()) return;
    else {
      const sourceOpAmount = (f.sourceQtySold ?? 0) * (f.sourcePPU ?? 0);
      const targetOpAmount = (f.targetQtyReceived ?? 0) * (f.targetPPU ?? 0);

      this.transferSubmit.emit({
        date: f.date,
        targetIsin: f.targetIsin,
        sourceQtySold: f.sourceQtySold!,
        sourcePPU: f.sourcePPU!,
        sourceOpAmount,
        sourceAmountSold: sourceOpAmount,
        targetQtyReceived: f.targetQtyReceived!,
        targetPPU: f.targetPPU!,
        targetOpAmount,
        targetAmountReceived: targetOpAmount,
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
      !!f.sourcePPU &&
      !!f.targetQtyReceived &&
      !!f.targetPPU
    );
  }
}
