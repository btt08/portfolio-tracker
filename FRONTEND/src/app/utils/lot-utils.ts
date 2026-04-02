import { ILot } from '../interfaces/portfolio.interface';

export function lotExchangeRate(lot: ILot): number {
  return lot.exchangeRate ?? 1;
}

export function lotCostPerUnit(lot: ILot): number {
  return lot.costPerUnit * lotExchangeRate(lot);
}

export function lotTotalCost(lot: ILot): number {
  return lot.totalCost * lotExchangeRate(lot);
}

export function lotCurrentValue(lot: ILot, currPrice: number): number {
  return lot.qtyRemaining * currPrice * lotExchangeRate(lot);
}

export function lotPnl(lot: ILot, currPrice: number): number {
  return lotCurrentValue(lot, currPrice) - lotTotalCost(lot);
}

export function lotPnlPerc(lot: ILot, currPrice: number): number {
  const cost = lotTotalCost(lot);
  if (cost === 0) return 0;
  return (lotPnl(lot, currPrice) / cost) * 100;
}

export function activeLots(lots: ILot[]): ILot[] {
  return lots.filter(l => l.qtyRemaining > 0);
}
