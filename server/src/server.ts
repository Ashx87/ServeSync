import http from 'http';
import { Server } from 'socket.io';
import app from './app';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not configured. Set it in server/.env before starting.');
  process.exit(1);
}

if (!process.env.WEBHOOK_SECRET) {
  console.warn(
    'WARNING: WEBHOOK_SECRET is not set — payment webhook endpoint is unauthenticated (mock/dev mode only).'
  );
}

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    // Falls back to any origin when CORS_ORIGIN is unset (dev/mock mode)
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
