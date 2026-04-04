import {
  IPortfolio,
  IStoredPortfolioItem,
  ILot,
  ITransaction,
  ILotConsumed,
  IAvailableQty,
} from '../interfaces/portfolio.interface';
import { PortfolioMapperService } from './portfolio-mapper.service';
import { PortfolioRepository } from './portfolio-repository.service';
import { LotService } from './lot.service';
import { SafeMath } from './safe-math.service';
import priceScrapingService from './price-scraping.service';
import configService from './config.service';
import loggerService from './logger.service';

class PortfolioService {
  private rawPortfolio: IStoredPortfolioItem[] = [];
  private mappedPortfolio: IPortfolio | null = null;
  private repo = new PortfolioRepository();
  private mapper = new PortfolioMapperService();
  private lotService = new LotService();

  constructor() {
    this.reload();
    setInterval(() => this.repo.save(this.rawPortfolio), configService.saveInterval);
    this.repo.watch(() => this.reload());
  }

  private reload(): void {
    this.rawPortfolio = this.repo.load();
    this.mappedPortfolio = this.rawPortfolio.length
      ? this.mapper.mapStoredToPortfolio(this.rawPortfolio)
      : null;
  }

  private remap(): void {
    this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
  }

  private remapAndSave(): void {
    this.remap();
    this.repo.save(this.rawPortfolio);
  }

  public getPortfolio(): IPortfolio | null {
    return this.mappedPortfolio;
  }

  public getRawPortfolio(): IStoredPortfolioItem[] {
    return this.rawPortfolio;
  }

  public importPortfolio(items: IStoredPortfolioItem[]): void {
    this.rawPortfolio = items;
    this.remapAndSave();
  }

  public addPortfolioItem(item: IStoredPortfolioItem): void {
    if (!item.realizedPnl) item.realizedPnl = 0;
    if (!item.transactions) item.transactions = [];
    this.rawPortfolio.push(item);
    this.remap();
  }

  public addLotToItem(isin: string, lot: ILot): boolean {
    const item = this.rawPortfolio.find(i => i.isin === isin);
    if (!item) return false;
    item.lots.push(lot);

    if (!item.transactions) item.transactions = [];
    const buyTxn: ITransaction = {
      id: `${isin}-buy-${Date.now()}`,
      date: lot.createdDate,
      type: 'buy',
      qty: lot.qtyRemaining,
      pricePerUnit: lot.costPerUnit,
      costBasis: lot.totalCost,
      proceeds: 0,
      commission: lot.commission,
      realizedPnl: 0,
      lotsConsumed: [],
    };
    item.transactions.push(buyTxn);

    this.remapAndSave();
    return true;
  }

  public deletePortfolioItem(isin: string): boolean {
    const index = this.rawPortfolio.findIndex(i => i.isin === isin);
    if (index === -1) return false;
    this.rawPortfolio.splice(index, 1);
    this.remapAndSave();
    return true;
  }

  private findItemOrFail(isin: string): { item: IStoredPortfolioItem } | { error: string } {
    const item = this.rawPortfolio.find(i => i.isin === isin);
    if (!item) return { error: 'Item not found' };
    return { item };
  }

  private getAvailableQty(item: IStoredPortfolioItem): IAvailableQty {
    const activeLots = item.lots.filter(l => l.qtyRemaining > 0);
    const totalAvailable = activeLots.reduce((sum, l) => SafeMath.add(sum, l.qtyRemaining), 0);
    return { activeLots, totalAvailable };
  }

