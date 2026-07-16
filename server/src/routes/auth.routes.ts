import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/me', requireRole('ADMIN', 'KITCHEN'), me);

export default router;
