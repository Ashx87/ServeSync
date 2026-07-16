import { Request, Response, NextFunction } from 'express';

// Protects provider callback endpoints with a shared secret header.
// When WEBHOOK_SECRET is unset (mock/dev mode) requests pass through;
// server startup logs a warning for that case.
export const verifyWebhookSecret = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    next();
    return;
  }

  if (req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Invalid webhook secret' });
    return;
  }

  next();
};
