import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';
import { authHeader } from './helpers/auth';

vi.mock('../src/config/prisma', () => ({
  default: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
    },
    payment: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)), // Simple mock for transaction
  },
}));

describe('Order API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should return a list of orders', async () => {
      const mockOrders = [
        { id: '1', tableNumber: 'T1', totalAmount: new Prisma.Decimal(15.99), status: 'PENDING', paymentStatus: 'PENDING' }
      ];
      (prisma.order.findMany as any).mockResolvedValue(mockOrders);

      const response = await request(app).get('/api/orders').set(authHeader('ADMIN'));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].tableNumber).toBe('T1');
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter orders by status if provided', async () => {
      (prisma.order.findMany as any).mockResolvedValue([]);
      
      const response = await request(app).get('/api/orders?status=PREPARING').set(authHeader('ADMIN'));
      
      expect(response.status).toBe(200);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PREPARING' },
        include: { orderItems: { include: { menuItem: true } } },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order successfully', async () => {
      // Mock menu items for price lookup
      const mockMenuItems = [
        { id: 'item1', price: new Prisma.Decimal(10.00) },
        { id: 'item2', price: new Prisma.Decimal(5.50) }
      ];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      // Mock the created order
      const mockCreatedOrder = {
        id: 'new-order-1',
        tableNumber: 'T5',
        totalAmount: new Prisma.Decimal(25.50), // 10*2 + 5.50*1
        status: 'PENDING',
        paymentStatus: 'PENDING',
      };
      (prisma.order.create as any).mockResolvedValue(mockCreatedOrder);

      const payload = {
        tableNumber: 'T5',
        items: [
          { menuItemId: 'item1', quantity: 2 },
          { menuItemId: 'item2', quantity: 1, notes: 'no ice' }
        ]
      };

      const response = await request(app).post('/api/orders').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('new-order-1');
      
      // Verify menuItem lookup only considers available items
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['item1', 'item2'] }, isAvailable: true }
      });

      // Verify order creation
      expect(prisma.order.create).toHaveBeenCalled();
      const createArgs = (prisma.order.create as any).mock.calls[0][0];
      
      expect(createArgs.data.tableNumber).toBe('T5');
      expect(createArgs.data.totalAmount).toBe(25.5); // Prisma.Decimal handles numbers in create
      expect(createArgs.data.orderItems.create).toHaveLength(2);
      expect(createArgs.data.orderItems.create[0]).toEqual({
        menuItemId: 'item1',
        quantity: 2,
        unitPrice: 10.00
      });
    });

    it('should emit new_order event via socket.io upon successful order creation', async () => {
      const mockEmit = vi.fn();
      app.set('io', { emit: mockEmit });

      const mockMenuItems = [{ id: 'item1', price: new Prisma.Decimal(10.00) }];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);
      
      const mockCreatedOrder = {
        id: 'new-order-socket',
        tableNumber: 'T2',
        totalAmount: new Prisma.Decimal(10.00),
        status: 'PENDING',
        paymentStatus: 'PENDING',
      };
      (prisma.order.create as any).mockResolvedValue(mockCreatedOrder);

      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T2',
        items: [{ menuItemId: 'item1', quantity: 1 }]
      });

      expect(response.status).toBe(201);
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith('new_order', mockCreatedOrder);
    });

    it('should return 400 if items array is empty', async () => {
      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: []
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Order must contain at least one item');
    });

    it('should return 400 if tableNumber is missing', async () => {
      const response = await request(app).post('/api/orders').send({
        items: [{ menuItemId: 'item1', quantity: 1 }]
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Table number is required');
    });
    
    it('should return 400 if quantity is zero', async () => {
      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [{ menuItemId: 'item1', quantity: 0 }]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantity must be an integer between 1 and 99');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should return 400 if quantity is negative', async () => {
      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [{ menuItemId: 'item1', quantity: -5 }]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantity must be an integer between 1 and 99');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should return 400 if quantity is not an integer', async () => {
      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [{ menuItemId: 'item1', quantity: 1.5 }]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantity must be an integer between 1 and 99');
    });

    it('should return 400 if quantity exceeds the maximum of 99', async () => {
      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [{ menuItemId: 'item1', quantity: 100 }]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantity must be an integer between 1 and 99');
    });

    it('should return 400 if a requested item is unavailable', async () => {
      // Item exists in DB but is unavailable, so the isAvailable filter excludes it
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [{ menuItemId: 'unavailable-item', quantity: 1 }]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('One or more menu items are invalid or unavailable');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should return 400 if a menu item is not found', async () => {
      // Mock finding fewer items than requested
      (prisma.menuItem.findMany as any).mockResolvedValue([
        { id: 'item1', price: new Prisma.Decimal(10.00) }
      ]);

      const response = await request(app).post('/api/orders').send({
        tableNumber: 'T5',
        items: [
          { menuItemId: 'item1', quantity: 1 },
          { menuItemId: 'invalid-item', quantity: 1 }
        ]
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('One or more menu items are invalid or unavailable');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    const orderId = 'order-123';

    it('should update order status from PENDING to PREPARING', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T1',
        totalAmount: new Prisma.Decimal(25.00),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: new Date('2026-02-28T10:00:00Z'),
        updatedAt: new Date('2026-02-28T10:00:00Z'),
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const updatedOrder = {
        ...existingOrder,
        status: 'PREPARING',
        updatedAt: new Date('2026-02-28T10:05:00Z'),
        orderItems: [
          {
            id: 'oi-1',
            orderId,
            menuItemId: 'item1',
            quantity: 2,
            unitPrice: new Prisma.Decimal(12.50),
            menuItem: { id: 'item1', name: 'Burger' },
          },
        ],
      };
      (prisma.order.update as any).mockResolvedValue(updatedOrder);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`).set(authHeader('KITCHEN'))
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PREPARING');
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'PREPARING' },
        include: { orderItems: { include: { menuItem: true } } },
      });
    });

    it('should emit order_status_update event via socket.io', async () => {
      const mockEmit = vi.fn();
      app.set('io', { emit: mockEmit });

      const existingOrder = {
        id: orderId,
        tableNumber: 'T3',
        totalAmount: new Prisma.Decimal(15.00),
        status: 'PREPARING',
        paymentStatus: 'PENDING',
        createdAt: new Date('2026-02-28T10:00:00Z'),
        updatedAt: new Date('2026-02-28T10:00:00Z'),
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const updatedOrder = {
        ...existingOrder,
        status: 'READY',
        updatedAt: new Date('2026-02-28T10:10:00Z'),
        orderItems: [],
      };
      (prisma.order.update as any).mockResolvedValue(updatedOrder);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`).set(authHeader('KITCHEN'))
        .send({ status: 'READY' });

      expect(response.status).toBe(200);
      expect(mockEmit).toHaveBeenCalledWith('order_status_update', {
        orderId,
        status: 'READY',
        updatedAt: updatedOrder.updatedAt,
      });
    });

    it('should return 404 if order does not exist', async () => {
      (prisma.order.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/orders/nonexistent-id/status').set(authHeader('KITCHEN'))
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return 400 for invalid status transition', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T1',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: new Date('2026-02-28T10:00:00Z'),
        updatedAt: new Date('2026-02-28T10:00:00Z'),
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`).set(authHeader('KITCHEN'))
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status transition from PENDING to COMPLETED');
    });

    it('should return 400 if status is not provided', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`).set(authHeader('KITCHEN'))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status is required');
    });
  });

  describe('PATCH /api/orders/:id/items', () => {
    const orderId = 'order-456';

    it('should append items, recalculate totalAmount, and reset status to PENDING', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'READY',
        paymentStatus: 'PENDING',
        orderItems: [
          { id: 'oi-existing', orderId, menuItemId: 'item1', quantity: 2, unitPrice: new Prisma.Decimal(10.00), notes: null },
        ],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const mockMenuItems = [{ id: 'item2', price: new Prisma.Decimal(5.50), isAvailable: true }];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      const updatedOrder = {
        ...existingOrder,
        status: 'PENDING',
        totalAmount: new Prisma.Decimal(25.50),
        orderItems: [
          { id: 'oi-existing', orderId, menuItemId: 'item1', quantity: 2, unitPrice: new Prisma.Decimal(10.00), notes: null, menuItem: { id: 'item1', name: 'Burger' } },
          { id: 'oi-new', orderId, menuItemId: 'item2', quantity: 1, unitPrice: new Prisma.Decimal(5.50), notes: 'no ice', menuItem: { id: 'item2', name: 'Tea' } },
        ],
      };
      (prisma.order.update as any).mockResolvedValue(updatedOrder);

      const mockEmit = vi.fn();
      app.set('io', { emit: mockEmit });

      const response = await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'item2', quantity: 1, notes: 'no ice' }] });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PENDING');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          totalAmount: { increment: 5.5 },
          status: 'PENDING',
          orderItems: {
            create: [
              { menuItemId: 'item2', quantity: 1, unitPrice: 5.5, notes: 'no ice' },
            ],
          },
        },
        include: { orderItems: { include: { menuItem: true } } },
      });
      expect(mockEmit).toHaveBeenCalledWith('order_items_updated', updatedOrder);
    });

    it('should expire any pending payment attempts for the order', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'READY',
        paymentStatus: 'PENDING',
        orderItems: [],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const mockMenuItems = [{ id: 'item2', price: new Prisma.Decimal(5.50), isAvailable: true }];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      (prisma.order.update as any).mockResolvedValue({
        ...existingOrder,
        status: 'PENDING',
        totalAmount: new Prisma.Decimal(25.50),
        orderItems: [],
      });

      await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'item2', quantity: 1 }] });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return 409 if order is already settled', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        orderItems: [],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'item1', quantity: 1 }] });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Order already settled');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should return 404 if order does not exist', async () => {
      (prisma.order.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/orders/nonexistent-id/items')
        .send({ items: [{ menuItemId: 'item1', quantity: 1 }] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return 400 if items array is empty', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Order must contain at least one item');
    });

    it('should return 400 if a menu item is invalid', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        orderItems: [],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'invalid-item', quantity: 1 }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('One or more menu items are invalid or unavailable');
    });

    it('should return 400 if an appended item has an invalid quantity', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        orderItems: [],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const response = await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'item1', quantity: -2 }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantity must be an integer between 1 and 99');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should only look up available menu items when appending', async () => {
      const existingOrder = {
        id: orderId,
        tableNumber: 'T4',
        totalAmount: new Prisma.Decimal(20.00),
        status: 'READY',
        paymentStatus: 'PENDING',
        orderItems: [],
      };
      (prisma.order.findUnique as any).mockResolvedValue(existingOrder);

      const mockMenuItems = [{ id: 'item2', price: new Prisma.Decimal(5.50), isAvailable: true }];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      (prisma.order.update as any).mockResolvedValue({
        ...existingOrder,
        status: 'PENDING',
        totalAmount: new Prisma.Decimal(25.50),
        orderItems: [],
      });

      await request(app)
        .patch(`/api/orders/${orderId}/items`)
        .send({ items: [{ menuItemId: 'item2', quantity: 1 }] });

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['item2'] }, isAvailable: true }
      });
    });
  });
});
