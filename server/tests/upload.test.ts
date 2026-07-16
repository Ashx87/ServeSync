import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { describe, it, expect, afterEach } from 'vitest';
import app from '../src/app';
import { authHeader } from './helpers/auth';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Minimal valid PNG signature followed by filler content
const PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('filler-image-content'),
]);

const JPEG_BUFFER = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('filler-image-content'),
]);

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
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/.+\.png$/);
    createdFiles.push(path.basename(response.body.url));
  });

  it('should reject content that does not match its declared image MIME type', async () => {
    // Declared as image/png but the bytes are HTML — must not be stored
    const response = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('should derive the stored extension from file content, not the original filename', async () => {
    // Real PNG bytes but a misleading .html filename — must be stored as .png
    const response = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', PNG_BUFFER, { filename: 'evil.html', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/.+\.png$/);
    createdFiles.push(path.basename(response.body.url));
  });

  it('should store a JPEG upload with a .jpg extension', async () => {
    const response = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', JPEG_BUFFER, { filename: 'photo.jpeg', contentType: 'image/jpeg' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/.+\.jpg$/);
    createdFiles.push(path.basename(response.body.url));
  });

  it('should serve uploaded files with X-Content-Type-Options: nosniff', async () => {
    const uploadResponse = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(201);
    createdFiles.push(path.basename(uploadResponse.body.url));

    const fileResponse = await request(app).get(uploadResponse.body.url);

    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should reject a non-image file with 400', async () => {
    const response = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', Buffer.from('not an image'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
  });

  it('should reject a request with no file with 400', async () => {
    const response = await request(app).post('/api/upload').set(authHeader('ADMIN'));

    expect(response.status).toBe(400);
  });

  it('should reject a file larger than 5MB with 400', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
    const response = await request(app)
      .post('/api/upload').set(authHeader('ADMIN'))
      .attach('image', bigBuffer, { filename: 'big.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
  });
});
