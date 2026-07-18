import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/app';

vi.mock('../src/config/prisma', () => ({
  default: {
    category: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

describe('CORS configuration', () => {
  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('should reflect any origin when CORS_ORIGIN is unset (dev mode)', async () => {
    const response = await request(app)
      .get('/api/menu/categories')
      .set('Origin', 'http://anywhere.example');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should allow a whitelisted origin', async () => {
    process.env.CORS_ORIGIN = 'https://app.servesync.example, https://kds.servesync.example';

    const response = await request(app)
      .get('/api/menu/categories')
      .set('Origin', 'https://kds.servesync.example');

    expect(response.headers['access-control-allow-origin']).toBe('https://kds.servesync.example');
  });

  it('should not send CORS headers for a non-whitelisted origin', async () => {
    process.env.CORS_ORIGIN = 'https://app.servesync.example';

    const response = await request(app)
      .get('/api/menu/categories')
      .set('Origin', 'https://evil.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
