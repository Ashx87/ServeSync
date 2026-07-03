import { Router } from 'express';
import { getCategories } from '../controllers/category.controller';
import { getMenuItems } from '../controllers/menuItem.controller';

const router = Router();

router.get('/categories', getCategories);
router.get('/items', getMenuItems);

export default router;
