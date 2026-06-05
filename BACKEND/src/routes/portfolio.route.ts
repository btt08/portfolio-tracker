import { Router } from 'express';
import {
  addLotToItem,
  addPortfolioItem,
  deleteLot,
  deletePortfolioItem,
  exportPortfolio,
  getPortfolio,
  importPortfolio,
  refreshPortfolioPrices,
  reorderPortfolio,
  sellFromItem,
  transferBetweenFunds,
} from '../controllers/portfolioController';
import { validate } from '../middlewares/validate';
import {
  LotSchema,
  PortfolioItemInputSchema,
  ReorderPortfolioSchema,
  SellSchema,
  TransferSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', getPortfolio);
router.get('/refresh', refreshPortfolioPrices);
router.get('/export', exportPortfolio);

router.post('/add', validate(PortfolioItemInputSchema), addPortfolioItem);
router.post('/import', importPortfolio);
router.post('/reorder', validate(ReorderPortfolioSchema), reorderPortfolio);
router.post('/:isin/add', validate(LotSchema), addLotToItem);
router.post('/:isin/sell', validate(SellSchema), sellFromItem);
router.post('/:isin/transfer', validate(TransferSchema), transferBetweenFunds);
router.delete('/:isin', deletePortfolioItem);
router.delete('/:isin/:lotId', deleteLot);

export default router;
