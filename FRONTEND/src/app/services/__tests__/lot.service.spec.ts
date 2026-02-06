import { TestBed } from '@angular/core/testing';
import { LotService } from '../lot.service';
import { SafeMathService } from '../safe-math.service';
import { RecordMapperService } from '../record-mapper.service';

describe('LotService', () => {
  let service: LotService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LotService, SafeMathService, RecordMapperService],
    });
    service = TestBed.inject(LotService);
  });

  it('should process raw data with buys only', () => {
    const rawData = [
      {
        isin: 'TEST123',
        name: 'Test Stock',
        type: 'stock',
        link: 'test-link',
        prevPrice: 90,
        currPrice: 100,
        records: [
          {
            date: '2023-01-01',
            type: 'buy',
            numShares: 10,
            pricePerShare: 100,
            commission: 5,
          },
        ],
      },
    ];
    const result = service.processRawData(rawData);
    expect(result).toHaveLength(1);
    expect(result[0].isin).toBe('TEST123');
    expect(result[0].numShares).toBe(10);
    expect(result[0].totalInvested).toBe(1005);
    expect(result[0].lots).toHaveLength(1);
    expect(result[0].realizedPnl).toBe(0);
  });

  it('should process sell with FIFO matching', () => {
    const rawData = [
      {
        isin: 'TEST123',
        name: 'Test Stock',
        type: 'stock',
        link: 'test-link',
        prevPrice: 90,
        currPrice: 110,
        records: [
          {
            date: '2023-01-01',
            type: 'buy',
            numShares: 10,
            pricePerShare: 100,
            commission: 5,
          },
          {
            date: '2023-02-01',
            type: 'sell',
            numShares: 5,
            pricePerShare: 110,
            commission: 2,
          },
        ],
      },
    ];
    const result = service.processRawData(rawData);
    expect(result[0].numShares).toBe(5);
    expect(result[0].realizedPnl).toBe(45.5); // (5*110 - 5*100.5) - 2 = 550 - 502.5 - 2 = 45.5
    // Buy: totalCost = 10*100 + 5 = 1005, costPerUnit = 1005/10 = 100.5
    // Sell: proceeds = 5*110 = 550, cost = 5*100.5 = 502.5, proratedFee = 2*(5/5)=2, pnl = 550 - 502.5 - 2 = 45.5
    // But in code, it's safeSubtract(safeSubtract(proceeds, cost), proratedFee), so 550 - 502.5 - 2 = 45.5
    // But I said 245, mistake. Actually, expect close to 45.5
  });

  it('should handle transfers', () => {
    const rawData = [
      {
        isin: 'SOURCE',
        name: 'Source Stock',
        type: 'stock',
        link: 'source-link',
        prevPrice: 90,
        currPrice: 100,
        records: [
          {
            date: '2023-01-01',
            type: 'buy',
            numShares: 10,
            pricePerShare: 100,
            commission: 5,
          },
          {
            date: '2023-02-01',
            type: 'transfer',
            numShares: 5,
            transferTo: 'TARGET',
            commission: 1,
            pricePerShare: 0,
          },
        ],
      },
    ];
    const result = service.processRawData(rawData);
    expect(result).toHaveLength(2);
    const source = result.find(r => r.isin === 'SOURCE');
    const target = result.find(r => r.isin === 'TARGET');
    expect(source?.numShares).toBe(5);
    expect(target?.numShares).toBe(5);
    expect(target?.lots).toHaveLength(1);
    // Cost basis adjusted for transfer fee
  });

  it('should handle empty data', () => {
    const result = service.processRawData([]);
    expect(result).toEqual([]);
  });
});
