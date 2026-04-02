export interface ISellData {
  qtyToSell: number;
  sellPrice: number;
  commission: number;
}

export interface ISellFormState {
  qtyToSell: number | null;
  sellPrice: number | null;
  commission: number | null;
}
