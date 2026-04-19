import { Component, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { LotUtilsService } from 'app/utils/lot-utils.service';
import { ILot } from 'app/interfaces/portfolio.interface';
@Component({
  selector: '[app-lot-item-row-data]',
  imports: [DatePipe, DecimalPipe, MatIcon],
  templateUrl: './lot-item-row-data.html',
  styleUrls: ['./lot-item-row-data.scss'],
})
export class LotItemRowData {
  private lotUtils = inject(LotUtilsService);

  currPrice = input.required<number>();
  lot = input.required<ILot>();

  activeLots = (lots: ILot[]) => this.lotUtils.activeLots(lots);
  lotCurrentValue = (lot: ILot) => this.lotUtils.lotCurrentValue(lot, this.currPrice());
  lotPnl = (lot: ILot) => this.lotUtils.lotPnl(lot, this.currPrice());
  lotPnlPerc = (lot: ILot) => this.lotUtils.lotPnlPerc(lot, this.currPrice());

  deleteLot(lot: ILot): void {
    alert(`Delete lot ${lot.id} - feature not implemented yet`);
  }

  editLot(lot: ILot): void {
    alert(`Edit lot ${lot.id} - feature not implemented yet`);
  }
}
