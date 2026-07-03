import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuItem.controller';

const router = Router();

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/items', getMenuItems);
router.post('/items', createMenuItem);
router.patch('/items/:id', updateMenuItem);
router.delete('/items/:id', deleteMenuItem);

export default router;
