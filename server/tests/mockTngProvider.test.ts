import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { MockTngProvider } from '../src/services/payment/MockTngProvider';

describe('MockTngProvider', () => {
  it('generates a unique referenceId and a qrPayload encoding the order amount', async () => {
    const provider = new MockTngProvider();
    const order = {
      id: 'order-1',
      tableNumber: 'T1',
      totalAmount: new Prisma.Decimal(25.5),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const result = await provider.createPayment(order);

    expect(result.referenceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(result.qrPayload).toContain(`ref=${result.referenceId}`);
    expect(result.qrPayload).toContain('amount=25.5');
    expect(result.qrPayload).toContain('merchant=servesync');
  });

  it('generates a different referenceId on each call', async () => {
    const provider = new MockTngProvider();
    const order = {
      id: 'order-1',
      totalAmount: new Prisma.Decimal(10),
    } as any;

    const first = await provider.createPayment(order);
    const second = await provider.createPayment(order);

    expect(first.referenceId).not.toBe(second.referenceId);
  });
});
