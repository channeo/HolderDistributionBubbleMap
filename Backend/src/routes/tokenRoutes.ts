import { Router } from 'express';
import {
  getMetadata,
  getHolders,
  getDistribution,
  getTransactions,
} from '../controllers/tokenController';

const router = Router();

router.get('/token/:address/metadata', getMetadata);
router.get('/token/:address/holders', getHolders); 
router.get('/token/:address/distribution', getDistribution);
router.get('/token/:address/transactions', getTransactions);

export default router;