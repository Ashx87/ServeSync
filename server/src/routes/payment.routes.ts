import { Router } from 'express';
import { confirmPaymentWebhook } from '../controllers/payment.controller';
import { verifyWebhookSecret } from '../middleware/webhookSecret';

const router = Router();

router.post('/:paymentId/webhook', verifyWebhookSecret, confirmPaymentWebhook);

export default router;
