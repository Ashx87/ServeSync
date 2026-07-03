import { Request, Response } from 'express';

export const uploadImage = (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
};
