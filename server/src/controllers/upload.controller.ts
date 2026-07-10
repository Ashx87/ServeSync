import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { detectImageType } from '../utils/imageType';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadImage = (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }

  const detectedType = detectImageType(req.file.buffer);
  if (!detectedType) {
    res.status(400).json({ error: 'File content is not a valid JPEG, PNG, or WEBP image' });
    return;
  }

  // Extension comes from the detected content type, never from the original
  // filename, so a disguised file can never be stored with an unsafe extension.
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${detectedType.ext}`;

  try {
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
  } catch (error) {
    console.error('Error saving uploaded image:', error);
    res.status(500).json({ error: 'Failed to save uploaded image' });
    return;
  }

  res.status(201).json({ url: `/uploads/${filename}` });
};
