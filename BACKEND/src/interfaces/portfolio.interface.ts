export interface IRecord {
  date: string;
  type: string;
  amount: number;
  pricePerShare: number;
}

export interface IPortfolioItem {
  name: string;
  isin: string;
  type: string;
  link: string;
  currPrice: number;
  records: IRecord[];
}
