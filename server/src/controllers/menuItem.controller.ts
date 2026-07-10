import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { requireStringParam } from '../utils/requestParams';

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const { categoryId, includeUnavailable } = req.query;

    const whereClause: any = {};
    if (includeUnavailable !== 'true') {
      whereClause.isAvailable = true;
    }
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

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price, categoryId, description, imageUrl } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Menu item name is required' });
      return;
    }

    const numericPrice = Number(price);
    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      res.status(400).json({ error: 'Price must be a positive number' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ error: 'Category is required' });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(400).json({ error: 'Category does not exist' });
      return;
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        price: numericPrice,
        categoryId,
        description,
        imageUrl,
      },
      include: { category: true },
    });

    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Menu item id is required' });
      return;
    }
    const { name, price, categoryId, description, imageUrl, isAvailable } = req.body;

    const menuItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!menuItem) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        res.status(400).json({ error: 'Price must be a positive number' });
        return;
      }
    }

    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        res.status(400).json({ error: 'Category does not exist' });
        return;
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Number(price) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: { category: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = requireStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Menu item id is required' });
      return;
    }

    const menuItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!menuItem) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    await prisma.menuItem.delete({ where: { id } });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(409).json({ error: 'Cannot delete a menu item referenced by existing orders; mark it unavailable instead' });
      return;
    }
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
