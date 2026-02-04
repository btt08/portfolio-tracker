import { TestBed } from '@angular/core/testing';
import { RecordMapperService } from '../record-mapper.service';
import { SafeMathService } from '../safe-math.service';

describe('RecordMapperService', () => {
  let service: RecordMapperService;
  let mathService: SafeMathService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecordMapperService, SafeMathService],
    });
    service = TestBed.inject(RecordMapperService);
    mathService = TestBed.inject(SafeMathService);
  });

  it('should normalize records correctly', () => {
    const rawRecords = [
      { date: '2023-01-01', type: 'buy', numShares: 10, pricePerShare: 100, commission: 5 },
    ];
    const normalized = service.normalizeRecords(rawRecords);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].date).toBe('2023-01-01T00:00:00.000Z');
    expect(normalized[0].type).toBe('buy');
    expect(normalized[0].numShares).toBe(10);
    expect(normalized[0].pricePerShare).toBe(100);
    expect(normalized[0].commission).toBe(5);
    expect(normalized[0].totalCost).toBe(1005); // 10*100 + 5
  });

  it('should handle empty records', () => {
    const normalized = service.normalizeRecords([]);
    expect(normalized).toEqual([]);
  });

  it('should handle records without commission', () => {
    const rawRecords = [
      { date: '2023-01-01', type: 'sell', numShares: 5, pricePerShare: 110, commission: 0 },
    ];
    const normalized = service.normalizeRecords(rawRecords);
    expect(normalized[0].commission).toBe(0);
    expect(normalized[0].totalCost).toBe(550); // 5*110 + 0
  });
});