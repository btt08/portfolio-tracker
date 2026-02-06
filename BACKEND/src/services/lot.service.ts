import { IPortfolioItem, ILot } from '../interfaces/portfolio.interface';
import { SafeMathService } from './safe-math.service';

export class LotService {
  private math = new SafeMathService();

  matchLots(lots: ILot[], qtyNeeded: number, onMatch: (matched: number, lot: ILot) => void) {
    let qtyRemaining = qtyNeeded;
    for (const lot of lots) {
      if (qtyRemaining <= 0) break;
      const matched = Math.min(qtyRemaining, lot.qtyRemaining);
      if (matched > 0) {
        onMatch(matched, lot);
        qtyRemaining = this.math.safeSubtract(qtyRemaining, matched);
      }
    }
  }

  prorateFee(totalFee: number, matched: number, totalQty: number): number {
    return this.math.safeMultiply(totalFee, this.math.safeDivide(matched, totalQty));
  }
}
