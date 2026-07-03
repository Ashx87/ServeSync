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
