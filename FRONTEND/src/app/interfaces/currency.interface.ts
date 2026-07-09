export interface ICurrencyResponse {
  success: boolean;
  data: ICurrency[];
}

export interface ICurrency {
  name: string;
  symbol: string;
  code: string;
  exchangeRateToEur: number;
  link: string;
}
