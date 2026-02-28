import { Router } from 'express';
import {
  getDailyRevenue,
  getTopSellingItems,
  getCategoryDistribution,
  getSummaryStats,
} from '../controllers/analytics.controller';

const router = Router();

router.get('/revenue', getDailyRevenue);
router.get('/top-items', getTopSellingItems);
router.get('/category-distribution', getCategoryDistribution);
router.get('/summary', getSummaryStats);

export default router;
