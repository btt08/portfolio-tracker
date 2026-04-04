import { Injectable } from '@angular/core';
import { ILot } from '../interfaces/portfolio.interface';

@Injectable({
  providedIn: 'root',
})
export class LotUtilsService {
  lotExchangeRate(lot: ILot): number {
    return lot.exchangeRate ?? 1;
  }

  lotCostPerUnit(lot: ILot): number {
    return lot.costPerUnit * this.lotExchangeRate(lot);
  }

  lotTotalCost(lot: ILot): number {
    return lot.totalCost * this.lotExchangeRate(lot);
  }

  lotCurrentValue(lot: ILot, currPrice: number): number {
    return lot.qtyRemaining * currPrice * this.lotExchangeRate(lot);
  }

  lotPnl(lot: ILot, currPrice: number): number {
    return this.lotCurrentValue(lot, currPrice) - this.lotTotalCost(lot);
  }

  lotPnlPerc(lot: ILot, currPrice: number): number {
    const cost = this.lotTotalCost(lot);
    if (cost === 0) return 0;
    return (this.lotPnl(lot, currPrice) / cost) * 100;
  }

  activeLots(lots: ILot[]): ILot[] {
    return lots.filter(l => l.qtyRemaining > 0);
  }
}
