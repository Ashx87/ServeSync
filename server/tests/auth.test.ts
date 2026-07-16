import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { authHeader, tokenFor } from './helpers/auth';

vi.mock('../src/config/prisma', () => ({
  default: {
    staffUser: {
      findUnique: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    const passwordHash = bcrypt.hashSync('correct-password', 10);
    const mockUser = {
      id: 'staff-1',
      username: 'boss',
      passwordHash,
      role: 'ADMIN',
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };

    it('should return a token and user info for valid credentials', async () => {
      (prisma.staffUser.findUnique as any).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'boss', password: 'correct-password' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toEqual({ id: 'staff-1', username: 'boss', role: 'ADMIN' });
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 for a wrong password', async () => {
      (prisma.staffUser.findUnique as any).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'boss', password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid username or password');
    });

    it('should return 401 for an unknown username', async () => {
      (prisma.staffUser.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'whatever' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid username or password');
    });

    it('should return 400 when username or password is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ username: 'boss' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the authenticated staff identity', async () => {
      const response = await request(app).get('/api/auth/me').set(authHeader('KITCHEN'));

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('KITCHEN');
      expect(response.body.username).toBe('kitchen-user');
    });

    it('should return 401 without a token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('role guards on protected routes', () => {
    it('should return 401 for menu item creation without a token', async () => {
      const response = await request(app)
        .post('/api/menu/items')
        .send({ name: 'Burger', price: 10, categoryId: 'cat-1' });

      expect(response.status).toBe(401);
      expect(prisma.menuItem.create).not.toHaveBeenCalled();
    });

    it('should return 401 for a malformed token', async () => {
      const response = await request(app)
        .post('/api/menu/items')
        .set({ Authorization: 'Bearer not-a-real-token' })
        .send({ name: 'Burger', price: 10, categoryId: 'cat-1' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for menu item creation with a KITCHEN token', async () => {
      const response = await request(app)
        .post('/api/menu/items')
        .set(authHeader('KITCHEN'))
        .send({ name: 'Burger', price: 10, categoryId: 'cat-1' });

      expect(response.status).toBe(403);
      expect(prisma.menuItem.create).not.toHaveBeenCalled();
    });

    it('should allow menu item creation with an ADMIN token', async () => {
      (prisma.category.findUnique as any).mockResolvedValue({ id: 'cat-1', name: 'Mains' });
      (prisma.menuItem.create as any).mockResolvedValue({
        id: 'item-1',
        name: 'Burger',
        price: 10,
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Mains' },
      });

      const response = await request(app)
        .post('/api/menu/items')
        .set(authHeader('ADMIN'))
        .send({ name: 'Burger', price: 10, categoryId: 'cat-1' });

      expect(response.status).toBe(201);
    });

    it('should allow order status updates with a KITCHEN token', async () => {
      (prisma.order.findUnique as any).mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });
      (prisma.order.update as any).mockResolvedValue({
        id: 'order-1',
        status: 'PREPARING',
        updatedAt: new Date('2026-07-10T10:00:00Z'),
        orderItems: [],
      });

      const response = await request(app)
        .patch('/api/orders/order-1/status')
        .set(authHeader('KITCHEN'))
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(200);
    });

    it('should return 401 for analytics without a token', async () => {
      const response = await request(app).get('/api/analytics/summary');

      expect(response.status).toBe(401);
    });
  });

  describe('payment webhook secret', () => {
    afterEach(() => {
      delete process.env.WEBHOOK_SECRET;
    });

    it('should return 401 when WEBHOOK_SECRET is set and header is missing', async () => {
      process.env.WEBHOOK_SECRET = 'super-secret';

      const response = await request(app).post('/api/payments/pay-1/webhook');

      expect(response.status).toBe(401);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('should return 401 when the header value is wrong', async () => {
      process.env.WEBHOOK_SECRET = 'super-secret';

      const response = await request(app)
        .post('/api/payments/pay-1/webhook')
        .set({ 'X-Webhook-Secret': 'wrong' });

      expect(response.status).toBe(401);
    });

    it('should process the webhook when the header matches', async () => {
      process.env.WEBHOOK_SECRET = 'super-secret';
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/payments/pay-1/webhook')
        .set({ 'X-Webhook-Secret': 'super-secret' });

      // Middleware passed; controller then 404s on the unknown payment
      expect(response.status).toBe(404);
      expect(prisma.payment.findUnique).toHaveBeenCalled();
    });

    it('should process the webhook without a header when no secret is configured', async () => {
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      const response = await request(app).post('/api/payments/pay-1/webhook');

      expect(response.status).toBe(404);
    });
  });

  describe('token payload integrity', () => {
    it('should reject a token signed with a different secret', async () => {
      const jwt = await import('jsonwebtoken');
      const forged = jwt.default.sign(
        { sub: 'x', username: 'x', role: 'ADMIN' },
        'attacker-secret'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${forged}` });

      expect(response.status).toBe(401);
    });

    it('tokenFor helper produces role-scoped tokens', () => {
      expect(tokenFor('ADMIN')).not.toBe(tokenFor('KITCHEN'));
    });
  });
});
