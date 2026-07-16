import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuItem.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// Reads are public (customer menu); writes are admin-only
router.get('/categories', getCategories);
router.post('/categories', requireRole('ADMIN'), createCategory);
router.patch('/categories/:id', requireRole('ADMIN'), updateCategory);
router.delete('/categories/:id', requireRole('ADMIN'), deleteCategory);

router.get('/items', getMenuItems);
router.post('/items', requireRole('ADMIN'), createMenuItem);
router.patch('/items/:id', requireRole('ADMIN'), updateMenuItem);
router.delete('/items/:id', requireRole('ADMIN'), deleteMenuItem);

export default router;
