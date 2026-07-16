import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus, addOrderItems } from '../controllers/order.controller';
import { initiatePayment } from '../controllers/payment.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// Staff-only: full order list (KDS/admin) and status transitions
router.get('/', requireRole('ADMIN', 'KITCHEN'), getOrders);
router.patch('/:id/status', requireRole('ADMIN', 'KITCHEN'), updateOrderStatus);

// Customer flows stay public: place order, view own receipt, add items, pay
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id/items', addOrderItems);
router.post('/:id/payments', initiatePayment);

export default router;
