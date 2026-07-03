import { randomUUID } from 'crypto';
import { Order } from '@prisma/client';
import { PaymentProvider } from './PaymentProvider';

export class MockTngProvider implements PaymentProvider {
  async createPayment(order: Order): Promise<{ referenceId: string; qrPayload: string }> {
    const referenceId = randomUUID();
    const qrPayload = `tngd://pay?ref=${referenceId}&amount=${order.totalAmount.toString()}&merchant=servesync`;

    return { referenceId, qrPayload };
  }
}
