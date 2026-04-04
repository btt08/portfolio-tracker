import {
  Component,
  computed,
  inject,
  Injector,
  output,
  runInInjectionContext,
  signal,
  WritableSignal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { ILot } from '@interfaces/portfolio.interface';
import { IAddItemData } from '@interfaces/add-item.interface';
import {
  createLotRowForm,
  IItemFormModel,
  ILotRowModel,
  LotFieldTree,
  LOT_DEFAULTS,
} from '@interfaces/add-item.interface';

@Component({
  selector: 'app-add-item-modal',
  imports: [FormField, DecimalPipe],
  templateUrl: './add-item-modal.html',
  styleUrls: ['./add-item-modal.scss'],
})
export class AddItemModal {
  private injector = inject(Injector);
  close = output<void>();
  itemSubmit = output<IAddItemData>();

  formModel = signal<IItemFormModel>({ isin: '', name: '', type: 'ETF', link: '' });
  itemForm = form(this.formModel, schema => {
    required(schema.isin);
    required(schema.name);
    required(schema.type);
    required(schema.link);
  });

  assetTypes = ['ETF', 'Stock', 'Fund'];

  lotRows: { model: WritableSignal<ILotRowModel>; lotForm: LotFieldTree }[] = [];

  isValid = computed(() => {
    return (
      this.itemForm.isin().valid() &&
      this.itemForm.name().valid() &&
      this.itemForm.link().valid()
    );
  });

  ngOnInit(): void {
    window.addEventListener('keydown', this.onKeydown.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onKeydown.bind(this));
  }

  addLotRow(): void {
    const model = signal<ILotRowModel>({ ...LOT_DEFAULTS });
    const lotForm = runInInjectionContext(this.injector, () => createLotRowForm(model));
    this.lotRows = [...this.lotRows, { model, lotForm }];
  }

  removeLotRow(index: number): void {
    this.lotRows = this.lotRows.filter((_, i) => i !== index);
  }

  lotTotalCost(row: { model: WritableSignal<ILotRowModel> }): number {
    const data = row.model();
    if (!data.qty || !data.costPerUnit) return 0;
    return Math.round((data.qty * data.costPerUnit + (data.commission ?? 0)) * 100) / 100;
  }

  submit(event: Event): void {
    event.preventDefault();
    const formVal = this.formModel();
    if (!formVal.isin || !formVal.name || !formVal.link) return;

    const validLots = this.lotRows
      .map(r => r.model())
      .filter(l => l.date && l.qty && l.qty > 0 && l.costPerUnit && l.costPerUnit > 0);

    const mappedLots: ILot[] = validLots.map((l, i) => {
      const createdDate = new Date(l.date).toISOString();
      const qty = l.qty ?? 0;
      const costPerUnit = l.costPerUnit ?? 0;
      const commission = l.commission ?? 0;
      return {
        id: `${formVal.isin}-${createdDate}-${i}`,
        createdDate,
        qtyRemaining: qty,
        costPerUnit: costPerUnit,
        commission: commission,
        totalCost: Math.round((qty * costPerUnit + commission) * 100) / 100,
        currency: l.currency,
        exchangeRate: l.currency === 'EUR' ? 1 : (l.exchangeRate ?? 1),
      };
    });

    this.itemSubmit.emit({
      ...formVal,
      ...(mappedLots.length > 0 ? { lots: mappedLots } : {}),
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }
}
