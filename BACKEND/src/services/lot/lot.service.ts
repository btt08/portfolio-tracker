import { ILot } from '../../interfaces/portfolio.interface';
import { SafeMath } from '../safe-math/safe-math.service';

export class LotService {
  matchLots(lots: ILot[], qtyNeeded: number, onMatch: (matched: number, lot: ILot) => void) {
    let qtyRemaining = qtyNeeded;
    for (const lot of lots) {
      if (qtyRemaining <= 0) break;
      const matched = Math.min(qtyRemaining, lot.qtyRemaining);
      if (matched > 0) {
        onMatch(matched, lot);
        qtyRemaining = SafeMath.subtract(qtyRemaining, matched);
      }
    }
  }

  prorateFee(totalFee: number, matched: number, totalQty: number): number {
    return SafeMath.multiply(totalFee, SafeMath.divide(matched, totalQty));
  }
}

const lotService = new LotService();
export default lotService;
