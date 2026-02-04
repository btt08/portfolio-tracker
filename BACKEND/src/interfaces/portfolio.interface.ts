export interface IRecord {
  orderDate: string;
  executionDate: string;
  type: string;
  numShares: number;
  pricePerShare: number;
  commission: number;
}

export interface IPortfolioItem {
  name: string;
  isin: string;
  type: string;
  link: string;
  prevPrice: number;
  currPrice: number;
  records: IRecord[];
}
