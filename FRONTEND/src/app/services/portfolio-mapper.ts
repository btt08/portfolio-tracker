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

    const summary: IPortfolioSummary = {
      portfolioInvested: this.calcPortfolioInvested(mappedItems),
      portfolioMarketValue: this.calcPortfolioMarketValue(mappedItems),
      portfolioChangeEUR: this.calcPortfolioChangeEUR(mappedItems),
      portfolioChangePerc: this.calcPortfolioChangePerc(mappedItems),
      portfolioDailyChangeEUR: this.calcPortfolioDailyChangeEUR(mappedItems),
      portfolioDailyChangePerc: this.calcPortfolioDailyChangePerc(mappedItems),
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

  private calcPortfolioInvested(items: IPortfolioItem[]): number {
    return items.reduce((total, item) => this.math.safeAdd(total, item.totalInvested), 0);
  }

  private calcPortfolioMarketValue(items: IPortfolioItem[]): number {
    return items.reduce((total, item) => this.math.safeAdd(total, item.marketValue), 0);
  }

  private calcPortfolioChangeEUR(items: IPortfolioItem[]): number {
    return items.reduce(
      (total, item) => this.math.safeAdd(total, item.totalChangeEUR),
      0
    );
  }

  private calcPortfolioDailyChangeEUR(items: IPortfolioItem[]): number {
    return items.reduce(
      (total, item) => this.math.safeAdd(total, item.dailyChangeEUR),
      0
    );
  }

  private calcPortfolioChangePerc(items: IPortfolioItem[]): number {
    return items.reduce(
      (total, item) => this.math.safeAdd(total, item.totalChangePerc),
      0
    );
  }

  private calcPortfolioDailyChangePerc(items: IPortfolioItem[]): number {
    return items.reduce(
      (total, item) => this.math.safeAdd(total, item.dailyChangePerc),
      0
    );
  }
}
