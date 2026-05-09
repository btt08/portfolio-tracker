import { describe, expect, it } from 'vitest';
import { PortfolioRepository } from './portfolio-repository.service';
import { PortfolioService } from './portfolio.service';
import { IStoredPortfolioItem, ILot } from '../../interfaces/portfolio.interface';

function makeLot(id: string, createdDate: string, qtyRemaining: number, costPerUnit: number): ILot {
  return {
    id,
    createdDate,
    qtyRemaining,
    costPerUnit,
    commission: 0,
    totalCost: qtyRemaining * costPerUnit,
    currency: 'EUR',
    exchangeRate: 1,
  };
}

function makeItem(isin: string, lots: ILot[]): IStoredPortfolioItem {
  return {
    isin,
    name: isin,
    type: 'Fund',
    link: '',
    prevPrice: 0,
    currPrice: 0,
    lots,
    priceUnit: 1,
    realizedPnl: 0,
    transactions: [],
  };
}

function createService(items: IStoredPortfolioItem[]): PortfolioService {
  const cloned = JSON.parse(JSON.stringify(items)) as IStoredPortfolioItem[];
  const repo = {
    loadPortfolio: () => cloned,
    save: () => undefined,
    watch: () => undefined,
  } as unknown as PortfolioRepository;

  return new PortfolioService(repo, undefined, undefined, { autoPersist: false });
}

