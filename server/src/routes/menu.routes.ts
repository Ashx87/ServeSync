import { Router } from 'express';
import { getCategories, getMenuItems } from '../controllers/menu.controller';

const router = Router();

router.get('/categories', getCategories);
router.get('/items', getMenuItems);

export default router;
