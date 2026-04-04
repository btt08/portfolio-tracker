export interface ILotFormModel {
  createdDate: string;
  qtyRemaining: number | null;
  costPerUnit: number | null;
  commission: number | null;
  currency: string;
  exchangeRate: number | null;
}

export const DEFAULTS: ILotFormModel = {
  createdDate: '',
  qtyRemaining: null,
  costPerUnit: null,
  commission: null,
  currency: 'EUR',
  exchangeRate: 1,
};
