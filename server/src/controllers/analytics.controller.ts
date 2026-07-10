import { Request, Response } from 'express';
import prisma from '../config/prisma';

const DEFAULT_REVENUE_DAYS = 7;
const MAX_REVENUE_DAYS = 90;
const DEFAULT_TOP_ITEMS_LIMIT = 5;
const MAX_TOP_ITEMS_LIMIT = 20;

/**
 * Builds an array of date strings (YYYY-MM-DD) from startDate to today (inclusive).
 */
const buildDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
};

/**
 * Clamps a numeric query param to [1, max], returning defaultVal if invalid.
 */
const clampQueryParam = (
  value: string | undefined,
  defaultVal: number,
  max: number
): number => {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, max);
};

/**
 * Safely converts a Prisma Decimal (or null) to a number, rounded to 2 decimals.
 */
const decimalToRounded = (value: unknown): number => {
  if (value == null) return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Math.round(num * 100) / 100;
};

export const getDailyRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = clampQueryParam(
      req.query.days as string | undefined,
      DEFAULT_REVENUE_DAYS,
      MAX_REVENUE_DAYS
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Aggregate revenue by date string
    const revenueByDate: Record<string, number> = {};
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().slice(0, 10);
      const amount = decimalToRounded(order.totalAmount);
      revenueByDate[dateKey] = (revenueByDate[dateKey] ?? 0) + amount;
    }

    // Build full date range with pre-filled zeros
    const dateRange = buildDateRange(days);
    const result = dateRange.map((date) => ({
      date,
      revenue: decimalToRounded(revenueByDate[date] ?? 0),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching daily revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopSellingItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = clampQueryParam(
      req.query.limit as string | undefined,
      DEFAULT_TOP_ITEMS_LIMIT,
      MAX_TOP_ITEMS_LIMIT
    );

    const grouped = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      res.status(200).json([]);
      return;
    }

    const menuItemIds = grouped.map((g) => g.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true },
    });

    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi.name]));

    const result = grouped.map((g) => ({
      menuItemId: g.menuItemId,
      name: menuItemMap.get(g.menuItemId) ?? 'Unknown',
      quantity: g._sum.quantity ?? 0,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching top selling items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategoryDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const grouped = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
    });

    if (grouped.length === 0) {
      res.status(200).json([]);
      return;
    }

    const menuItemIds = grouped.map((g) => g.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { category: true },
    });

    const menuItemMap = new Map(
      menuItems.map((mi) => [mi.id, mi.category?.name ?? 'Uncategorized'])
    );

    // Aggregate quantities by category name
    const categoryTotals: Record<string, number> = {};
    for (const g of grouped) {
      const categoryName = menuItemMap.get(g.menuItemId) ?? 'Uncategorized';
      const quantity = g._sum.quantity ?? 0;
      categoryTotals[categoryName] = (categoryTotals[categoryName] ?? 0) + quantity;
    }

    const result = Object.entries(categoryTotals)
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSummaryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const aggregate = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _count: { id: true },
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
    });

    const totalOrders = aggregate._count.id;
    const totalRevenue = decimalToRounded(aggregate._sum.totalAmount);
    const averageOrderValue = decimalToRounded(aggregate._avg.totalAmount);

    res.status(200).json({
      totalOrders,
      totalRevenue,
      averageOrderValue,
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
