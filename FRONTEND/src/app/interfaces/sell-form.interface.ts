export interface ISellData {
  qtyToSell: number;
  sellPrice: number;
  commission: number;
}

export interface ISellFormModel {
  qtyToSell: number | null;
  sellPrice: number | null;
  commission: number | null;
}

export const DEFAULTS: ISellFormModel = {
  qtyToSell: null,
  sellPrice: null,
  commission: null,
};
