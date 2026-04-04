import { describe, it, expect, vi } from 'vitest';
import { LotService } from './lot.service';
import { ILot } from '../interfaces/portfolio.interface';

function makeLot(id: string, qtyRemaining: number): ILot {
  return {
    id,
    createdDate: '2024-01-01T00:00:00.000Z',
    qtyRemaining,
    costPerUnit: 10,
    commission: 1,
    totalCost: qtyRemaining * 10 + 1,
    currency: 'EUR',
    exchangeRate: 1,
  };
}

describe('LotService', () => {
  const service = new LotService();

  describe('matchLots (FIFO)', () => {
    it('matches from the first lot when qty is enough', () => {
      const lots = [makeLot('a', 10), makeLot('b', 5)];
      const matches: { matched: number; lotId: string }[] = [];
      service.matchLots(lots, 3, (matched, lot) => {
        matches.push({ matched, lotId: lot.id });
      });
      expect(matches).toEqual([{ matched: 3, lotId: 'a' }]);
    });

    it('spans multiple lots in FIFO order', () => {
      const lots = [makeLot('a', 5), makeLot('b', 10)];
      const matches: { matched: number; lotId: string }[] = [];
      service.matchLots(lots, 8, (matched, lot) => {
        matches.push({ matched, lotId: lot.id });
      });
      expect(matches).toEqual([
        { matched: 5, lotId: 'a' },
        { matched: 3, lotId: 'b' },
      ]);
    });

    it('stops after all qty matched', () => {
      const lots = [makeLot('a', 10), makeLot('b', 10)];
      const callback = vi.fn();
      service.matchLots(lots, 5, callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('handles zero qty gracefully', () => {
      const lots = [makeLot('a', 10)];
      const callback = vi.fn();
      service.matchLots(lots, 0, callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('prorateFee', () => {
    it('prorates a commission across matched qty', () => {
      const result = service.prorateFee(10, 5, 20);
      expect(result).toBe(2.5);
    });

    it('returns 0 when totalQty is 0', () => {
      const result = service.prorateFee(10, 0, 0);
      expect(result).toBe(0);
    });
  });
});
