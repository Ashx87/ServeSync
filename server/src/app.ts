import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import analyticsRoutes from './routes/analytics.routes';
import paymentRoutes from './routes/payment.routes';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const app = express();

// Allowed browser origins come from CORS_ORIGIN (comma-separated).
// When unset (dev/mock mode) every origin is allowed.
const corsOriginResolver = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  const allowed = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowed.length === 0 || !origin || allowed.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
};

app.use(cors({ origin: corsOriginResolver }));
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res) => {
      // Prevent browsers from sniffing uploaded files into executable content types
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ServeSync API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);

export default app;
