import { Request, Response } from 'express';
import portfolioService from '../services/portfolio.service';
import { IStoredPortfolioItem, ILot } from '../interfaces/portfolio.interface';
import {
  PortfolioItemInputSchema,
  LotSchema,
  SellSchema,
  TransferSchema,
} from '../validation/schemas';
import { asyncHandler } from '../middlewares/asyncHandler';

export const addPortfolioItem = asyncHandler((req: Request, res: Response) => {
  const validation = PortfolioItemInputSchema.safeParse(req.body);
  if (!validation.success) {
    res
      .status(400)
      .json({ success: false, message: 'Invalid input', errors: validation.error.issues });
    return;
  }
  const newItem: IStoredPortfolioItem = {
    ...validation.data,
    lots: [],
    prevPrice: 0,
    currPrice: 0,
    priceUnit: 1,
    realizedPnl: 0,
    transactions: [],
  };
  portfolioService.addPortfolioItem(newItem);
  res.status(201).json({ success: true, data: newItem });
});

export const getPortfolio = asyncHandler((req: Request, res: Response) => {
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});

export const addLotToItem = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const validation = LotSchema.safeParse(req.body);
  if (!validation.success) {
    res
      .status(400)
      .json({ success: false, message: 'Invalid lot data', errors: validation.error.issues });
    return;
  }
  const newLot: ILot = validation.data;
  const success = portfolioService.addLotToItem(isin as string, newLot);
  if (!success) {
    res.status(404).json({ success: false, message: `Item with ISIN ${isin} not found` });
    return;
  }
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});

export const sellFromItem = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const validation = SellSchema.safeParse(req.body);
  if (!validation.success) {
    res
      .status(400)
      .json({ success: false, message: 'Invalid sell data', errors: validation.error.issues });
    return;
  }
  const { qtyToSell, sellPrice, commission } = validation.data;
  const result = portfolioService.sellFromItem(isin as string, qtyToSell, sellPrice, commission);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: `Failed to sell shares for item with ISIN ${isin}: ${result.message}`,
    });
    return;
  }
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});

export const refreshPortfolioPrices = asyncHandler(async (req: Request, res: Response) => {
  await portfolioService.refreshPrices();
  const portfolio = portfolioService.getPortfolio();
  res
    .status(200)
    .json({ success: true, data: portfolio, message: 'Prices refreshed successfully' });
});

export const transferBetweenFunds = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const validation = TransferSchema.safeParse(req.body);
  if (!validation.success) {
    res
      .status(400)
      .json({ success: false, message: 'Invalid transfer data', errors: validation.error.issues });
    return;
  }
  const { targetIsin, sourceQtySold, targetQtyReceived, commission } = validation.data;
  const result = portfolioService.transferBetweenFunds(
    isin as string,
    targetIsin,
    sourceQtySold,
    targetQtyReceived,
    commission
  );
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: `Failed to transfer funds for item with ISIN ${isin}: ${result.message}`,
    });
    return;
  }
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});
