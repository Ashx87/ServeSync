import { Order } from '@prisma/client';

export interface PaymentProvider {
  createPayment(order: Order): Promise<{ referenceId: string; qrPayload: string }>;
}
