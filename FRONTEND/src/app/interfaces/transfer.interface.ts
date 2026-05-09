export interface ITransferData {
  date: string;
  sourceQtySold: number;
  sourcePricePerUnit: number;
  sourceAmountSold: number;
  targetIsin: string;
  targetQtyReceived: number;
  targetPricePerUnit: number;
  targetAmountReceived: number;
}
