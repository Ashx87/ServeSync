import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';

vi.mock('../src/config/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
    },
  },
}));

describe('Category API', () => {
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
});
