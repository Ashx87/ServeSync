import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../src/config/prisma', () => ({
  default: {
    order: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
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

      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].tableNumber).toBe('T1');
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter orders by status if provided', async () => {
      (prisma.order.findMany as any).mockResolvedValue([]);
      
      const response = await request(app).get('/api/orders?status=PREPARING');
      
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
      
      // Verify menuItem lookup
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['item1', 'item2'] } }
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
});
