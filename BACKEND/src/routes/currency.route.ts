import { getCurrencies } from '../controllers/currencyController';
import { Router } from 'express';

const router = Router();

router.get('/all', getCurrencies);

export default router;
