export interface ITransferFormModel {
  date: string;
  sourceQtySold: number | null;
  sourcePPU: number | null;
  targetIsin: string;
  targetQtyReceived: number | null;
  targetPPU: number | null;
}

export const DEFAULTS: ITransferFormModel = {
  date: new Date().toISOString().split('T')[0],
  targetIsin: '',
  sourceQtySold: null,
  sourcePPU: null,
  targetQtyReceived: null,
  targetPPU: null,
};
