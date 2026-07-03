import { Router } from 'express';
import { confirmPaymentWebhook } from '../controllers/payment.controller';

const router = Router();

router.post('/:paymentId/webhook', confirmPaymentWebhook);

export default router;
