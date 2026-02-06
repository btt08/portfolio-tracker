export interface IRecord {
  orderDate: string;
  executionDate: string;
  type: string;
  numShares: number;
  pricePerShare: number;
  commission: number;
  transferTo?: string;
  totalCost?: number;
  date?: string;
}

export interface IRawPortfolioItem {
  name: string;
  isin: string;
  type: string;
  link: string;
  prevPrice: number;
  currPrice: number;
  records: IRecord[];
}

export interface ILot {
  id: string;
  createdDate: string;
  qtyRemaining: number;
  costPerUnit: number;
  totalCost: number;
}

export interface IPortfolioItem {
  isin: string;
  name: string;
  link: string;
  numShares: number;
  totalInvested: number;
  marketValue: number;
  prevPrice: number;
  currPrice: number;
  avgPrice: number;
  dailyChangeEUR: number;
  dailyChangePerc: number;
  totalChangeEUR: number;
  totalChangePerc: number;
  records: IRecord[];
  lots: ILot[];
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface IPortfolioSummary {
  portfolioInvested: number;
  portfolioMarketValue: number;
  portfolioChangeEUR: number;
  portfolioChangePerc: number;
  portfolioDailyChangeEUR: number;
  portfolioDailyChangePerc: number;
}

export interface IPortfolio {
  items: IPortfolioItem[];
  summary: IPortfolioSummary;
}

export interface IItemMap {
  raw: IRawPortfolioItem;
  lots: ILot[];
  realizedPnl: number;
}
