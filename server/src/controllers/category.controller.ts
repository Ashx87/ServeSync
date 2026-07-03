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

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ error: 'A category with this name already exists' });
      return;
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (name && name !== category.name) {
      const existing = await prisma.category.findUnique({ where: { name } });
      if (existing) {
        res.status(409).json({ error: 'A category with this name already exists' });
        return;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { menuItems: true },
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (category.menuItems.length > 0) {
      res.status(409).json({ error: 'Cannot delete a category that still has menu items' });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
