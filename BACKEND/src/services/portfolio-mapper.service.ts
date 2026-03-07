import { SafeMathService } from './safe-math.service';
import {
  IPortfolio,
  IPortfolioItem,
  IPortfolioSummary,
  IStoredPortfolioItem,
} from '../interfaces/portfolio.interface';

export class PortfolioMapperService {
  private math = new SafeMathService();

  mapStoredToPortfolio(storedData: IStoredPortfolioItem[]): IPortfolio {
    const mappedItems = storedData.map(item => this.mapStoredItemToPortfolioItem(item));
    const excludedIsins = ['ES0128520006'];

    const totalInvested = this.calcTotalInvested(mappedItems);
    const marketValue = this.calcTotalMarketValue(mappedItems);
    const marketValueForWeights = this.calcTotalMarketValue(mappedItems, excludedIsins);
    const totalInvestedForReturns = this.calcTotalInvested(mappedItems, excludedIsins);

    mappedItems.forEach(item => {
      if (excludedIsins.includes(item.isin)) {
        item.portfolioPerc = 0;
      } else {
        item.portfolioPerc =
          marketValueForWeights === 0 ? 0 : (item.marketValue * 100) / marketValueForWeights;
      }
    });

    const prevMarketValueForReturns = this.calcPrevMarketValue(mappedItems, excludedIsins);

    const totalChangeEUR = this.calcTotalChangeEUR(totalInvestedForReturns, marketValueForWeights);
    const totalChangePerc = this.calcPercChange(totalInvestedForReturns, marketValueForWeights);
    const totalDailyEUR = this.calcTotalDailyEUR(prevMarketValueForReturns, marketValueForWeights);
    const totalDailyPerc = this.calcPercChange(prevMarketValueForReturns, marketValueForWeights);

    const summary: IPortfolioSummary = {
      portfolioInvested: totalInvested,
      portfolioMarketValue: marketValue,
      portfolioChangeEUR: totalChangeEUR,
      portfolioChangePerc: totalChangePerc,
      portfolioDailyChangeEUR: totalDailyEUR,
      portfolioDailyChangePerc: totalDailyPerc,
    };

    return { summary, items: mappedItems };
  }

  private mapStoredItemToPortfolioItem(stored: IStoredPortfolioItem): IPortfolioItem {
    const numShares = stored.lots.reduce((s, l) => this.math.safeAdd(s, l.qtyRemaining), 0);
    const totalInvested = stored.lots.reduce((s, l) => {
      const value = l.qtyRemaining > 0 ? this.math.safeAdd(s, l.totalCost) : s;

      return value;
    }, 0);

    const marketValue = this.math.safeMultiply(stored.currPrice || 0, numShares);
    const avgPrice = numShares === 0 ? 0 : this.math.safeDivide(totalInvested, numShares);
    const prevMarketValue = this.math.safeMultiply(stored.prevPrice || 0, numShares);
    const unrealizedPnl = stored.lots.reduce(
      (acc, lot) =>
        this.math.safeAdd(
          acc,
          this.math.safeMultiply(
            lot.qtyRemaining,
            this.math.safeSubtract(stored.currPrice || 0, lot.costPerUnit)
          )
        ),
      0
    );

    return {
      isin: stored.isin,
      name: stored.name,
      type: stored.type,
      link: stored.link || '',
      numShares,
      totalInvested,
      marketValue,
      prevPrice: stored.prevPrice || 0,
      currPrice: stored.currPrice || 0,
      avgPrice,
      dailyChangeEUR: this.calcDailyChangeEUR(prevMarketValue, marketValue),
      dailyChangePerc: this.calcPercChange(prevMarketValue, marketValue),
      totalChangeEUR: this.calcTotalChangeEUR(totalInvested, marketValue),
      totalChangePerc: this.calcPercChange(totalInvested, marketValue),
      lots: stored.lots,
      realizedPnl: 0, // TODO: calculate if needed
      unrealizedPnl,
      portfolioPerc: 0, // calculated after all items are mapped
    };
  }

  private calcTotalChangeEUR(invested: number, currentValue: number): number {
    return this.math.safeSubtract(currentValue, invested);
  }

  private calcDailyChangeEUR(prevMarketValue: number, currentMarketValue: number): number {
    return this.math.safeSubtract(currentMarketValue, prevMarketValue);
  }

  private calcTotalInvested(items: IPortfolioItem[], excludedIsins: string[] = []): number {
    return items.reduce((total, item) => {
      if (excludedIsins.includes(item.isin)) return total;
      return this.math.safeAdd(total, item.totalInvested);
    }, 0);
  }

  private calcTotalMarketValue(items: IPortfolioItem[], excludedIsins: string[] = []): number {
    return items.reduce(
      (total, item) =>
        excludedIsins.includes(item.isin) ? total : this.math.safeAdd(total, item.marketValue),
      0
    );
  }

  private calcPrevMarketValue(items: IPortfolioItem[], excludedIsins: string[] = []): number {
    return items.reduce((total, item) => {
      if (excludedIsins.includes(item.isin)) return total;
      return this.math.safeAdd(total, this.math.safeMultiply(item.prevPrice, item.numShares));
    }, 0);
  }

  private calcTotalDailyEUR(prevMarketValue: number, marketValue: number): number {
    return this.math.safeSubtract(marketValue, prevMarketValue);
  }

  private calcPercChange(prevValue: number, currentValue: number): number {
    if (prevValue === 0) return 0;
    return (this.math.safeSubtract(currentValue, prevValue) * 100) / prevValue;
  }
}
