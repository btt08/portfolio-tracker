import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import portfolioService from '../services/portfolio/portfolio.service';
import { ImportPortfolioSchema } from '../validation/schemas';
import { IStoredPortfolioItem, ILot, ITransaction } from '../interfaces/portfolio.interface';
import loggerService from '../services/logger.service';

export const addPortfolioItem = asyncHandler((req: Request, res: Response) => {
  const { lots: inputLots, ...itemFields } = req.validated;
  const lots: ILot[] = inputLots || [];
  const transactions: ITransaction[] = lots.map(lot => ({
    id: `${itemFields.isin}-buy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: lot.createdDate,
    type: 'buy',
    qty: lot.qtyRemaining,
    pricePerUnit: lot.costPerUnit,
    costBasis: lot.totalCost,
    proceeds: 0,
    commission: lot.commission,
    realizedPnl: 0,
    lotsConsumed: [],
  }));

  const newItem: IStoredPortfolioItem = {
    ...itemFields,
    lots,
    prevPrice: 0,
    currPrice: 0,
    priceUnit: 1,
    realizedPnl: 0,
    transactions,
  };
  portfolioService.addPortfolioItem(newItem);
  const portfolio = portfolioService.getPortfolio();
  res.status(201).json({ success: true, data: portfolio });
});

export const getPortfolio = asyncHandler((req: Request, res: Response) => {
  console.log('Fetching portfolio...');
  const portfolio = portfolioService.getPortfolio();
  loggerService.info('Portfolio fetched successfully');
  res.status(200).json({ success: true, data: portfolio });
});

export const addLotToItem = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const newLot: ILot = req.validated;
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
  const { qtyToSell, sellPrice, commission } = req.validated;
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
  console.log('Refreshing portfolio prices...');
  await portfolioService.refreshPrices();
  const portfolio = portfolioService.getPortfolio();
  res
    .status(200)
    .json({ success: true, data: portfolio, message: 'Prices refreshed successfully' });
});

export const deletePortfolioItem = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const success = portfolioService.deletePortfolioItem(isin as string);
  if (!success) {
    res.status(404).json({ success: false, message: `Item with ISIN ${isin} not found` });
    return;
  }
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});

export const deleteLot = asyncHandler((req: Request, res: Response) => {
  const { isin, lotId } = req.params;
  const success = portfolioService.deleteLot(isin as string, lotId as string);
  if (!success) {
    res.status(404).json({
      success: false,
      message: `Lot with ID ${lotId} for item with ISIN ${isin} not found`,
    });
    return;
  }
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});

export const transferBetweenFunds = asyncHandler((req: Request, res: Response) => {
  const { isin } = req.params;
  const { targetIsin, sourceQtySold, targetQtyReceived, commission } = req.validated;
  const result = portfolioService.transferBetweenFunds(
    isin as string,
    targetIsin as string,
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

export const exportPortfolio = asyncHandler((req: Request, res: Response) => {
  const raw = portfolioService.getRawPortfolio();
  res.status(200).json(raw);
});

export const importPortfolio = asyncHandler((req: Request, res: Response) => {
  const result = ImportPortfolioSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid portfolio format',
      errors: result.error.issues,
    });
    return;
  }
  portfolioService.importPortfolio(result.data as IStoredPortfolioItem[]);
  const portfolio = portfolioService.getPortfolio();
  res.status(200).json({ success: true, data: portfolio });
});
