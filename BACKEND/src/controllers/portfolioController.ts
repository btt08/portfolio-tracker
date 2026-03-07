import { Request, Response } from 'express';
import portfolioService from '../services/portfolio.service';
import { IStoredPortfolioItem, ILot } from '../interfaces/portfolio.interface';
import loggerService from '../services/logger.service';
import { PortfolioItemInputSchema, LotSchema } from '../validation/schemas';

export const addPortfolioItem = (req: Request, res: Response): void => {
  try {
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
    };
    portfolioService.addPortfolioItem(newItem);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    loggerService.error('Error adding portfolio item', error as Error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getPortfolio = (req: Request, res: Response): void => {
  try {
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    loggerService.error('Error getting portfolio', error as Error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const addLotToItem = (req: Request, res: Response): void => {
  try {
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
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    loggerService.error('Error adding lot to item', error as Error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const refreshPortfolioPrices = async (req: Request, res: Response): Promise<void> => {
  loggerService.info('Refreshing portfolio prices');
  try {
    await portfolioService.refreshPrices();
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({
      success: true,
      data: portfolio,
      message: 'Prices refreshed successfully',
    });
  } catch (error) {
    loggerService.error('Error refreshing portfolio prices', error as Error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
