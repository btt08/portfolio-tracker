import * as fs from 'fs';
import { RecordMapperService } from '../services/record-mapper.service';
import { SafeMathService } from '../services/safe-math.service';
import {
  IRawPortfolioItem,
  IStoredPortfolioItem,
  IPortfolioItem,
  ILot,
  IItemMap,
} from '../interfaces/portfolio.interface';

class MigrationService {
  private recordMapper = new RecordMapperService();
  private math = new SafeMathService();

  processRawData(rawData: IRawPortfolioItem[]): IPortfolioItem[] {
    const itemMap = this.buildItemMap(rawData);

    this.createLotsFromBuys(rawData, itemMap);
    this.processRecords(rawData, itemMap);

    return this.buildPortfolioItems(itemMap);
  }

  private buildItemMap(rawData: IRawPortfolioItem[]) {
    const itemMap = new Map<string, IItemMap>();
    rawData.forEach(r => itemMap.set(r.isin, { raw: r, lots: [], realizedPnl: 0 }));
    return itemMap;
  }

  private createLotsFromBuys(rawData: IRawPortfolioItem[], itemMap: Map<string, IItemMap>) {
    rawData.forEach(rawItem => {
      const entry = itemMap.get(rawItem.isin)!;
      const buyRecords = this.recordMapper
        .normalizeRecords(rawItem.records || [])
        .filter(rec => rec.type === 'buy');
      buyRecords.forEach((rec, idx) => {
        const totalCost = rec.totalCost!;
        const costPerUnit = this.math.safeDivide(totalCost, rec.numShares || 1);
        entry.lots.push(
          this.createLot(rawItem.isin, rec.date!, idx, rec.numShares, costPerUnit, totalCost)
        );
      });
    });
  }

  private createLot(
    isin: string,
    date: string,
    idx: number,
    qty: number,
    costPerUnit: number,
    totalCost: number
  ): ILot {
    return {
      id: `${isin}-${date}-${idx}`,
      createdDate: date,
      qtyRemaining: qty,
      costPerUnit,
      totalCost,
    };
  }

  private processRecords(rawData: IRawPortfolioItem[], itemMap: Map<string, IItemMap>) {
    rawData.forEach(rawItem => {
      const entry = itemMap.get(rawItem.isin)!;
      const normalized = this.recordMapper.normalizeRecords(rawItem.records || []);
      normalized.forEach(rec => {
        if (rec.type === 'sell') this.processSell(entry, rec);
        else if (rec.type === 'transfer' && rec.transferTo)
          this.processTransferOut(entry, itemMap, rec);
        else if (rec.type === 'transfer' && rec.transferFrom)
          this.processTransferIn(entry, itemMap, rec);
      });
    });
  }

  private processSell(
    entry: { raw: IRawPortfolioItem; lots: ILot[]; realizedPnl: number },
    rec: any
  ) {
    const totalSellCommission = rec.commission || 0;
    this.matchLots(entry.lots, rec.numShares, (matched, lot) => {
      const proratedFee = this.prorateFee(totalSellCommission, matched, rec.numShares);
      const proceeds = this.math.safeMultiply(matched, rec.pricePerShare);
      const cost = this.math.safeMultiply(matched, lot.costPerUnit);
      const pnl = this.math.safeSubtract(this.math.safeSubtract(proceeds, cost), proratedFee);
      entry.realizedPnl = this.math.safeAdd(entry.realizedPnl, pnl);
      lot.qtyRemaining = this.math.safeSubtract(lot.qtyRemaining, matched);
      lot.totalCost = this.math.safeMultiply(lot.qtyRemaining, lot.costPerUnit);
    });
  }

  private processTransferOut(
    entry: { raw: IRawPortfolioItem; lots: ILot[]; realizedPnl: number },
    itemMap: Map<string, { raw: IRawPortfolioItem; lots: ILot[]; realizedPnl: number }>,
    rec: any
  ) {
    const totalTransferCommission = rec.commission || 0;
    const targetIsin = rec.transferTo as string;
    if (!itemMap.has(targetIsin)) {
      itemMap.set(targetIsin, {
        raw: {
          isin: targetIsin,
          name: targetIsin,
          type: '',
          link: '',
          prevPrice: 0,
          currPrice: 0,
          records: [],
        },
        lots: [],
        realizedPnl: 0,
      });
    }
    const targetEntry = itemMap.get(targetIsin)!;
    this.matchLots(entry.lots, rec.numShares, (matched, lot) => {
      const proratedFee = this.prorateFee(totalTransferCommission, matched, rec.numShares);
      const addedTotalCost = this.math.safeAdd(
        this.math.safeMultiply(matched, lot.costPerUnit),
        proratedFee
      );
      const addedCostPerUnit =
        matched !== 0 ? this.math.safeDivide(addedTotalCost, matched) : lot.costPerUnit;
      lot.qtyRemaining = this.math.safeSubtract(lot.qtyRemaining, matched);
      lot.totalCost = this.math.safeMultiply(lot.qtyRemaining, lot.costPerUnit);
      targetEntry.lots.push({
        id: `${targetIsin}-${rec.date}-${targetEntry.lots.length}`,
        createdDate: lot.createdDate,
        qtyRemaining: matched,
        costPerUnit: addedCostPerUnit,
        totalCost: addedTotalCost,
      });
    });
  }

