import { SafeMath } from '../safe-math/safe-math.service';
import configService from '../config.service';
import {
  IPortfolio,
  IPortfolioItem,
  IPortfolioSummary,
  IStoredPortfolioItem,
} from '../../interfaces/portfolio.interface';

export class PortfolioMapperService {
  mapStoredToPortfolio(storedData: IStoredPortfolioItem[]): IPortfolio {
    const excludedIsins = configService.excludedIsins;
    const mappedItems = storedData.map(item => this.mapStoredItemToPortfolioItem(item));

    const { totalInvested, marketValue, prevMarketValue, realizedPnl, unrealizedPnl } =
      this.aggregatePortfolioTotals(mappedItems, excludedIsins);

    mappedItems.forEach(item => {
      item.portfolioPerc = marketValue === 0 ? 0 : (item.marketValue * 100) / marketValue;
    });

    const summary: IPortfolioSummary = {
      portfolioInvested: totalInvested,
      portfolioMarketValue: marketValue,
      portfolioChangeEUR: SafeMath.subtract(marketValue, totalInvested),
      portfolioChangePerc: this.calcPercChange(totalInvested, marketValue),
      portfolioDailyChangeEUR: SafeMath.subtract(marketValue, prevMarketValue),
      portfolioDailyChangePerc: this.calcPercChange(prevMarketValue, marketValue),
      portfolioRealizedPnl: realizedPnl,
      portfolioTotalPnl: SafeMath.add(realizedPnl, unrealizedPnl),
    };

    return { summary, items: mappedItems };
  }

  private aggregatePortfolioTotals(items: IPortfolioItem[], excludedIsins: string[]) {
    let totalInvested = 0;
    let marketValue = 0;
    let prevMarketValue = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;

    for (const item of items) {
      if (excludedIsins.includes(item.isin)) continue;
      totalInvested = SafeMath.add(totalInvested, item.totalInvested);
      marketValue = SafeMath.add(marketValue, item.marketValue);
      prevMarketValue = SafeMath.add(
        prevMarketValue,
        SafeMath.subtract(item.marketValue, item.dailyChangeEUR)
      );
      realizedPnl = SafeMath.add(realizedPnl, item.realizedPnl);
      unrealizedPnl = SafeMath.add(unrealizedPnl, item.unrealizedPnl);
    }

    return { totalInvested, marketValue, prevMarketValue, realizedPnl, unrealizedPnl };
  }

  private mapStoredItemToPortfolioItem(stored: IStoredPortfolioItem): IPortfolioItem {
    const priceUnit = stored.priceUnit || 1;
    const normalizedCurrPrice = SafeMath.divide(stored.currPrice || 0, priceUnit);
    const normalizedPrevPrice = SafeMath.divide(stored.prevPrice || 0, priceUnit);

    // Single pass over lots
    let numShares = 0;
    let totalInvested = 0;
    let marketValue = 0;
    let prevMarketValue = 0;
    let unrealizedPnl = 0;

    for (const lot of stored.lots) {
      if (lot.qtyRemaining <= 0) continue;
      const costPerUnit = lot.costPerUnit || 0;

      numShares = SafeMath.add(numShares, lot.qtyRemaining);
      totalInvested = SafeMath.add(
        totalInvested,
        SafeMath.valuate(lot.qtyRemaining, costPerUnit, 1, lot.commission)
      );
      marketValue = SafeMath.add(
        marketValue,
        SafeMath.valuate(lot.qtyRemaining, normalizedCurrPrice)
      );
      prevMarketValue = SafeMath.add(
        prevMarketValue,
        SafeMath.valuate(lot.qtyRemaining, normalizedPrevPrice)
      );

      unrealizedPnl = SafeMath.add(
        unrealizedPnl,
        SafeMath.unrealizedPnl(
          lot.qtyRemaining,
          normalizedCurrPrice,
          costPerUnit,
          1,
          lot.commission
        )
      );
    }
    const avgPrice = numShares === 0 ? 0 : SafeMath.divide(totalInvested, numShares);
    const realizedPnl = stored.realizedPnl || 0;

    return {
      isin: stored.isin,
      name: stored.name,
      type: stored.type,
      link: stored.link || '',
      numShares,
      totalInvested,
      marketValue,
      prevPrice: normalizedPrevPrice,
      currPrice: normalizedCurrPrice,
      avgPrice,
      dailyChangeEUR: SafeMath.subtract(marketValue, prevMarketValue),
      dailyChangePerc: this.calcPercChange(prevMarketValue, marketValue),
      totalChangeEUR: SafeMath.subtract(marketValue, totalInvested),
      totalChangePerc: this.calcPercChange(totalInvested, marketValue),
      lots: stored.lots,
      realizedPnl,
      unrealizedPnl,
      totalPnl: SafeMath.add(realizedPnl, unrealizedPnl),
      transactions: stored.transactions || [],
      portfolioPerc: 0,
      isExcluded: false,
    };
  }

  private calcPercChange(prevValue: number, currentValue: number): number {
    return SafeMath.percChange(prevValue, currentValue);
  }
}

const portfolioMapper = new PortfolioMapperService();
export default portfolioMapper;
