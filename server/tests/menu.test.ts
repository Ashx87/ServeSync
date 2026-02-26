import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';

// Mock the prisma client
vi.mock('../src/config/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
    },
  },
}));

describe('Menu API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/menu/categories', () => {
    it('should return a list of categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Starters', description: 'Appetizers', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Mains', description: 'Main courses', createdAt: new Date(), updatedAt: new Date() },
      ];

      (prisma.category.findMany as any).mockResolvedValue(mockCategories);

      const response = await request(app).get('/api/menu/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Starters');
      expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle internal server error', async () => {
      (prisma.category.findMany as any).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/menu/categories');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
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
      const mockItems = [];
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
  });
});
