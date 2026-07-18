import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { requireStringParam } from '../utils/requestParams';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
};

const ACTIVE_STATUSES = ['PENDING', 'PREPARING', 'READY'];
const MAX_PAGE_SIZE = 100;

// Domain error carrying the HTTP status, thrown from inside transactions
class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

const MAX_QUANTITY_PER_ITEM = 99;

const hasInvalidQuantity = (items: any[]): boolean =>
  items.some((item: any) => {
    const quantity = item.quantity ?? 1;
    return !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM;
  });

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Order id is required' });
      return;
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { menuItem: true }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, active, paymentStatus, tableNumber, date, page, limit } = req.query;

    const whereClause: any = {};
    if (status && typeof status === 'string') {
      whereClause.status = status;
    }
    if (active === 'true') {
      whereClause.status = { in: [...ACTIVE_STATUSES] };
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      whereClause.paymentStatus = paymentStatus;
    }
    if (tableNumber && typeof tableNumber === 'string') {
      whereClause.tableNumber = tableNumber;
    }
    if (date && typeof date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
        return;
      }
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: dayStart, lt: dayEnd };
    }

    const include = { orderItems: { include: { menuItem: true } } };
    const orderBy = { createdAt: 'desc' as const };

    // Paginated envelope for billing/history views
    if (page !== undefined) {
      const pageNum = Number(page);
      const limitNum = limit !== undefined ? Number(limit) : 20;

      if (
        !Number.isInteger(pageNum) || pageNum < 1 ||
        !Number.isInteger(limitNum) || limitNum < 1 || limitNum > MAX_PAGE_SIZE
      ) {
        res.status(400).json({
          error: `page must be >= 1 and limit must be between 1 and ${MAX_PAGE_SIZE}`,
        });
        return;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include,
          orderBy,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      res.status(200).json({ orders, total, page: pageNum, limit: limitNum });
      return;
    }

    // Legacy array response (KDS), capped for safety
    const orders = await prisma.order.findMany({
      where: whereClause,
      include,
      orderBy,
      take: MAX_PAGE_SIZE,
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, items } = req.body;

    if (!tableNumber) {
      res.status(400).json({ error: 'Table number is required' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    if (hasInvalidQuantity(items)) {
      res.status(400).json({ error: `Quantity must be an integer between 1 and ${MAX_QUANTITY_PER_ITEM}` });
      return;
    }

    const menuItemIds = items.map((item: any) => item.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true }
    });

    if (menuItems.length !== new Set(menuItemIds).size) {
      res.status(400).json({ error: 'One or more menu items are invalid or unavailable' });
      return;
    }

    // Map items to calculate total and prep for insertion
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsToCreate = items.map((item: any) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem) throw new Error('Menu item not found');

      const unitPrice = menuItem.price;
      const quantity = item.quantity || 1;
      
      const itemTotal = unitPrice.mul(quantity);
      totalAmount = totalAmount.add(itemTotal);

      return {
        menuItemId: item.menuItemId,
        quantity: quantity,
        unitPrice: Number(unitPrice), // Prisma expects number for Decimal fields in create inputs often, or Decimal. Let's use Number to match tests or pass Decimal directly. Prisma supports number or Decimal string.
        notes: item.notes
      };
    });

    const newOrder = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          tableNumber,
          totalAmount: Number(totalAmount),
          orderItems: {
            create: orderItemsToCreate
          }
        },
        include: {
          orderItems: {
            include: { menuItem: true }
          }
        }
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', newOrder);
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Order id is required' });
      return;
    }
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (!VALID_TRANSITIONS[order.status]?.includes(status)) {
      res.status(400).json({
        error: `Invalid status transition from ${order.status} to ${status}`,
      });
      return;
    }

    if (status === 'CANCELLED') {
      if (order.paymentStatus === 'PAID') {
        res.status(409).json({ error: 'Cannot cancel a paid order — refund it instead' });
        return;
      }
      // A cancelled order can no longer be paid for
      await prisma.payment.updateMany({
        where: { orderId: id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: { orderItems: { include: { menuItem: true } } },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_update', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
      });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Order id is required' });
      return;
    }
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    if (hasInvalidQuantity(items)) {
      res.status(400).json({ error: `Quantity must be an integer between 1 and ${MAX_QUANTITY_PER_ITEM}` });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.paymentStatus !== 'PENDING') {
      res.status(409).json({ error: 'Order already settled' });
      return;
    }

    const menuItemIds = items.map((item: any) => item.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true }
    });

    if (menuItems.length !== new Set(menuItemIds).size) {
      res.status(400).json({ error: 'One or more menu items are invalid or unavailable' });
      return;
    }

    const newOrderItemsToCreate = items.map((item: any) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem) throw new Error('Menu item not found');

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        unitPrice: Number(menuItem.price),
        notes: item.notes
      };
    });

    const newItemsTotal = newOrderItemsToCreate.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
      new Prisma.Decimal(0)
    );

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: a payment webhook may have settled
      // the order between the pre-check above and this point
      const current = await tx.order.findUnique({ where: { id } });
      if (!current || current.paymentStatus !== 'PENDING') {
        throw new HttpError(409, 'Order already settled');
      }

      await tx.payment.updateMany({
        where: { orderId: id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      return await tx.order.update({
        where: { id },
        data: {
          totalAmount: { increment: Number(newItemsTotal) },
          status: 'PENDING',
          orderItems: {
            create: newOrderItemsToCreate
          }
        },
        include: {
          orderItems: {
            include: { menuItem: true }
          }
        }
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_items_updated', updatedOrder);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Error adding items to order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Order id is required' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.paymentStatus !== 'PAID') {
      res.status(409).json({ error: 'Only paid orders can be refunded' });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: id, status: 'PAID' },
        data: { status: 'REFUNDED' },
      });

      return await tx.order.update({
        where: { id },
        data: { paymentStatus: 'REFUNDED', status: 'CANCELLED' },
        include: { orderItems: { include: { menuItem: true } } },
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_update', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
      });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error refunding order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
