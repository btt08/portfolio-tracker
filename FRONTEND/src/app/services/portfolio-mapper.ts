import { inject, Injectable } from '@angular/core';
import { LotService } from './lot.service';
import { SafeMathService } from './safe-math.service';
import {
  IPortfolio,
  IPortfolioItem,
  IPortfolioSummary,
  IRawPortfolioItem,
} from '../interfaces/portfolio.interface';

@Injectable({
  providedIn: 'root',
})
export class PortfolioMapperService {
  private lotService = inject(LotService);
  private math = inject(SafeMathService);

  mapRawToPortfolio(rawData: IRawPortfolioItem[]): IPortfolio {
    const mappedItems = this.lotService.processRawData(rawData);

    const totalInvested = this.calcTotalInvested(mappedItems);
    console.log('Total Invested:', totalInvested);
    const marketValue = this.calcTotalMarketValue(mappedItems);
    console.log('Market Value:', marketValue);
    const prevMarketValue = this.calcPrevMarketValue(mappedItems);
    console.log('Previous Market Value:', prevMarketValue);
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

  private calcTotalChangeEUR(invested: number, currentValue: number): number {
    return this.math.safeSubtract(currentValue, invested);
  }

  private calcDailyChangeEUR(
    prevMarketValue: number,
    currentMarketValue: number
  ): number {
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
