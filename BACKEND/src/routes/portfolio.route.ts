import { Router } from 'express';
import {
  addPortfolioItem,
  addLotToItem,
  sellFromItem,
  getPortfolio,
  refreshPortfolioPrices,
} from '../controllers/portfolioController';

const router = Router();

router.get('/', getPortfolio);
router.get('/refresh', refreshPortfolioPrices);

router.post('/add', addPortfolioItem);
router.post('/:isin/add', addLotToItem);
router.post('/:isin/sell', sellFromItem);

export default router;
