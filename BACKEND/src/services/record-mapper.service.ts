import { IRecord } from '../interfaces/portfolio.interface';
import { SafeMathService } from './safe-math.service';

export class RecordMapperService {
  private math = new SafeMathService();

  normalizeRecords(rawRecords: any[]): IRecord[] {
    return (rawRecords || []).map(rec => {
      const commission = rec.commission || 0;
      const numShares = rec.numShares || 0;
      const pricePerShare = rec.pricePerShare || 0;
      const totalCost = this.math.safeAdd(
        this.math.safeMultiply(numShares, pricePerShare),
        commission
      );
      const normalizedDate = rec.executionDate ? new Date(rec.executionDate).toISOString() : '';
      return {
        ...rec,
        date: normalizedDate,
        type: (rec.type || '').toLowerCase(),
        numShares,
        pricePerShare,
        commission,
        totalCost,
      } as IRecord;
    });
  }
}
