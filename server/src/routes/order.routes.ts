import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus, addOrderItems } from '../controllers/order.controller';
import { initiatePayment } from '../controllers/payment.controller';

const router = Router();

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/items', addOrderItems);
router.post('/:id/payments', initiatePayment);

export default router;
