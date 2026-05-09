import fs from 'fs';
import path from 'path';
import configService from '../services/config.service';
import { SafeMath } from '../services/safe-math/safe-math.service';
import {
  ILot,
  ILotConsumed,
  IStoredPortfolioItem,
  ITransferBreakdown,
  ITransaction,
} from '../interfaces/portfolio.interface';

type TransferPair = {
  sourceItem: IStoredPortfolioItem;
  targetItem: IStoredPortfolioItem;
  transferOut: ITransaction;
  transferIn: ITransaction;
};

function readPortfolio(filePath: string): IStoredPortfolioItem[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as IStoredPortfolioItem[];
}

function ensureUniqueLotId(item: IStoredPortfolioItem, baseId: string): string {
  if (!item.lots.some(lot => lot.id === baseId)) return baseId;

  let suffix = 1;
  while (item.lots.some(lot => lot.id === `${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function normalizeTransferLotsConsumed(lotsConsumed: ILotConsumed[]): ILotConsumed[] {
  return lotsConsumed
    .filter(lot => lot.qty > 0)
    .map(lot => ({
      lotId: lot.lotId,
      qty: lot.qty,
      costPerUnit: lot.costPerUnit,
    }));
}

function findTransferInCandidate(
  transferOut: ITransaction,
  sourceIsin: string,
  targetItem: IStoredPortfolioItem,
  usedIds: Set<string>
): ITransaction | undefined {
  const candidates = (targetItem.transactions || []).filter(
    txn => txn.type === 'transfer_in' && txn.counterpartyIsin === sourceIsin && !usedIds.has(txn.id)
  );

  if (!candidates.length) return undefined;

  const sameDate = candidates.find(txn => txn.date === transferOut.date);
  if (sameDate) return sameDate;

  return candidates[0];
}

function buildTransferPairs(items: IStoredPortfolioItem[]): TransferPair[] {
  const pairs: TransferPair[] = [];
  const itemByIsin = new Map(items.map(item => [item.isin, item]));
  const usedTransferInIds = new Set<string>();

  for (const sourceItem of items) {
    const transferOutTxns = (sourceItem.transactions || []).filter(
      txn => txn.type === 'transfer_out'
    );

    for (const transferOut of transferOutTxns) {
      if (!transferOut.counterpartyIsin || !(transferOut.lotsConsumed || []).length) {
        continue;
      }

      const targetItem = itemByIsin.get(transferOut.counterpartyIsin);
      if (!targetItem) continue;

      const transferIn = findTransferInCandidate(
        transferOut,
        sourceItem.isin,
        targetItem,
        usedTransferInIds
      );
      if (!transferIn) continue;

      pairs.push({ sourceItem, targetItem, transferOut, transferIn });
      usedTransferInIds.add(transferIn.id);
    }
  }

  return pairs;
}

function replaceTransferLots(pair: TransferPair): { ok: boolean; reason?: string } {
  const { sourceItem, targetItem, transferOut, transferIn } = pair;
  const lotsConsumed = normalizeTransferLotsConsumed(transferOut.lotsConsumed || []);

  if (!lotsConsumed.length) {
    return { ok: false, reason: `transfer_out ${transferOut.id} has no consumptions` };
  }

  const sourceQtySold = lotsConsumed.reduce((sum, lot) => SafeMath.add(sum, lot.qty), 0);
  if (sourceQtySold <= 0) {
    return { ok: false, reason: `transfer_out ${transferOut.id} has invalid sourceQtySold` };
  }

  const targetQtyReceived = transferIn.qty;
  if (targetQtyReceived <= 0) {
    return { ok: false, reason: `transfer_in ${transferIn.id} has invalid target qty` };
  }

  const sourceLotsById = new Map(sourceItem.lots.map(lot => [lot.id, lot]));

  const tranches = lotsConsumed.map(consumed => {
    const sourceLot = sourceLotsById.get(consumed.lotId);
    return {
      sourceLotId: consumed.lotId,
      sourceCreatedDate: sourceLot?.createdDate || transferOut.date,
      sourceCostPerUnit: consumed.costPerUnit,
      consumedQty: consumed.qty,
      consumedFiscalCost: SafeMath.multiply(consumed.qty, consumed.costPerUnit),
      sourceCurrency: sourceLot?.currency || 'EUR',
      sourceExchangeRate: sourceLot?.exchangeRate || 1,
    };
  });

  const totalFiscalCost = tranches.reduce(
    (sum, tranche) => SafeMath.add(sum, tranche.consumedFiscalCost),
    0
  );

  const resolvedSourceOperationAmount = transferOut.operationAmount ?? transferOut.costBasis;
  const resolvedTargetOperationAmount = transferIn.operationAmount ?? transferIn.costBasis;

  targetItem.lots = targetItem.lots.filter(lot => {
    const legacyMatch = lot.id.startsWith(`${targetItem.isin}-transfer-${transferIn.date}`);
    const enrichedMatch =
      lot.isTransfer &&
      lot.transferDate === transferIn.date &&
      lot.sourceIsin === sourceItem.isin &&
      tranches.some(tranche => tranche.sourceLotId === lot.sourceLotId);

    return !legacyMatch && !enrichedMatch;
  });

  let accumulatedTargetQty = 0;
  let accumulatedOperationAmount = 0;
  const transferBreakdown: ITransferBreakdown[] = [];

  tranches.forEach((tranche, index) => {
    const isLast = index === tranches.length - 1;
    const ratio = SafeMath.divide(tranche.consumedQty, sourceQtySold, 8);

    const targetQty = isLast
      ? SafeMath.subtract(targetQtyReceived, accumulatedTargetQty)
      : SafeMath.multiply(targetQtyReceived, ratio);

    const normalizedTargetQty = targetQty < 0 ? 0 : targetQty;
    const targetCostPerUnit =
      normalizedTargetQty === 0
        ? 0
        : SafeMath.divide(tranche.consumedFiscalCost, normalizedTargetQty, 8);

    const operationAmount = isLast
      ? SafeMath.subtract(resolvedTargetOperationAmount, accumulatedOperationAmount)
      : SafeMath.multiply(resolvedTargetOperationAmount, ratio);

    const newLot: ILot = {
      id: ensureUniqueLotId(
        targetItem,
        `${targetItem.isin}-transfer-${transferIn.date}-${tranche.sourceLotId}-${index + 1}`
      ),
      createdDate: tranche.sourceCreatedDate,
      qtyRemaining: normalizedTargetQty,
      costPerUnit: targetCostPerUnit,
      commission: 0,
      totalCost: tranche.consumedFiscalCost,
      currency: tranche.sourceCurrency,
      exchangeRate: tranche.sourceExchangeRate,
      transferDate: transferIn.date,
      sourceIsin: sourceItem.isin,
      sourceLotId: tranche.sourceLotId,
      operationPPU: transferIn.pricePerUnit,
      operationAmount,
      isTransfer: true,
    };

    targetItem.lots.push(newLot);

    transferBreakdown.push({
      sourceLotId: tranche.sourceLotId,
      sourceCreatedDate: tranche.sourceCreatedDate,
      sourceCostPerUnit: tranche.sourceCostPerUnit,
      consumedQty: tranche.consumedQty,
      consumedFiscalCost: tranche.consumedFiscalCost,
      targetQty: normalizedTargetQty,
      targetCostPerUnit,
      operationAmount,
    });

    accumulatedTargetQty = SafeMath.add(accumulatedTargetQty, normalizedTargetQty);
    accumulatedOperationAmount = SafeMath.add(accumulatedOperationAmount, operationAmount);
  });

  transferOut.costBasis = totalFiscalCost;
  transferOut.realizedPnl = 0;
  transferOut.operationAmount = transferOut.operationAmount ?? resolvedSourceOperationAmount;
  transferOut.operationPPU = transferOut.operationPPU ?? transferOut.pricePerUnit;
  transferOut.transferBreakdown = transferBreakdown;

  transferIn.costBasis = totalFiscalCost;
  transferIn.realizedPnl = 0;
  transferIn.operationAmount = transferIn.operationAmount ?? resolvedTargetOperationAmount;
  transferIn.operationPPU = transferIn.operationPPU ?? transferIn.pricePerUnit;
  transferIn.transferBreakdown = transferBreakdown;

  const totalTargetQty = transferBreakdown.reduce(
    (sum, row) => SafeMath.add(sum, row.targetQty),
    0
  );
  const totalTargetCost = transferBreakdown.reduce(
    (sum, row) => SafeMath.add(sum, row.consumedFiscalCost),
    0
  );

  if (Math.abs(totalTargetQty - targetQtyReceived) > 0.00000001) {
    return {
      ok: false,
      reason: `qty invariant failed for ${transferIn.id}. expected ${targetQtyReceived}, got ${totalTargetQty}`,
    };
  }

  if (Math.abs(totalTargetCost - totalFiscalCost) > 0.00000001) {
    return {
      ok: false,
      reason: `cost invariant failed for ${transferIn.id}. expected ${totalFiscalCost}, got ${totalTargetCost}`,
    };
  }

  return { ok: true };
}

function runMigration(): void {
  const portfolioPath = path.join(configService.dataPath, 'portfolio.json');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${portfolioPath}.${timestamp}.bak`;

  if (!fs.existsSync(portfolioPath)) {
    throw new Error(`Portfolio file not found: ${portfolioPath}`);
  }

  const items = readPortfolio(portfolioPath);
  fs.copyFileSync(portfolioPath, backupPath);

  const pairs = buildTransferPairs(items);
  let migrated = 0;
  const errors: string[] = [];

  for (const pair of pairs) {
    const result = replaceTransferLots(pair);
    if (result.ok) {
      migrated += 1;
    } else if (result.reason) {
      errors.push(result.reason);
    }
  }

  fs.writeFileSync(portfolioPath, JSON.stringify(items, null, 2));

  console.log(`Backup created at: ${backupPath}`);
  console.log(`Transfer pairs found: ${pairs.length}`);
  console.log(`Transfers migrated: ${migrated}`);

  if (errors.length) {
    console.log('Migration warnings:');
    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }
}

try {
  runMigration();
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
