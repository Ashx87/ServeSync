import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadImage } from '../controllers/upload.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

router.post('/', requireRole('ADMIN'), (req, res, next) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      const message =
        err.message === 'INVALID_FILE_TYPE'
          ? 'Only JPEG, PNG, and WEBP images are allowed'
          : err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be smaller than 5MB'
            : 'File upload failed';
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}, uploadImage);

export default router;
