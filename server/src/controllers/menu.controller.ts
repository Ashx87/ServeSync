import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;
    
    // Build query conditionally
    const whereClause: any = { isAvailable: true };
    if (categoryId && typeof categoryId === 'string') {
      whereClause.categoryId = categoryId;
    }

    const menuItems = await prisma.menuItem.findMany({
      where: whereClause,
      include: { category: true } // Assuming we want category details, tests expect this
    });
    
    res.status(200).json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
