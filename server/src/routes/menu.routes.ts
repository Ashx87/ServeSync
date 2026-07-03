import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { getMenuItems } from '../controllers/menuItem.controller';

const router = Router();

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/items', getMenuItems);

export default router;
