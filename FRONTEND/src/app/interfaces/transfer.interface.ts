export interface ITransferData {
  date: string;
  sourceQtySold: number;
  sourcePPU: number;
  sourceOpAmount: number;
  sourceAmountSold?: number;
  targetIsin: string;
  targetQtyReceived: number;
  targetPPU: number;
  targetOpAmount: number;
  targetAmountReceived?: number;
}
