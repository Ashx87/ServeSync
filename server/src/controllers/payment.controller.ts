import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { paymentProvider } from '../services/payment';

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.paymentStatus !== 'PENDING') {
      res.status(409).json({ error: 'Order is not awaiting payment' });
      return;
    }

    await prisma.payment.updateMany({
      where: { orderId: id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    const { referenceId, qrPayload } = await paymentProvider.createPayment(order);

    const payment = await prisma.payment.create({
      data: {
        orderId: id,
        referenceId,
        qrPayload,
        amount: order.totalAmount,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const confirmPaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (payment.status === 'PAID') {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: { orderItems: { include: { menuItem: true } } },
      });
      res.status(200).json(order);
      return;
    }

    if (payment.status === 'EXPIRED' || payment.status === 'FAILED') {
      res.status(409).json({ error: `Payment is ${payment.status.toLowerCase()}` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID' },
      });

      return tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' },
        include: { orderItems: { include: { menuItem: true } } },
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_payment_update', updatedOrder);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
