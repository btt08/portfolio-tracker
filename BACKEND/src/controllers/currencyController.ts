import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import currencyService from '../services/currency/currency.service';
import ICurrency from '../interfaces/currency.interface';

export const getCurrencies = asyncHandler((req: Request, res: Response) => {
  const currencies: ICurrency[] = currencyService.getCurrencyData();
  res.status(200).json({ success: true, data: currencies });
});

export const updateCurrencies = asyncHandler((req: Request, res: Response) => {
  const newCurrencies: ICurrency[] = req.body;
  currencyService.updateCurrencyData(newCurrencies);
  res.status(200).json({ success: true, message: 'Currency rates updated successfully' });
});
