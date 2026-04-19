import { Component, inject, input, output } from '@angular/core';
import { LotUtilsService } from 'app/utils/lot-utils.service';
import { ILot, IPortfolioItem } from 'app/interfaces/portfolio.interface';
import { LotItemRowData } from '../lot-item-row-data/lot-item-row-data';
@Component({
  selector: 'app-lot-table',
  imports: [LotItemRowData],
  templateUrl: './lot-table.html',
  styleUrls: ['./lot-table.scss'],
})
export class LotTable {
  private lotUtils = inject(LotUtilsService);
  item = input.required<IPortfolioItem>();
  // onDeleteLot = output<ILot>();
  // onEditLot = output<ILot>();

  activeLots = (lots: ILot[]) => this.lotUtils.activeLots(lots);

  // editLot(lot: ILot) {
  //   this.onEditLot.emit(lot);
  // }

  // deleteLot(lot: ILot) {
  //   this.onDeleteLot.emit(lot);
  // }
}
