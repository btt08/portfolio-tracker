import { WritableSignal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { ILot } from 'app/interfaces/portfolio.interface';

export interface IAddItemData {
  isin: string;
  name: string;
  type: string;
  link: string;
  lots?: ILot[];
}

export interface IItemFormModel {
  isin: string;
  name: string;
  type: string;
  link: string;
}

export interface ILotRowModel {
  date: string;
  qty: number | null;
  costPerUnit: number | null;
  commission: number | null;
  currency: string;
  exchangeRate: number | null;
}

export const LOT_DEFAULTS: ILotRowModel = {
  date: '',
  qty: null,
  costPerUnit: null,
  commission: null,
  currency: 'EUR',
  exchangeRate: 1,
};

export function createLotRowForm(model: WritableSignal<ILotRowModel>) {
  return form(model);
}

export type LotFieldTree = ReturnType<typeof createLotRowForm>;
