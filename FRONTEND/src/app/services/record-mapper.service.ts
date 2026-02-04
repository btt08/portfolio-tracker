import { inject, Injectable } from '@angular/core';
import { IRawRecord, IRecord } from '../interfaces/portfolio.interface';
import { SafeMathService } from './safe-math.service';

@Injectable({ providedIn: 'root' })
export class RecordMapperService {
  private math = inject(SafeMathService);

  normalizeRecords(rawRecords: IRawRecord[]): IRecord[] {
    return (rawRecords || []).map(rec => {
      const commission = rec.commission || 0;
      const numShares = rec.numShares || 0;
      const pricePerShare = rec.pricePerShare || 0;
      const totalCost = this.math.safeAdd(
        this.math.safeMultiply(numShares, pricePerShare),
        commission
      );
      const normalizedDate = rec.date ? new Date(rec.date).toISOString() : '';
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
