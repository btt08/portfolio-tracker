import { Injectable } from '@angular/core';
import {
  IPortfolioItem,
  IGroupedPortfolioItem,
} from 'app/interfaces/portfolio.interface';
import { TSortKey, TSortDir } from 'app/types/shares-table.types';

@Injectable({
  providedIn: 'root',
})
export class PortfolioUtilsService {
  mapItemsToGroups(
    items: IPortfolioItem[],
    sortKey: TSortKey | null,
    sortDir: TSortDir
  ): IGroupedPortfolioItem[] {
    const groups = new Map<string, IGroupedPortfolioItem>();

    for (const item of items) {
      const type = item.type || 'Other';
      if (!groups.has(type)) {
        groups.set(type, this.getDefaultGroupedPortfolioItem(type));
      }
      const g = groups.get(type)!;
      g.items.push(item);
      g.weight += item.isExcluded ? 0 : item.portfolioPerc;
      g.marketValue += item.marketValue;
      g.invested += item.totalInvested;
      g.dailyChangeEUR += item.dailyChangeEUR;
    }

    if (sortKey) {
      for (const g of groups.values()) {
        g.items.sort((a, b) => {
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
          }
          const aStr = String(aVal ?? '');
          const bStr = String(bVal ?? '');
          return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
    }

    return [...groups.values()].map(g => {
      g.dailyChangeEUR = g.items.reduce((sum, i) => sum + i.dailyChangeEUR, 0);
      const prevMarketValue = g.marketValue - g.dailyChangeEUR;
      g.dailyChangePerc = prevMarketValue
        ? (g.dailyChangeEUR / prevMarketValue) * 100
        : 0;
      g.totalChangeEUR = g.marketValue - g.invested;
      g.totalChangePerc = g.invested ? (g.totalChangeEUR / g.invested) * 100 : 0;
      return g;
    });
  }

  getDefaultGroupedPortfolioItem(
    type: string = '',
    items: IPortfolioItem[] = []
  ): IGroupedPortfolioItem {
    return {
      type: type,
      items: items,
      hide: false,
      weight: 0,
      marketValue: 0,
      invested: 0,
      dailyChangeEUR: 0,
      dailyChangePerc: 0,
      totalChangeEUR: 0,
      totalChangePerc: 0,
    };
  }
}