  private processTransferIn(
    entry: { raw: IRawPortfolioItem; lots: ILot[]; realizedPnl: number },
    itemMap: Map<string, { raw: IRawPortfolioItem; lots: ILot[]; realizedPnl: number }>,
    rec: any
  ) {
    const totalCost = rec.originalTotalCost ?? rec.totalCost!;
    const costPerUnit = this.math.safeDivide(totalCost, rec.numShares || 1);
    entry.lots.push(
      this.createLot(
        entry.raw.isin,
        rec.date!,
        entry.lots.length,
        rec.numShares,
        costPerUnit,
        totalCost
      )
    );
  }

  private matchLots(
    lots: ILot[],
    qtyNeeded: number,
    onMatch: (matched: number, lot: ILot) => void
  ) {
    let qtyRemaining = qtyNeeded;
    for (const lot of lots) {
      if (qtyRemaining <= 0) break;
      const matched = Math.min(qtyRemaining, lot.qtyRemaining);
      if (matched > 0) {
        onMatch(matched, lot);
        qtyRemaining = this.math.safeSubtract(qtyRemaining, matched);
      }
    }
  }

  private prorateFee(totalFee: number, matched: number, totalQty: number): number {
    return this.math.safeMultiply(totalFee, this.math.safeDivide(matched, totalQty));
  }

  private buildPortfolioItems(itemMap: Map<string, IItemMap>): IPortfolioItem[] {
    return Array.from(itemMap.entries()).map(([isin, entry]) => {
      const raw = entry.raw;
      const metrics = this.calculateItemMetrics(entry.lots, raw);
      return {
        isin: raw.isin,
        name: raw.name,
        type: raw.type,
        link: `https://es.investing.com/${(raw.type || '').toLowerCase()}/${raw.link || ''}`,
        ...metrics,
        records: raw.records ? this.recordMapper.normalizeRecords(raw.records) : [],
        lots: entry.lots,
        realizedPnl: entry.realizedPnl,
      };
    });
  }

  private calculateItemMetrics(lots: ILot[], raw: IRawPortfolioItem) {
    const numShares = lots.reduce((s, l) => this.math.safeAdd(s, l.qtyRemaining), 0);
    const totalInvested = lots.reduce((s, l) => this.math.safeAdd(s, l.totalCost), 0);
    const marketValue = this.math.safeMultiply(raw.currPrice || 0, numShares);
    const avgPrice = numShares === 0 ? 0 : this.math.safeDivide(totalInvested, numShares);
    const prevMarketValue = this.math.safeMultiply(raw.prevPrice || 0, numShares);
    const unrealizedPnl = lots.reduce(
      (acc, lot) =>
        this.math.safeAdd(
          acc,
          this.math.safeMultiply(
            lot.qtyRemaining,
            this.math.safeSubtract(raw.currPrice || 0, lot.costPerUnit)
          )
        ),
      0
    );
    return {
      numShares,
      totalInvested,
      marketValue,
      prevPrice: raw.prevPrice || 0,
      currPrice: raw.currPrice || 0,
      avgPrice,
      dailyChangeEUR: this.calcDailyChangeEUR(prevMarketValue, marketValue),
      dailyChangePerc: this.calcPercChange(prevMarketValue, marketValue),
      totalChangeEUR: this.calcTotalChangeEUR(totalInvested, marketValue),
      totalChangePerc: this.calcTotalChangePerc(totalInvested, marketValue),
      unrealizedPnl,
    };
  }

  private calcDailyChangeEUR(prevMarketValue: number, currentMarketValue: number): number {
    return this.math.safeSubtract(currentMarketValue, prevMarketValue);
  }

  private calcPercChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return this.math.safeMultiply(
      this.math.safeDivide(this.math.safeSubtract(newValue, oldValue), oldValue),
      100
    );
  }

  private calcTotalChangeEUR(totalInvested: number, marketValue: number): number {
    return this.math.safeSubtract(marketValue, totalInvested);
  }

  private calcTotalChangePerc(totalInvested: number, marketValue: number): number {
    return this.calcPercChange(totalInvested, marketValue);
  }
}

class MigrationScript {
  private migrationService = new MigrationService();

  migrate(inputPath: string, outputPath: string): void {
    try {
      console.log('Starting migration from records to lots...');

      // Read and parse the old format file
      const data = fs.readFileSync(inputPath, 'utf-8');
      const rawItems: IRawPortfolioItem[] = JSON.parse(data);

      console.log(`Loaded ${rawItems.length} items from ${inputPath}`);

      // Process using MigrationService
      const processedItems = this.migrationService.processRawData(rawItems);

      console.log(`Processed into ${processedItems.length} items with lots`);

      // Map to stored format
      const storedItems: IStoredPortfolioItem[] = processedItems.map(item => ({
        isin: item.isin,
        name: item.name,
        type: item.type,
        link: item.link.split('/').pop() || '',
        prevPrice: item.prevPrice,
        currPrice: item.currPrice,
        lots: item.lots,
      }));

      // Save the new format file
      fs.writeFileSync(outputPath, JSON.stringify(storedItems, null, 2));

      console.log(`Migration completed. Saved to ${outputPath}`);
    } catch (error) {
      console.error('Error during migration:', error);
      process.exit(1);
    }
  }
}

// Usage: ts-node src/scripts/migrate.ts <inputPath> <outputPath>
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: ts-node src/scripts/migrate.ts <inputPath> <outputPath>');
  process.exit(1);
}

const [inputPath, outputPath] = args;
const migrator = new MigrationScript();
migrator.migrate(inputPath, outputPath);
