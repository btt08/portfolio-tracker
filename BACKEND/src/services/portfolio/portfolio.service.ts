import configService from '../config.service';
import loggerService from '../logger.service';
import { LotService } from '../lot/lot.service';
import priceScrapingService from '../price-scraping.service';
import { PortfolioMapperService } from './portfolio-mapper.service';
import { PortfolioRepository } from './portfolio-repository.service';
import { SafeMath } from '../safe-math/safe-math.service';
import {
  IAvailableQty,
  ILot,
  ILotConsumed,
  IPortfolio,
  IPortfolioId,
  ISourceTranche,
  IStoredPortfolioItem,
  ITransaction,
  ITransferBreakdown,
  ITransferData,
} from '../../interfaces/portfolio.interface';

export class PortfolioService {
  private static readonly TRANSFER_QTY_PRECISION = 8;
  private rawPortfolio: IStoredPortfolioItem[] = [];
  private mappedPortfolio: IPortfolio | null = null;
  private repo: PortfolioRepository;
  private mapper: PortfolioMapperService;
  private lotService: LotService;

  constructor(
    repo: PortfolioRepository = new PortfolioRepository(),
    mapper?: PortfolioMapperService,
    lotService?: LotService,
    options: { autoPersist?: boolean } = {}
  ) {
    this.repo = repo;
    this.mapper = mapper ?? new PortfolioMapperService();
    this.lotService = lotService ?? new LotService();

    if (!this.repo.portfolioExists()) {
      console.log('Portfolio file does not exist, initializing with empty portfolio.');
      this.repo.save([]);
    }

    this.reload();
    if (options.autoPersist !== false) {
      setInterval(() => this.repo.save(this.rawPortfolio), configService.saveInterval);
      this.repo.watch(() => this.reload());
    }
  }

  private reload(): void {
    this.rawPortfolio = this.repo.loadPortfolio();
    this.normalizeOrder();
    this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
  }