  public sellFromItem(
    isin: string,
    qtyToSell: number,
    sellPrice: number,
    commission: number
  ): { success: boolean; message?: string } {
    const lookup = this.findItemOrFail(isin);
    if ('error' in lookup) return { success: false, message: lookup.error };
    const item = lookup.item;

    const { activeLots, totalAvailable } = this.getAvailableQty(item);
    if (totalAvailable < qtyToSell) {
      return {
        success: false,
        message: `Not enough shares. Available: ${totalAvailable}, requested: ${qtyToSell}`,
      };
    }

    let totalCostBasis = 0;
    let totalRealizedPnl = 0;
    const lotsConsumed: ILotConsumed[] = [];

    this.lotService.matchLots(activeLots, qtyToSell, (deducted, lot) => {
      const proratedCommission = this.lotService.prorateFee(commission, deducted, qtyToSell);
      const proceeds = SafeMath.multiply(deducted, sellPrice);
      const cost = SafeMath.multiply(deducted, lot.costPerUnit);
      const pnl = SafeMath.subtract(SafeMath.subtract(proceeds, cost), proratedCommission);

      totalCostBasis = SafeMath.add(totalCostBasis, cost);
      totalRealizedPnl = SafeMath.add(totalRealizedPnl, pnl);
      lotsConsumed.push({ lotId: lot.id, qty: deducted, costPerUnit: lot.costPerUnit });

      lot.qtyRemaining = SafeMath.subtract(lot.qtyRemaining, deducted);
      lot.totalCost = SafeMath.multiply(lot.qtyRemaining, lot.costPerUnit);
    });

    if (!item.transactions) item.transactions = [];
    if (!item.realizedPnl) item.realizedPnl = 0;

    const transaction: ITransaction = {
      id: `${isin}-sell-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'sell',
      qty: qtyToSell,
      pricePerUnit: sellPrice,
      costBasis: totalCostBasis,
      proceeds: SafeMath.multiply(qtyToSell, sellPrice),
      commission,
      realizedPnl: totalRealizedPnl,
      lotsConsumed,
    };

    item.transactions.push(transaction);
    item.realizedPnl = SafeMath.add(item.realizedPnl, totalRealizedPnl);

    this.remapAndSave();
    return { success: true };
  }

  public transferBetweenFunds(
    sourceIsin: string,
    targetIsin: string,
    sourceQtySold: number,
    targetQtyReceived: number,
    commission: number
  ): { success: boolean; message?: string } {
    const sourceLookup = this.findItemOrFail(sourceIsin);
    if ('error' in sourceLookup) return { success: false, message: 'Source item not found' };
    const sourceItem = sourceLookup.item;

    const targetLookup = this.findItemOrFail(targetIsin);
    if ('error' in targetLookup) return { success: false, message: 'Target item not found' };
    const targetItem = targetLookup.item;

    const { activeLots, totalAvailable } = this.getAvailableQty(sourceItem);
    if (totalAvailable < sourceQtySold) {
      return {
        success: false,
        message: `Not enough shares in source. Available: ${totalAvailable}, requested: ${sourceQtySold}`,
      };
    }

    let totalCostBasis = 0;
    const lotsConsumed: ILotConsumed[] = [];

    this.lotService.matchLots(activeLots, sourceQtySold, (deducted, lot) => {
      const proratedCommission = this.lotService.prorateFee(commission, deducted, sourceQtySold);
      const cost = SafeMath.multiply(deducted, lot.costPerUnit);
      const costWithCommission = SafeMath.add(cost, proratedCommission);

      totalCostBasis = SafeMath.add(totalCostBasis, costWithCommission);
      lotsConsumed.push({ lotId: lot.id, qty: deducted, costPerUnit: lot.costPerUnit });

      lot.qtyRemaining = SafeMath.subtract(lot.qtyRemaining, deducted);
      lot.totalCost = SafeMath.multiply(lot.qtyRemaining, lot.costPerUnit);
    });

    const targetCostPerUnit = SafeMath.divide(totalCostBasis, targetQtyReceived);
    const newLot: ILot = {
      id: `${targetIsin}-transfer-${Date.now()}`,
      createdDate: new Date().toISOString(),
      qtyRemaining: targetQtyReceived,
      costPerUnit: targetCostPerUnit,
      commission: 0,
      totalCost: totalCostBasis,
      currency: 'EUR',
      exchangeRate: 1,
    };
    targetItem.lots.push(newLot);

    const now = new Date().toISOString();
    if (!sourceItem.transactions) sourceItem.transactions = [];
    if (!sourceItem.realizedPnl) sourceItem.realizedPnl = 0;
    if (!targetItem.transactions) targetItem.transactions = [];
    if (!targetItem.realizedPnl) targetItem.realizedPnl = 0;

    sourceItem.transactions.push({
      id: `${sourceIsin}-transfer_out-${Date.now()}`,
      date: now,
      type: 'transfer_out',
      qty: sourceQtySold,
      pricePerUnit: 0,
      costBasis: totalCostBasis,
      proceeds: 0,
      commission,
      realizedPnl: 0,
      counterpartyIsin: targetIsin,
      lotsConsumed,
    });

    targetItem.transactions.push({
      id: `${targetIsin}-transfer_in-${Date.now()}`,
      date: now,
      type: 'transfer_in',
      qty: targetQtyReceived,
      pricePerUnit: targetCostPerUnit,
      costBasis: totalCostBasis,
      proceeds: 0,
      commission: 0,
      realizedPnl: 0,
      counterpartyIsin: sourceIsin,
      lotsConsumed: [],
    });

    this.remapAndSave();
    return { success: true };
  }

  public async refreshPrices(): Promise<void> {
    try {
      const concurrency = 10;

      for (let i = 0; i < this.rawPortfolio.length; i += concurrency) {
        const batch = this.rawPortfolio.slice(i, i + concurrency);
        const promises = batch.map(async asset => {
          const page = await priceScrapingService.createPage();
          try {
            const priceData = await priceScrapingService.getInvestingPrice(page, asset.link);
            if (priceData) {
              asset.prevPrice = priceData.prevClose || priceData.currPrice;
              asset.currPrice = priceData.currPrice;
              loggerService.info(`${asset.name}: ${asset.prevPrice} -> ${priceData.currPrice}`);
            } else {
              loggerService.warn(`Price not found for ${asset.name}, skipping.`);
            }
          } finally {
            await page.close();
          }
        });
        await Promise.all(promises);
      }
      this.remap();
      loggerService.info('Prices refreshed successfully');
    } catch (error) {
      loggerService.error('Error refreshing prices:', error as Error);
    }
  }

  public saveOnShutdown(): void {
    this.repo.save(this.rawPortfolio);
    priceScrapingService.closeBrowser();
  }
}

const portfolioService = new PortfolioService();

export default portfolioService;
