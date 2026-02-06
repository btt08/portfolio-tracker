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

    const totalInvested = this.calcTotalInvested(mappedItems);
    const marketValue = this.calcTotalMarketValue(mappedItems);
    const prevMarketValue = this.calcPrevMarketValue(mappedItems);
    const totalChangeEUR = this.calcTotalChangeEUR(totalInvested, marketValue);
    const totalChangePerc = this.calcPercChange(totalInvested, marketValue);
    const totalDailyEUR = this.calcTotalDailyEUR(prevMarketValue, marketValue);
    const totalDailyPerc = this.calcPercChange(prevMarketValue, marketValue);

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
    };
  }

  private calcTotalChangeEUR(invested: number, currentValue: number): number {
    return this.math.safeSubtract(currentValue, invested);
  }

  private calcDailyChangeEUR(prevMarketValue: number, currentMarketValue: number): number {
    return this.math.safeSubtract(currentMarketValue, prevMarketValue);
  }

  private calcTotalInvested(items: IPortfolioItem[]): number {
    return items.reduce((total, item) => this.math.safeAdd(total, item.totalInvested), 0);
  }

  private calcTotalMarketValue(items: IPortfolioItem[]): number {
    return items.reduce((total, item) => this.math.safeAdd(total, item.marketValue), 0);
  }

  private calcPrevMarketValue(items: IPortfolioItem[]): number {
    return items.reduce(
      (total, item) =>
        this.math.safeAdd(total, this.math.safeMultiply(item.prevPrice, item.numShares)),
      0
    );
  }

  private calcTotalDailyEUR(prevMarketValue: number, marketValue: number): number {
    return this.math.safeSubtract(marketValue, prevMarketValue);
  }

  private calcPercChange(prevValue: number, currentValue: number): number {
    if (prevValue === 0) return 0;
    return (this.math.safeSubtract(currentValue, prevValue) * 100) / prevValue;
  }
}
