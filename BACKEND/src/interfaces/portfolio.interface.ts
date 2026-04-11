export interface IRecord {
  orderDate: string;
  executionDate: string;
  type: string;
  numShares: number;
  pricePerShare: number;
  commission: number;
  transferTo?: string;
  transferFrom?: string;
  totalCost?: number;
  date?: string;
  originalTotalCost?: number;
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

export interface IItemMap {
  raw: IRawPortfolioItem;
  lots: ILot[];
  realizedPnl: number;
}

export interface ILot {
  id: string;
  createdDate: string;
  qtyRemaining: number;
  costPerUnit: number;
  commission: number;
  totalCost: number;
  currency: string;
  exchangeRate: number;
}

export interface IPortfolioItem {
  isin: string;
  name: string;
  type: string;
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
  lots: ILot[];
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  transactions: ITransaction[];
  portfolioPerc: number;
  isExcluded: boolean;
}

export interface IPortfolioSummary {
  portfolioInvested: number;
  portfolioMarketValue: number;
  portfolioChangeEUR: number;
  portfolioChangePerc: number;
  portfolioDailyChangeEUR: number;
  portfolioDailyChangePerc: number;
  portfolioRealizedPnl: number;
  portfolioTotalPnl: number;
}

export interface IPortfolio {
  items: IPortfolioItem[];
  summary: IPortfolioSummary;
}

export interface ILotConsumed {
  lotId: string;
  qty: number;
  costPerUnit: number;
}

export interface IAvailableQty {
  activeLots: ILot[];
  totalAvailable: number;
}

export interface ITransaction {
  id: string;
  date: string;
  type: 'buy' | 'sell' | 'transfer_out' | 'transfer_in';
  qty: number;
  pricePerUnit: number;
  costBasis: number;
  proceeds: number;
  commission: number;
  realizedPnl: number;
  counterpartyIsin?: string;
  lotsConsumed: ILotConsumed[];
}

export interface IStoredPortfolioItem {
  isin: string;
  name: string;
  type: string;
  link: string;
  prevPrice: number;
  currPrice: number;
  lots: ILot[];
  priceUnit: number;
  realizedPnl: number;
  transactions: ITransaction[];
}
