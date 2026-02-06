import { TestBed } from '@angular/core/testing';
import { PortfolioMapperService } from '../portfolio-mapper';
import { LotService } from '../lot.service';
import { SafeMathService } from '../safe-math.service';
import { RecordMapperService } from '../record-mapper.service';
import { IRawPortfolioItem } from '../../interfaces/portfolio.interface';

describe('PortfolioMapperService', () => {
  let service: PortfolioMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PortfolioMapperService,
        LotService,
        SafeMathService,
        RecordMapperService,
      ],
    });
    service = TestBed.inject(PortfolioMapperService);
  });

  it('should map raw data to portfolio with single item', () => {
    const rawData: IRawPortfolioItem[] = [
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
    const portfolio = service.mapRawToPortfolio(rawData);
    expect(portfolio.items).toHaveLength(1);
    expect(portfolio.items[0].isin).toBe('TEST123');
    expect(portfolio.items[0].numShares).toBe(10);
    expect(portfolio.items[0].totalInvested).toBe(1005);
    expect(portfolio.items[0].marketValue).toBe(1000); // 10 * 100
    expect(portfolio.summary.portfolioInvested).toBe(1005);
    expect(portfolio.summary.portfolioMarketValue).toBe(1000);
    expect(portfolio.summary.portfolioChangeEUR).toBe(-5);
    expect(portfolio.summary.portfolioChangePerc).toBeCloseTo(-0.4975, 4); // (-5 / 1005) * 100
    expect(portfolio.summary.portfolioDailyChangeEUR).toBe(100); // 1000 - 900 (10*90)
    expect(portfolio.summary.portfolioDailyChangePerc).toBeCloseTo(11.1111, 4); // (100 / 900) * 100
  });

  it('should handle multiple items', () => {
    const rawData: IRawPortfolioItem[] = [
      {
        isin: 'TEST1',
        name: 'Test Stock 1',
        type: 'stock',
        link: 'link1',
        prevPrice: 50,
        currPrice: 60,
        records: [
          {
            date: '2023-01-01',
            type: 'buy',
            numShares: 10,
            pricePerShare: 50,
            commission: 2,
          },
        ],
      },
      {
        isin: 'TEST2',
        name: 'Test Stock 2',
        type: 'stock',
        link: 'link2',
        prevPrice: 100,
        currPrice: 110,
        records: [
          {
            date: '2023-01-01',
            type: 'buy',
            numShares: 5,
            pricePerShare: 100,
            commission: 3,
          },
        ],
      },
    ];
    const portfolio = service.mapRawToPortfolio(rawData);
    expect(portfolio.items).toHaveLength(2);
    expect(portfolio.summary.portfolioInvested).toBe(502 + 503); // 10*50+2 + 5*100+3 = 502 + 503 = 1005
    expect(portfolio.summary.portfolioMarketValue).toBe(600 + 550); // 10*60 + 5*110 = 600 + 550 = 1150
    expect(portfolio.summary.portfolioChangeEUR).toBe(1150 - 1005); // 145
    expect(portfolio.summary.portfolioChangePerc).toBeCloseTo((145 / 1005) * 100, 2);
    expect(portfolio.summary.portfolioDailyChangeEUR).toBe(600 + 550 - (500 + 500)); // 1150 - 1000 = 150
    expect(portfolio.summary.portfolioDailyChangePerc).toBeCloseTo((150 / 1000) * 100, 2);
  });

  it('should handle empty raw data', () => {
    const portfolio = service.mapRawToPortfolio([]);
    expect(portfolio.items).toEqual([]);
    expect(portfolio.summary.portfolioInvested).toBe(0);
    expect(portfolio.summary.portfolioMarketValue).toBe(0);
    expect(portfolio.summary.portfolioChangeEUR).toBe(0);
    expect(portfolio.summary.portfolioChangePerc).toBe(0);
    expect(portfolio.summary.portfolioDailyChangeEUR).toBe(0);
    expect(portfolio.summary.portfolioDailyChangePerc).toBe(0);
  });

  it('should handle item with zero invested (edge case)', () => {
    const rawData: IRawPortfolioItem[] = [
      {
        isin: 'TEST123',
        name: 'Test Stock',
        type: 'stock',
        link: 'test-link',
        prevPrice: 0,
        currPrice: 100,
        records: [],
      },
    ];
    const portfolio = service.mapRawToPortfolio(rawData);
    expect(portfolio.items).toHaveLength(1);
    expect(portfolio.summary.portfolioInvested).toBe(0);
    expect(portfolio.summary.portfolioMarketValue).toBe(0);
    expect(portfolio.summary.portfolioChangePerc).toBe(0); // Division by zero handled
    expect(portfolio.summary.portfolioDailyChangePerc).toBe(0); // Prev market value 0
  });
});
