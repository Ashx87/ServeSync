import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ServeSync API is running' });
});

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

export default app;
