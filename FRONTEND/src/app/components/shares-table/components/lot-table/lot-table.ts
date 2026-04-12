import { Component, inject, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ILot, IPortfolioItem } from 'app/interfaces/portfolio.interface';
import { LotUtilsService } from 'app/utils/lot-utils.service';

@Component({
  selector: 'app-lot-table',
  imports: [DatePipe, DecimalPipe, MatIcon],
  templateUrl: './lot-table.html',
  styleUrls: ['./lot-table.scss'],
})
export class LotTable {
  private lotUtils = inject(LotUtilsService);
  item = input.required<IPortfolioItem>();
  onDeleteLot = output<ILot>();
  onEditLot = output<ILot>();

  activeLots = (lots: ILot[]) => this.lotUtils.activeLots(lots);
  lotCostPerUnit = (lot: ILot) => this.lotUtils.lotCostPerUnit(lot);
  lotTotalCost = (lot: ILot) => this.lotUtils.lotTotalCost(lot);
  lotCurrentValue = (lot: ILot, currPrice: number) =>
    this.lotUtils.lotCurrentValue(lot, currPrice);
  lotPnl = (lot: ILot, currPrice: number) => this.lotUtils.lotPnl(lot, currPrice);
  lotPnlPerc = (lot: ILot, currPrice: number) => this.lotUtils.lotPnlPerc(lot, currPrice);

  editLot(lot: ILot) {
    this.onEditLot.emit(lot);
  }

  deleteLot(lot: ILot) {
    this.onDeleteLot.emit(lot);
  }
}
