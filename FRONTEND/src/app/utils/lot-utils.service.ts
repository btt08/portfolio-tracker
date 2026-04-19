import { Injectable } from '@angular/core';
import { ILot } from '../interfaces/portfolio.interface';

@Injectable({
  providedIn: 'root',
})
export class LotUtilsService {
  lotCurrentValue(lot: ILot, currPrice: number): number {
    return lot.qtyRemaining * currPrice;
  }

  lotPnl(lot: ILot, currPrice: number): number {
    return this.lotCurrentValue(lot, currPrice) - lot.totalCost;
  }

  lotPnlPerc(lot: ILot, currPrice: number): number {
    const lotPnL = this.lotPnl(lot, currPrice);
    const cost = lot.totalCost;
    if (cost === 0) return 0;
    return (lotPnL / cost) * 100;
  }

  activeLots(lots: ILot[]): ILot[] {
    return lots.filter(l => l.qtyRemaining > 0);
  }
}
