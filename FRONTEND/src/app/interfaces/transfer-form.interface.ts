export interface ITransferFormModel {
  date: string;
  sourceQtySold: number | null;
  sourcePricePerUnit: number | null;
  targetIsin: string;
  targetQtyReceived: number | null;
  targetPricePerUnit: number | null;
}

export const DEFAULTS: ITransferFormModel = {
  date: new Date().toISOString().split('T')[0],
  targetIsin: '',
  sourceQtySold: null,
  sourcePricePerUnit: null,
  targetQtyReceived: null,
  targetPricePerUnit: null,
};
