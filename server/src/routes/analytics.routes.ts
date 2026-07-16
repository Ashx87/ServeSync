import { Router } from 'express';
import {
  getDailyRevenue,
  getTopSellingItems,
  getCategoryDistribution,
  getSummaryStats,
} from '../controllers/analytics.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// Business analytics are admin-only
router.use(requireRole('ADMIN'));

router.get('/revenue', getDailyRevenue);
router.get('/top-items', getTopSellingItems);
router.get('/category-distribution', getCategoryDistribution);
router.get('/summary', getSummaryStats);

export default router;
