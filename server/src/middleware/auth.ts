import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type StaffRole = 'ADMIN' | 'KITCHEN';

export interface StaffTokenPayload {
  sub: string;
  username: string;
  role: StaffRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffTokenPayload;
    }
  }
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

// Verifies the Bearer token and requires the staff role to be one of `roles`.
export const requireRole = (...roles: StaffRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let payload: StaffTokenPayload;
    try {
      payload = jwt.verify(header.slice('Bearer '.length), getJwtSecret()) as StaffTokenPayload;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!roles.includes(payload.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    req.staff = payload;
    next();
  };
