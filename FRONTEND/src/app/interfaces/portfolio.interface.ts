export interface IRawRecord {
  date: string;
  type: string;
  numShares: number;
  pricePerShare: number;
  commission: number;
  // Optional target ISIN when the record represents a transfer to another fund
  transferTo?: string;
}

export interface IRawPortfolioItem {
  isin: string;
  name: string;
  type: string;
  link: string;
  prevPrice: number;
  currPrice: number;
  records: IRawRecord[];
}

export interface IRecord extends IRawRecord {
  totalCost: number;
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
  lots?: ILot[];
  realizedPnl?: number;
  unrealizedPnl?: number;
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
