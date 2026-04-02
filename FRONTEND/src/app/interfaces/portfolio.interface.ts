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

export interface ILotConsumed {
  lotId: string;
  qty: number;
  costPerUnit: number;
}

export interface ITransaction {
  id: string;
  date: string;
  type: 'sell' | 'transfer_out' | 'transfer_in';
  qty: number;
  pricePerUnit: number;
  costBasis: number;
  proceeds: number;
  commission: number;
  realizedPnl: number;
  counterpartyIsin?: string;
  lotsConsumed: ILotConsumed[];
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

export interface IResponse {
  success: boolean;
  data: IPortfolio;
  message?: string;
}
