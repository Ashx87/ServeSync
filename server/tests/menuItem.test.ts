import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../src/config/prisma', () => ({
  default: {
    menuItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Menu Item API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/menu/items', () => {
    it('should return a list of menu items', async () => {
      const mockItems = [
        {
          id: '1',
          name: 'Spring Roll',
          description: 'Crispy rolls',
          price: new Prisma.Decimal(5.99),
          imageUrl: null,
          isAvailable: true,
          categoryId: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (prisma.menuItem.findMany as any).mockResolvedValue(mockItems);

      const response = await request(app).get('/api/menu/items');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Spring Roll');
      expect(prisma.menuItem.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        include: { category: true }
      });
    });

    it('should optionally filter menu items by categoryId', async () => {
      const mockItems: any[] = [];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockItems);

      const response = await request(app).get('/api/menu/items?categoryId=2');

      expect(response.status).toBe(200);
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true, categoryId: '2' },
        include: { category: true }
      });
    });

    it('should handle internal server error', async () => {
      (prisma.menuItem.findMany as any).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/menu/items');

      expect(response.status).toBe(500);
    });

    it('should include unavailable items when includeUnavailable=true', async () => {
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await request(app).get('/api/menu/items?includeUnavailable=true');

      expect(response.status).toBe(200);
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: {},
        include: { category: true }
      });
    });
  });

  describe('POST /api/menu/items', () => {
    it('should create a menu item', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: 'c1', name: 'Mains' });
      const created = { id: '1', name: 'Burger', price: new Prisma.Decimal(9.99), categoryId: 'c1' };
      (prisma.menuItem.create as any).mockResolvedValue(created);

      const response = await request(app).post('/api/menu/items').send({
        name: 'Burger', price: 9.99, categoryId: 'c1'
      });

      expect(response.status).toBe(201);
      expect(prisma.menuItem.create).toHaveBeenCalledWith({
        data: { name: 'Burger', price: 9.99, categoryId: 'c1', description: undefined, imageUrl: undefined },
        include: { category: true }
      });
    });

    it('should reject a missing name with 400', async () => {
      const response = await request(app).post('/api/menu/items').send({ price: 9.99, categoryId: 'c1' });

      expect(response.status).toBe(400);
      expect(prisma.menuItem.create).not.toHaveBeenCalled();
    });

    it('should reject a non-positive price with 400', async () => {
      const response = await request(app).post('/api/menu/items').send({ name: 'Burger', price: 0, categoryId: 'c1' });

      expect(response.status).toBe(400);
    });

    it('should reject a nonexistent categoryId with 400', async () => {
      (prisma.category.findUnique as any).mockResolvedValue(null);

      const response = await request(app).post('/api/menu/items').send({ name: 'Burger', price: 9.99, categoryId: 'missing' });

      expect(response.status).toBe(400);
      expect(prisma.menuItem.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/menu/items/:id', () => {
    it('should update a menu item', async () => {
      (prisma.menuItem.findUnique as any).mockResolvedValue({ id: '1', name: 'Burger', price: new Prisma.Decimal(9.99), categoryId: 'c1' });
      const updated = { id: '1', name: 'Burger', isAvailable: false };
      (prisma.menuItem.update as any).mockResolvedValue(updated);

      const response = await request(app).patch('/api/menu/items/1').send({ isAvailable: false });

      expect(response.status).toBe(200);
      expect(response.body.isAvailable).toBe(false);
    });

    it('should return 404 when menu item does not exist', async () => {
      (prisma.menuItem.findUnique as any).mockResolvedValue(null);

      const response = await request(app).patch('/api/menu/items/missing').send({ isAvailable: false });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/menu/items/:id', () => {
    it('should delete a menu item with no order history', async () => {
      (prisma.menuItem.findUnique as any).mockResolvedValue({ id: '1', name: 'Burger' });
      (prisma.menuItem.delete as any).mockResolvedValue({});

      const response = await request(app).delete('/api/menu/items/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 when menu item does not exist', async () => {
      (prisma.menuItem.findUnique as any).mockResolvedValue(null);

      const response = await request(app).delete('/api/menu/items/missing');

      expect(response.status).toBe(404);
    });

    it('should return 409 when the item is referenced by existing orders', async () => {
      (prisma.menuItem.findUnique as any).mockResolvedValue({ id: '1', name: 'Burger' });
      (prisma.menuItem.delete as any).mockRejectedValue({ code: 'P2003' });

      const response = await request(app).delete('/api/menu/items/1');

      expect(response.status).toBe(409);
    });
  });
});
