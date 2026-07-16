import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { authHeader } from './helpers/auth';

vi.mock('../src/config/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

  describe('POST /api/menu/categories', () => {
    it('should create a category', async () => {
      (prisma.category.findUnique as any).mockResolvedValue(null);
      const created = { id: '1', name: 'Drinks', description: null, createdAt: new Date(), updatedAt: new Date() };
      (prisma.category.create as any).mockResolvedValue(created);

      const response = await request(app).post('/api/menu/categories').set(authHeader('ADMIN')).send({ name: 'Drinks' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Drinks');
      expect(prisma.category.create).toHaveBeenCalledWith({ data: { name: 'Drinks', description: undefined } });
    });

    it('should reject a missing name with 400', async () => {
      const response = await request(app).post('/api/menu/categories').set(authHeader('ADMIN')).send({});

      expect(response.status).toBe(400);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('should reject a duplicate name with 409', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: '1', name: 'Drinks' });

      const response = await request(app).post('/api/menu/categories').set(authHeader('ADMIN')).send({ name: 'Drinks' });

      expect(response.status).toBe(409);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/menu/categories/:id', () => {
    it('should update a category', async () => {
      (prisma.category.findUnique as any).mockResolvedValueOnce({ id: '1', name: 'Drinks', description: null });
      (prisma.category.findUnique as any).mockResolvedValueOnce(null);
      const updated = { id: '1', name: 'Beverages', description: null, createdAt: new Date(), updatedAt: new Date() };
      (prisma.category.update as any).mockResolvedValue(updated);

      const response = await request(app).patch('/api/menu/categories/1').set(authHeader('ADMIN')).send({ name: 'Beverages' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Beverages');
    });

    it('should return 404 when category does not exist', async () => {
      (prisma.category.findUnique as any).mockResolvedValue(null);

      const response = await request(app).patch('/api/menu/categories/missing').set(authHeader('ADMIN')).send({ name: 'X' });

      expect(response.status).toBe(404);
    });

    it('should return 409 on rename collision', async () => {
      (prisma.category.findUnique as any)
        .mockResolvedValueOnce({ id: '1', name: 'Drinks', description: null })
        .mockResolvedValueOnce({ id: '2', name: 'Beverages', description: null });

      const response = await request(app).patch('/api/menu/categories/1').set(authHeader('ADMIN')).send({ name: 'Beverages' });

      expect(response.status).toBe(409);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('should reject an empty or whitespace-only name with 400', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: '1', name: 'Drinks', description: null });

      const response = await request(app).patch('/api/menu/categories/1').set(authHeader('ADMIN')).send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/menu/categories/:id', () => {
    it('should delete a category with no menu items', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: '1', name: 'Drinks', menuItems: [] });
      (prisma.category.delete as any).mockResolvedValue({});

      const response = await request(app).delete('/api/menu/categories/1').set(authHeader('ADMIN'));

      expect(response.status).toBe(204);
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should return 404 when category does not exist', async () => {
      (prisma.category.findUnique as any).mockResolvedValue(null);

      const response = await request(app).delete('/api/menu/categories/missing').set(authHeader('ADMIN'));

      expect(response.status).toBe(404);
    });

    it('should return 409 when category still has menu items', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: '1', name: 'Drinks', menuItems: [{ id: 'i1' }] });

      const response = await request(app).delete('/api/menu/categories/1').set(authHeader('ADMIN'));

      expect(response.status).toBe(409);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
