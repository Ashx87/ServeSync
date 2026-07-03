import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { describe, it, expect, afterEach } from 'vitest';
import app from '../src/app';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

describe('Upload API', () => {
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const file of createdFiles.splice(0)) {
      const filePath = path.join(UPLOAD_DIR, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  it('should accept a valid image and return its URL', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('fake-image-data'), { filename: 'test.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/.+\.png$/);
    createdFiles.push(path.basename(response.body.url));
  });

  it('should reject a non-image file with 400', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('not an image'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
  });

  it('should reject a request with no file with 400', async () => {
    const response = await request(app).post('/api/upload');

    expect(response.status).toBe(400);
  });

  it('should reject a file larger than 5MB with 400', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
    const response = await request(app)
      .post('/api/upload')
      .attach('image', bigBuffer, { filename: 'big.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
  });
});
