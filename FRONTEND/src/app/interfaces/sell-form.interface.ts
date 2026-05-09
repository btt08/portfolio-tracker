export interface ISellData {
  date: string;
  qtyToSell: number;
  sellPrice: number;
  commission: number;
}

export interface ISellFormModel {
  date: string;
  qtyToSell: number | null;
  sellPrice: number | null;
  commission: number | null;
}

export const DEFAULTS: ISellFormModel = {
  date: new Date().toISOString().split('T')[0],
  qtyToSell: null,
  sellPrice: null,
  commission: null,
};
