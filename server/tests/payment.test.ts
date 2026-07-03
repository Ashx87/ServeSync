import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../src/config/prisma', () => ({
  default: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Payment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orders/:id/payments', () => {
    const orderId = 'order-789';

    it('creates a payment for an order awaiting payment', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T7',
        totalAmount: new Prisma.Decimal(30.0),
        status: 'READY',
        paymentStatus: 'PENDING',
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);
      (prisma.payment.updateMany as any).mockResolvedValue({ count: 0 });

      const createdPayment = {
        id: 'payment-1',
        orderId,
        provider: 'TNG_MOCK',
        referenceId: 'ref-abc',
        amount: new Prisma.Decimal(30.0),
        status: 'PENDING',
        qrPayload: 'tngd://pay?ref=ref-abc&amount=30&merchant=servesync',
      };
      (prisma.payment.create as any).mockResolvedValue(createdPayment);

      const response = await request(app).post(`/api/orders/${orderId}/payments`);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('payment-1');
      expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
      expect(prisma.payment.create).toHaveBeenCalled();
      const createArgs = (prisma.payment.create as any).mock.calls[0][0];
      expect(createArgs.data.orderId).toBe(orderId);
      expect(createArgs.data.referenceId).toBeTruthy();
      expect(createArgs.data.qrPayload).toContain('ref=');
    });

    it('returns 404 if the order does not exist', async () => {
      (prisma.order.findUnique as any).mockResolvedValue(null);

      const response = await request(app).post('/api/orders/nonexistent-id/payments');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found');
    });

    it('returns 409 if the order is not awaiting payment', async () => {
      (prisma.order.findUnique as any).mockResolvedValue({
        id: orderId,
        totalAmount: new Prisma.Decimal(30.0),
        paymentStatus: 'PAID',
      });

      const response = await request(app).post(`/api/orders/${orderId}/payments`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Order is not awaiting payment');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