  private normalizeOrder(): void {
    this.rawPortfolio = [...this.rawPortfolio]
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      .map((item, index) => ({ ...item, order: index }));
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

  public getPortfolioIds(): IPortfolioId[] {
    return this.rawPortfolio.map(item => ({ isin: item.isin, name: item.name }));
  }

  public getRawPortfolio(): IStoredPortfolioItem[] {
    return this.rawPortfolio;
  }

  public importPortfolio(items: IStoredPortfolioItem[]): void {
    this.rawPortfolio = items;
    this.normalizeOrder();
    this.remapAndSave();
  }

  public addPortfolioItem(item: IStoredPortfolioItem): void {
    if (!item.realizedPnl) item.realizedPnl = 0;
    if (!item.transactions) item.transactions = [];
    item.order = this.rawPortfolio.length;
    this.rawPortfolio.push(item);
    this.remapAndSave();
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
    this.normalizeOrder();
    this.remapAndSave();
    return true;
  }

  public reorderPortfolio(isins: string[]): { success: boolean; message?: string } {
    const positionByIsin = new Map<string, number>();
    for (let i = 0; i < isins.length; i += 1) {
      const isin = isins[i];
      if (positionByIsin.has(isin)) {
        return { success: false, message: `Duplicate ISIN in reorder payload: ${isin}` };
      }
      positionByIsin.set(isin, i);
    }

    const allRequestedAreKnown = isins.every(isin =>
      this.rawPortfolio.some(item => item.isin === isin)
    );
    if (!allRequestedAreKnown) {
      return { success: false, message: 'Reorder payload contains unknown ISINs' };
    }

    this.rawPortfolio = [...this.rawPortfolio]
      .sort((a, b) => {
        const aPosition = positionByIsin.get(a.isin);
        const bPosition = positionByIsin.get(b.isin);

        if (aPosition !== undefined && bPosition !== undefined) {
          return aPosition - bPosition;
        }

        if (aPosition !== undefined) {
          return -1;
        }

        if (bPosition !== undefined) {
          return 1;
        }

        return (a.order ?? 0) - (b.order ?? 0);
      })
      .map((item, index) => ({ ...item, order: index }));

    this.remapAndSave();
    return { success: true };
  }

  public deleteLot(isin: string, lotId: string): boolean {
    const item = this.rawPortfolio.find(i => i.isin === isin);
    if (!item) return false;
    const lotIndex = item.lots.findIndex(l => l.id === lotId);
    if (lotIndex === -1) return false;
    item.lots.splice(lotIndex, 1);
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

  private ensureUniqueTxnId(item: IStoredPortfolioItem, baseId: string): string {
    const transactions = item.transactions || [];
    if (!transactions.some(txn => txn.id === baseId)) return baseId;

    let suffix = 1;
    while (transactions.some(txn => txn.id === `${baseId}-${suffix}`)) {
      suffix += 1;
    }
    return `${baseId}-${suffix}`;
  }

  private ensureUniqueLotId(item: IStoredPortfolioItem, baseId: string): string {
    if (!item.lots.some(lot => lot.id === baseId)) return baseId;

    let suffix = 1;
    while (item.lots.some(lot => lot.id === `${baseId}-${suffix}`)) {
      suffix += 1;
    }
    return `${baseId}-${suffix}`;
  }

  public sellFromItem(
    isin: string,
    date: string,
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
      date,
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
    transferData: ITransferData
  ): { success: boolean; message?: string } {
    const {
      date,
      sourceQtySold,
      sourcePPU,
      sourceOpAmount,
      targetIsin,
      targetQtyReceived,
      targetPPU,
      targetOpAmount,
    } = transferData;

    if (sourceIsin === targetIsin) {
      return { success: false, message: 'sourceIsin and targetIsin must be different' };
    }

    const resolvedSourceOpAmount = sourceOpAmount ?? SafeMath.multiply(sourceQtySold, sourcePPU);
    const resolvedTargetOpAmount =
      targetOpAmount ?? SafeMath.multiply(targetQtyReceived, targetPPU);

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

    let totalFiscalCost = 0;
    const lotsConsumed: ILotConsumed[] = [];
    const transferBreakdown: ITransferBreakdown[] = [];
    const sourceTranches: ISourceTranche[] = [];

    this.lotService.matchLots(activeLots, sourceQtySold, (deducted, lot) => {
      const consumedFiscalCost = SafeMath.multiply(deducted, lot.costPerUnit);

      lotsConsumed.push({ lotId: lot.id, qty: deducted, costPerUnit: lot.costPerUnit });
      sourceTranches.push({
        sourceLotId: lot.id,
        sourceCreatedDate: lot.createdDate,
        sourceCostPerUnit: lot.costPerUnit,
        consumedQty: deducted,
        consumedFiscalCost,
        sourceCurrency: lot.currency,
        sourceExchangeRate: lot.exchangeRate,
      });
      totalFiscalCost = SafeMath.add(totalFiscalCost, consumedFiscalCost);

      lot.qtyRemaining = SafeMath.subtract(lot.qtyRemaining, deducted);
      lot.totalCost = SafeMath.multiply(lot.qtyRemaining, lot.costPerUnit);
    });

    let accTargetQty = 0;
    let accTargetOpAmount = 0;

    sourceTranches.forEach((tranche, index) => {
      const isLast = index === sourceTranches.length - 1;
      const ratio = SafeMath.divide(
        tranche.consumedQty,
        sourceQtySold,
        PortfolioService.TRANSFER_QTY_PRECISION
      );

      const trancheTargetQty = isLast
        ? SafeMath.subtract(targetQtyReceived, accTargetQty)
        : SafeMath.multiply(targetQtyReceived, ratio);

      const safeTargetQty = trancheTargetQty < 0 ? 0 : trancheTargetQty;
      const targetCostPerUnit =
        safeTargetQty === 0
          ? 0
          : SafeMath.divide(
              tranche.consumedFiscalCost,
              safeTargetQty,
              PortfolioService.TRANSFER_QTY_PRECISION
            );

      const trancheOpAmount = isLast
        ? SafeMath.subtract(resolvedTargetOpAmount, accTargetOpAmount)
        : SafeMath.multiply(resolvedTargetOpAmount, ratio);

      const newTransferLot: ILot = {
        id: this.ensureUniqueLotId(
          targetItem,
          `${targetIsin}-transfer-${date}-${tranche.sourceLotId}-${index + 1}`
        ),
        createdDate: tranche.sourceCreatedDate,
        qtyRemaining: safeTargetQty,
        costPerUnit: targetCostPerUnit,
        commission: 0,
        totalCost: tranche.consumedFiscalCost,
        currency: tranche.sourceCurrency,
        exchangeRate: tranche.sourceExchangeRate,
        transferDate: date,
        sourceIsin,
        sourceLotId: tranche.sourceLotId,
        operationPPU: targetPPU,
        operationAmount: trancheOpAmount,
        isTransfer: true,
      };

      targetItem.lots.push(newTransferLot);
      transferBreakdown.push({
        sourceLotId: tranche.sourceLotId,
        sourceCreatedDate: tranche.sourceCreatedDate,
        sourceCostPerUnit: tranche.sourceCostPerUnit,
        consumedQty: tranche.consumedQty,
        consumedFiscalCost: tranche.consumedFiscalCost,
        targetQty: safeTargetQty,
        targetCostPerUnit,
        operationAmount: trancheOpAmount,
      });

      accTargetQty = SafeMath.add(accTargetQty, safeTargetQty);
      accTargetOpAmount = SafeMath.add(accTargetOpAmount, trancheOpAmount);
    });

    if (!sourceItem.transactions) sourceItem.transactions = [];
    if (!sourceItem.realizedPnl) sourceItem.realizedPnl = 0;
    if (!targetItem.transactions) targetItem.transactions = [];
    if (!targetItem.realizedPnl) targetItem.realizedPnl = 0;

    sourceItem.transactions.push({
      id: this.ensureUniqueTxnId(sourceItem, `${sourceIsin}-transfer_out-${date}`),
      date,
      type: 'transfer_out',
      qty: sourceQtySold,
      pricePerUnit: sourcePPU,
      costBasis: totalFiscalCost,
      proceeds: 0,
      commission: 0,
      realizedPnl: 0,
      counterpartyIsin: targetIsin,
      lotsConsumed,
      operationAmount: resolvedSourceOpAmount,
      operationPPU: sourcePPU,
      transferBreakdown,
    });

    targetItem.transactions.push({
      id: this.ensureUniqueTxnId(targetItem, `${targetIsin}-transfer_in-${date}`),
      date,
      type: 'transfer_in',
      qty: targetQtyReceived,
      pricePerUnit: targetPPU,
      costBasis: totalFiscalCost,
      proceeds: 0,
      commission: 0,
      realizedPnl: 0,
      counterpartyIsin: sourceIsin,
      lotsConsumed: [],
      operationAmount: resolvedTargetOpAmount,
      operationPPU: targetPPU,
      transferBreakdown,
    });

    this.remapAndSave();
    return { success: true };
  }

  public async refreshPrices(): Promise<void> {
    try {
      const notEmptyItems = this.rawPortfolio.filter(item =>
        item.lots.some(lot => lot.qtyRemaining > 0)
      );
      if (notEmptyItems.length === 0) {
        loggerService.info('No assets with lots found, skipping price refresh.');
        return;
      }

      const concurrency = notEmptyItems.length;

      for (let i = 0; i < notEmptyItems.length; i += concurrency) {
        const batch = notEmptyItems.slice(i, i + concurrency);
        const promises = batch.map(async asset => {
          const page = await priceScrapingService.createPage();
          try {
            const priceData = await priceScrapingService.getInvestingPrice(page, asset);
            if (priceData) {
              asset.prevPrice = priceData.prevClose || priceData.currPrice;
              if (priceData.currPrice !== asset.currPrice) {
                asset.priceUpdateDate = new Date().toISOString();
                asset.currPrice = priceData.currPrice;
              }
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
    } finally {
      loggerService.emptyLine();
    }
  }

  public saveOnShutdown(): void {
    this.repo.save(this.rawPortfolio);
    priceScrapingService.closeBrowser();
    loggerService.emptyLine();
  }
}

const portfolioService = new PortfolioService();

export default portfolioService;
