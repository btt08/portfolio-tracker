import { Router } from 'express';
import {
  addLotToItem,
  addPortfolioItem,
  deletePortfolioItem,
  deleteLot,
  exportPortfolio,
  getPortfolio,
  importPortfolio,
  refreshPortfolioPrices,
  sellFromItem,
  transferBetweenFunds,
} from '../controllers/portfolioController';
import { validate } from '../middlewares/validate';
import {
  PortfolioItemInputSchema,
  LotSchema,
  SellSchema,
  TransferSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', getPortfolio);
router.get('/refresh', refreshPortfolioPrices);
router.get('/export', exportPortfolio);

router.post('/add', validate(PortfolioItemInputSchema), addPortfolioItem);
router.post('/import', importPortfolio);
router.post('/:isin/add', validate(LotSchema), addLotToItem);
router.post('/:isin/sell', validate(SellSchema), sellFromItem);
router.post('/:isin/transfer', validate(TransferSchema), transferBetweenFunds);
router.delete('/:isin', deletePortfolioItem);
router.delete('/:isin/:lotId', deleteLot);

export default router;
