import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Prisma } from '@prisma/client';
import { authHeader } from './helpers/auth';

// All analytics endpoints are admin-only
const getAsAdmin = (url: string) => request(app).get(url).set(authHeader('ADMIN'));

vi.mock('../src/config/prisma', () => ({
  default: {
    order: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    orderItem: {
      groupBy: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
    },
  },
}));

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/revenue', () => {
    it('should return daily revenue for the last 7 days by default', async () => {
      const mockOrders = [
        {
          id: 'o1',
          totalAmount: new Prisma.Decimal(50.00),
          createdAt: new Date('2026-02-28T12:00:00Z'),
          status: 'COMPLETED',
        },
        {
          id: 'o2',
          totalAmount: new Prisma.Decimal(30.50),
          createdAt: new Date('2026-02-28T14:00:00Z'),
          status: 'COMPLETED',
        },
        {
          id: 'o3',
          totalAmount: new Prisma.Decimal(20.00),
          createdAt: new Date('2026-02-27T10:00:00Z'),
          status: 'COMPLETED',
        },
      ];
      (prisma.order.findMany as any).mockResolvedValue(mockOrders);

      const response = await getAsAdmin('/api/analytics/revenue');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(7);

      // Each entry should have date and revenue fields
      for (const entry of response.body) {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('revenue');
        expect(typeof entry.date).toBe('string');
        expect(typeof entry.revenue).toBe('number');
      }

      // Verify prisma was called with COMPLETED status filter and date range
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
      const callArgs = (prisma.order.findMany as any).mock.calls[0][0];
      expect(callArgs.where.status).toBe('COMPLETED');
      expect(callArgs.where.createdAt).toHaveProperty('gte');
    });

    it('should accept a custom days parameter', async () => {
      (prisma.order.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/revenue?days=14');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(14);
    });

    it('should cap days parameter at 90', async () => {
      (prisma.order.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/revenue?days=200');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(90);
    });

    it('should pre-fill dates with zero revenue when no orders exist', async () => {
      (prisma.order.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/revenue?days=3');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      for (const entry of response.body) {
        expect(entry.revenue).toBe(0);
      }
    });

    it('should aggregate multiple orders on the same date', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const mockOrders = [
        {
          id: 'o1',
          totalAmount: new Prisma.Decimal(40.00),
          createdAt: new Date(`${todayStr}T10:00:00Z`),
          status: 'COMPLETED',
        },
        {
          id: 'o2',
          totalAmount: new Prisma.Decimal(60.00),
          createdAt: new Date(`${todayStr}T15:00:00Z`),
          status: 'COMPLETED',
        },
      ];
      (prisma.order.findMany as any).mockResolvedValue(mockOrders);

      const response = await getAsAdmin('/api/analytics/revenue?days=1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].revenue).toBe(100);
      expect(response.body[0].date).toBe(todayStr);
    });

    it('should return 500 on database error', async () => {
      (prisma.order.findMany as any).mockRejectedValue(new Error('DB error'));

      const response = await getAsAdmin('/api/analytics/revenue');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/analytics/top-items', () => {
    it('should return top selling items with default limit of 5', async () => {
      const mockGroupBy = [
        { menuItemId: 'item1', _sum: { quantity: 50 } },
        { menuItemId: 'item2', _sum: { quantity: 30 } },
        { menuItemId: 'item3', _sum: { quantity: 20 } },
      ];
      (prisma.orderItem.groupBy as any).mockResolvedValue(mockGroupBy);

      const mockMenuItems = [
        { id: 'item1', name: 'Burger' },
        { id: 'item2', name: 'Pizza' },
        { id: 'item3', name: 'Salad' },
      ];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      const response = await getAsAdmin('/api/analytics/top-items');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toEqual({ menuItemId: 'item1', name: 'Burger', quantity: 50 });
      expect(response.body[1]).toEqual({ menuItemId: 'item2', name: 'Pizza', quantity: 30 });
      expect(response.body[2]).toEqual({ menuItemId: 'item3', name: 'Salad', quantity: 20 });

      // Verify groupBy was called with correct params
      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith({
        by: ['menuItemId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });
    });

    it('should accept a custom limit parameter', async () => {
      (prisma.orderItem.groupBy as any).mockResolvedValue([]);
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/top-items?limit=10');

      expect(response.status).toBe(200);
      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should cap limit at 20', async () => {
      (prisma.orderItem.groupBy as any).mockResolvedValue([]);
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/top-items?limit=50');

      expect(response.status).toBe(200);
      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      );
    });

    it('should return 500 on database error', async () => {
      (prisma.orderItem.groupBy as any).mockRejectedValue(new Error('DB error'));

      const response = await getAsAdmin('/api/analytics/top-items');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/analytics/category-distribution', () => {
    it('should return quantity distribution per category', async () => {
      const mockGroupBy = [
        { menuItemId: 'item1', _sum: { quantity: 50 } },
        { menuItemId: 'item2', _sum: { quantity: 30 } },
        { menuItemId: 'item3', _sum: { quantity: 20 } },
      ];
      (prisma.orderItem.groupBy as any).mockResolvedValue(mockGroupBy);

      const mockMenuItems = [
        { id: 'item1', name: 'Burger', category: { id: 'cat1', name: 'Mains' } },
        { id: 'item2', name: 'Pizza', category: { id: 'cat1', name: 'Mains' } },
        { id: 'item3', name: 'Latte', category: { id: 'cat2', name: 'Drinks' } },
      ];
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      const response = await getAsAdmin('/api/analytics/category-distribution');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Sort by quantity descending for predictable assertion
      const sorted = [...response.body].sort(
        (a: { quantity: number }, b: { quantity: number }) => b.quantity - a.quantity
      );
      expect(sorted[0]).toEqual({ category: 'Mains', quantity: 80 });
      expect(sorted[1]).toEqual({ category: 'Drinks', quantity: 20 });
    });

    it('should return empty array when no order items exist', async () => {
      (prisma.orderItem.groupBy as any).mockResolvedValue([]);
      (prisma.menuItem.findMany as any).mockResolvedValue([]);

      const response = await getAsAdmin('/api/analytics/category-distribution');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      (prisma.orderItem.groupBy as any).mockRejectedValue(new Error('DB error'));

      const response = await getAsAdmin('/api/analytics/category-distribution');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/analytics/summary', () => {
    it('should return summary stats for completed orders', async () => {
      const mockAggregate = {
        _count: { id: 42 },
        _sum: { totalAmount: new Prisma.Decimal(1250.75) },
        _avg: { totalAmount: new Prisma.Decimal(29.7797619) },
      };
      (prisma.order.aggregate as any).mockResolvedValue(mockAggregate);

      const response = await getAsAdmin('/api/analytics/summary');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalOrders: 42,
        totalRevenue: 1250.75,
        averageOrderValue: 29.78,
      });

      expect(prisma.order.aggregate).toHaveBeenCalledWith({
        where: { status: 'COMPLETED' },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      });
    });

    it('should handle zero orders gracefully', async () => {
      const mockAggregate = {
        _count: { id: 0 },
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
      };
      (prisma.order.aggregate as any).mockResolvedValue(mockAggregate);

      const response = await getAsAdmin('/api/analytics/summary');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      });
    });

    it('should return 500 on database error', async () => {
      (prisma.order.aggregate as any).mockRejectedValue(new Error('DB error'));

      const response = await getAsAdmin('/api/analytics/summary');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
