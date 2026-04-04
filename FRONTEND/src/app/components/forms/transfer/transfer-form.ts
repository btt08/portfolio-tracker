import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormField, required, min } from '@angular/forms/signals';
import { IPortfolioItem } from '@interfaces/portfolio.interface';
import { ITransferData } from '@interfaces/transfer.interface';
import { ITransferFormModel, DEFAULTS } from '@interfaces/transfer-form.interface';

@Component({
  selector: 'app-transfer-form',
  imports: [FormField],
  templateUrl: './transfer-form.html',
  styleUrls: ['./transfer-form.scss'],
})
export class TransferForm {
  sourceIsin = input.required<string>();
  maxShares = input.required<number>();
  allItems = input.required<IPortfolioItem[]>();
  submitting = input<boolean>(false);
  error = input<string>('');
  transferSubmit = output<ITransferData>();

  formModel = signal<ITransferFormModel>({ ...DEFAULTS });
  transferForm = form(this.formModel, schema => {
    required(schema.targetIsin);
    required(schema.sourceQtySold);
    min(schema.sourceQtySold, 0.0001);
    required(schema.targetQtyReceived);
    min(schema.targetQtyReceived, 0.0001);
  });

  targetOptions = computed(() =>
    this.allItems().filter(i => i.isin !== this.sourceIsin())
  );

  isValid = computed(() => {
    return (
      this.transferForm.targetIsin().valid() &&
      this.transferForm.sourceQtySold().valid() &&
      this.transferForm.targetQtyReceived().valid()
    );
  });

  submit(event?: Event): void {
    event?.preventDefault();
    const f = this.formModel();
    if (!f.targetIsin || !f.sourceQtySold || !f.targetQtyReceived) return;
    this.transferSubmit.emit({
      targetIsin: f.targetIsin,
      sourceQtySold: f.sourceQtySold,
      targetQtyReceived: f.targetQtyReceived,
      commission: f.commission ?? 0,
    });
  }

  resetForm(): void {
    this.formModel.set({ ...DEFAULTS });
  }
}
