import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

const VALID_TRANSITIONS: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const whereClause: any = {};
    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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

    const menuItemIds = items.map((item: any) => item.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
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
          orderItems: true
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
    const { id } = req.params;
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

    if (VALID_TRANSITIONS[order.status] !== status) {
      res.status(400).json({
        error: `Invalid status transition from ${order.status} to ${status}`,
      });
      return;
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
