export interface ITransferFormModel {
  targetIsin: string;
  sourceQtySold: number | null;
  targetQtyReceived: number | null;
  commission: number | null;
}

export const DEFAULTS: ITransferFormModel = {
  targetIsin: '',
  sourceQtySold: null,
  targetQtyReceived: null,
  commission: null,
};
