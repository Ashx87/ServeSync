import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    const whereClause: any = { isAvailable: true };
    if (categoryId && typeof categoryId === 'string') {
      whereClause.categoryId = categoryId;
    }

    const menuItems = await prisma.menuItem.findMany({
      where: whereClause,
      include: { category: true }
    });

    res.status(200).json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
