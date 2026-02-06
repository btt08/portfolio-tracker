import { Request, Response } from 'express';
import portfolioService from '../services/portfolio.service';
import { IRawPortfolioItem } from '../interfaces/portfolio.interface';

export const addPortfolioItem = (req: Request, res: Response): void => {
  try {
    const newItem: IRawPortfolioItem = req.body;
    portfolioService.addPortfolioItem(newItem);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error adding portfolio item:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getPortfolio = (req: Request, res: Response): void => {
  try {
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Error getting portfolio:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const addRecordToItem = (req: Request, res: Response): void => {
  try {
    const { isin } = req.params;
    const newRecord = req.body;
    const success = portfolioService.addRecordToItem(isin as string, newRecord);
    if (!success) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Error adding record to item:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const refreshPortfolioPrices = async (req: Request, res: Response): Promise<void> => {
  console.log('Refreshing portfolio prices...');
  try {
    await portfolioService.refreshPrices();
    const portfolio = portfolioService.getPortfolio();
    res.status(200).json({
      success: true,
      data: portfolio,
      message: 'Prices refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing portfolio prices:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
