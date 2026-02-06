import { Router } from 'express';
import {
  addPortfolioItem,
  addLotToItem,
  getPortfolio,
  refreshPortfolioPrices,
} from '../controllers/portfolioController';

const router = Router();

router.get('/', getPortfolio);
router.get('/refresh', refreshPortfolioPrices);

router.post('/add', addPortfolioItem);
router.post('/:isin/add', addLotToItem);

export default router;