describe('PortfolioService transferBetweenFunds', () => {
  it('handles simple transfer from one source lot', () => {
    const source = makeItem('SRC', [makeLot('src-1', '2025-01-01', 10, 10)]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    const result = service.transferBetweenFunds('SRC', {
      date: '2025-02-01',
      sourceQtySold: 5,
      sourcePPU: 12,
      sourceOpAmount: 60,
      targetIsin: 'TGT',
      targetQtyReceived: 4,
      targetPPU: 15,
      targetOpAmount: 60,
    });

    expect(result.success).toBe(true);

    const raw = service.getRawPortfolio();
    const updatedSource = raw.find(i => i.isin === 'SRC')!;
    const updatedTarget = raw.find(i => i.isin === 'TGT')!;

    expect(updatedSource.lots[0].qtyRemaining).toBe(5);
    expect(updatedSource.lots[0].totalCost).toBe(50);

    expect(updatedTarget.lots).toHaveLength(1);
    expect(updatedTarget.lots[0].totalCost).toBe(50);
    expect(updatedTarget.lots[0].costPerUnit).toBe(12.5);
    expect(updatedTarget.lots[0].createdDate).toBe('2025-01-01');

    const outTxn = updatedSource.transactions[0];
    const inTxn = updatedTarget.transactions[0];
    expect(outTxn.costBasis).toBe(50);
    expect(inTxn.costBasis).toBe(50);
    expect(outTxn.realizedPnl).toBe(0);
    expect(inTxn.realizedPnl).toBe(0);
  });

  it('consumes multiple source lots and creates multiple target tranches', () => {
    const source = makeItem('SRC', [
      makeLot('src-a', '2025-01-01', 5, 10),
      makeLot('src-b', '2025-01-10', 5, 20),
    ]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    const result = service.transferBetweenFunds('SRC', {
      date: '2025-03-01',
      sourceQtySold: 8,
      sourcePPU: 14,
      sourceOpAmount: 112,
      targetIsin: 'TGT',
      targetQtyReceived: 6.4,
      targetPPU: 17.5,
      targetOpAmount: 112,
    });

    expect(result.success).toBe(true);

    const raw = service.getRawPortfolio();
    const updatedSource = raw.find(i => i.isin === 'SRC')!;
    const updatedTarget = raw.find(i => i.isin === 'TGT')!;

    expect(updatedSource.lots[0].qtyRemaining).toBe(0);
    expect(updatedSource.lots[1].qtyRemaining).toBe(2);

    expect(updatedTarget.lots).toHaveLength(2);
    expect(updatedTarget.lots[0].createdDate).toBe('2025-01-01');
    expect(updatedTarget.lots[1].createdDate).toBe('2025-01-10');
    expect(updatedTarget.lots[0].qtyRemaining).toBe(4);
    expect(updatedTarget.lots[1].qtyRemaining).toBe(2.4);
    expect(updatedTarget.lots[0].totalCost).toBe(50);
    expect(updatedTarget.lots[1].totalCost).toBe(60);

    const inTxn = updatedTarget.transactions[0];
    expect(inTxn.transferBreakdown).toHaveLength(2);
    expect(inTxn.costBasis).toBe(110);
  });

  it('reconciles the last target tranche quantity to avoid drift', () => {
    const source = makeItem('SRC', [
      makeLot('src-a', '2025-01-01', 1, 10),
      makeLot('src-b', '2025-01-10', 2, 20),
    ]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    const result = service.transferBetweenFunds('SRC', {
      date: '2025-04-01',
      sourceQtySold: 3,
      sourcePPU: 16,
      sourceOpAmount: 48,
      targetIsin: 'TGT',
      targetQtyReceived: 1,
      targetPPU: 48,
      targetOpAmount: 48,
    });

    expect(result.success).toBe(true);

    const raw = service.getRawPortfolio();
    const updatedTarget = raw.find(i => i.isin === 'TGT')!;
    const totalTargetQty = updatedTarget.lots.reduce((sum, lot) => sum + lot.qtyRemaining, 0);

    expect(totalTargetQty).toBe(1);
  });

  it('keeps realized pnl at zero for transfer transactions', () => {
    const source = makeItem('SRC', [makeLot('src-1', '2025-01-01', 5, 10)]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    service.transferBetweenFunds('SRC', {
      date: '2025-05-01',
      sourceQtySold: 5,
      sourcePPU: 10,
      sourceOpAmount: 50,
      targetIsin: 'TGT',
      targetQtyReceived: 5,
      targetPPU: 10,
      targetOpAmount: 50,
    });

    const raw = service.getRawPortfolio();
    const sourceTxn = raw.find(i => i.isin === 'SRC')!.transactions[0];
    const targetTxn = raw.find(i => i.isin === 'TGT')!.transactions[0];

    expect(sourceTxn.realizedPnl).toBe(0);
    expect(targetTxn.realizedPnl).toBe(0);
  });

  it('uses carried fiscal cost when selling in the target fund later', () => {
    const source = makeItem('SRC', [makeLot('src-1', '2025-01-01', 10, 10)]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    service.transferBetweenFunds('SRC', {
      date: '2025-06-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      sourceOpAmount: 100,
      targetIsin: 'TGT',
      targetQtyReceived: 10,
      targetPPU: 10,
      targetOpAmount: 100,
    });

    const sellResult = service.sellFromItem('TGT', '2025-06-10', 5, 12, 0);
    expect(sellResult.success).toBe(true);

    const raw = service.getRawPortfolio();
    const targetItem = raw.find(i => i.isin === 'TGT')!;
    const sellTxn = targetItem.transactions.find(txn => txn.type === 'sell')!;

    expect(sellTxn.costBasis).toBe(50);
    expect(sellTxn.realizedPnl).toBe(10);
  });

  it('fails when source has insufficient quantity', () => {
    const source = makeItem('SRC', [makeLot('src-1', '2025-01-01', 1, 10)]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    const result = service.transferBetweenFunds('SRC', {
      date: '2025-07-01',
      sourceQtySold: 2,
      sourcePPU: 10,
      sourceOpAmount: 20,
      targetIsin: 'TGT',
      targetQtyReceived: 2,
      targetPPU: 10,
      targetOpAmount: 20,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough shares in source');
  });

  it('fails when source and target isins are equal', () => {
    const source = makeItem('SRC', [makeLot('src-1', '2025-01-01', 2, 10)]);
    const service = createService([source]);

    const result = service.transferBetweenFunds('SRC', {
      date: '2025-07-10',
      sourceQtySold: 1,
      sourcePPU: 10,
      sourceOpAmount: 10,
      targetIsin: 'SRC',
      targetQtyReceived: 1,
      targetPPU: 10,
      targetOpAmount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('must be different');
  });

  it('creates unique deterministic transfer ids when base id collides', () => {
    const source = makeItem('SRC', [
      makeLot('src-1', '2025-01-01', 10, 10),
      makeLot('src-2', '2025-01-02', 10, 10),
    ]);
    const target = makeItem('TGT', []);
    const service = createService([source, target]);

    const payload = {
      date: '2025-08-01',
      sourcePPU: 10,
      sourceOperationAmount: 10,
      targetIsin: 'TGT',
      targetQtyReceived: 1,
      targetPPU: 10,
      targetOperationAmount: 10,
    };

    const first = service.transferBetweenFunds('SRC', { ...payload, sourceQtySold: 1 });
    const second = service.transferBetweenFunds('SRC', { ...payload, sourceQtySold: 1 });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const raw = service.getRawPortfolio();
    const sourceTxns = raw
      .find(i => i.isin === 'SRC')!
      .transactions.filter(txn => txn.type === 'transfer_out');

    expect(sourceTxns[0].id).toBe('SRC-transfer_out-2025-08-01');
    expect(sourceTxns[1].id).toBe('SRC-transfer_out-2025-08-01-1');
  });
});
