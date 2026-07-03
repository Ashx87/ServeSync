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

  describe('POST /api/payments/:paymentId/webhook', () => {
    const paymentId = 'payment-99';
    const orderId = 'order-99';

    it('marks the payment and order as paid, and emits order_payment_update', async () => {
      const mockEmit = vi.fn();
      app.set('io', { emit: mockEmit });

      const existingPayment = {
        id: paymentId,
        orderId,
        status: 'PENDING',
        amount: new Prisma.Decimal(18.0),
      };
      (prisma.payment.findUnique as any).mockResolvedValue(existingPayment);

      const updatedOrder = {
        id: orderId,
        tableNumber: 'T9',
        totalAmount: new Prisma.Decimal(18.0),
        status: 'READY',
        paymentStatus: 'PAID',
        orderItems: [],
      };
      (prisma.order.update as any).mockResolvedValue(updatedOrder);

      const response = await request(app).post(`/api/payments/${paymentId}/webhook`);

      expect(response.status).toBe(200);
      expect(response.body.paymentStatus).toBe('PAID');
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: { status: 'PAID' },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { paymentStatus: 'PAID' },
        include: { orderItems: { include: { menuItem: true } } },
      });
      expect(mockEmit).toHaveBeenCalledWith('order_payment_update', updatedOrder);
    });

    it('is idempotent when the payment is already PAID', async () => {
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        orderId,
        status: 'PAID',
      });
      (prisma.order.findUnique as any).mockResolvedValue({
        id: orderId,
        paymentStatus: 'PAID',
        orderItems: [],
      });

      const response = await request(app).post(`/api/payments/${paymentId}/webhook`);

      expect(response.status).toBe(200);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('returns 409 when the payment is EXPIRED', async () => {
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        orderId,
        status: 'EXPIRED',
      });

      const response = await request(app).post(`/api/payments/${paymentId}/webhook`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Payment is expired');
    });

    it('returns 404 if the payment does not exist', async () => {
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      const response = await request(app).post('/api/payments/nonexistent-id/webhook');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Payment not found');
    });
  });
});
