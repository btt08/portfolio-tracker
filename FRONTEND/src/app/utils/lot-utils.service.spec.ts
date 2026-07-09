import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LotUtilsService } from './lot-utils.service';
import { ILot } from '../interfaces/portfolio.interface';

function makeLot(overrides: Partial<ILot> = {}): ILot {
  return {
    id: 'test-lot-1',
    createdDate: '2024-01-15T00:00:00.000Z',
    qtyRemaining: 10,
    costPerUnit: 50,
    commission: 5,
    totalCost: 505,
    currency: 'EUR',
    exchangeRate: 1,
    ...overrides,
  } as ILot;
}

describe('LotUtilsService', () => {
  let service: LotUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LotUtilsService);
  });

  describe('lotCurrentValue', () => {
    it('calculates current value', () => {
      expect(service.lotCurrentValue(makeLot({ qtyRemaining: 10 }), 60)).toBe(600);
    });

    it('keeps value in lot currency for non-EUR lots', () => {
      expect(
        service.lotCurrentValue(makeLot({ qtyRemaining: 10, exchangeRate: 1.5 }), 60)
      ).toBe(600);
    });
  });

  describe('lotPnl', () => {
    it('calculates positive PnL', () => {
      const lot = makeLot({ qtyRemaining: 10, totalCost: 500 });
      expect(service.lotPnl(lot, 60)).toBe(100); // 600 - 500
    });

    it('calculates negative PnL', () => {
      const lot = makeLot({ qtyRemaining: 10, totalCost: 500 });
      expect(service.lotPnl(lot, 40)).toBe(-100); // 400 - 500
    });
  });

  describe('lotPnlPerc', () => {
    it('calculates percent change', () => {
      const lot = makeLot({ qtyRemaining: 10, totalCost: 500 });
      expect(service.lotPnlPerc(lot, 60)).toBe(20); // 100/500*100
    });

    it('returns 0 when cost is 0', () => {
      const lot = makeLot({ qtyRemaining: 0, totalCost: 0 });
      expect(service.lotPnlPerc(lot, 60)).toBe(0);
    });
  });

  describe('activeLots', () => {
    it('filters out lots with 0 qty', () => {
      const lots = [
        makeLot({ id: 'a', qtyRemaining: 10 }),
        makeLot({ id: 'b', qtyRemaining: 0 }),
        makeLot({ id: 'c', qtyRemaining: 5 }),
      ];
      const result = service.activeLots(lots);
      expect(result).toHaveLength(2);
      expect(result.map(l => l.id)).toEqual(['a', 'c']);
    });

    it('returns empty for all-zero lots', () => {
      expect(service.activeLots([makeLot({ qtyRemaining: 0 })])).toHaveLength(0);
    });
  });
});
