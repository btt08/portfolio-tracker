import { Request, Response } from 'express';
import { getPortfolioItems } from '../models/portfolio.model';

export const getPortfolio = (req: Request, res: Response): void => {
  try {
    const items = getPortfolioItems();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
