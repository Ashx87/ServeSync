# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ServeSync is a restaurant management system with three main interfaces:
- **Customer App** — menu browsing and order placement
- **Kitchen Display System (KDS)** — real-time order management for kitchen staff
- **Admin Dashboard** — analytics and reporting

## Monorepo Structure

```
ServeSync/
├── client/          # React + Vite + Tailwind CSS frontend
├── server/          # Express.js + Prisma + Socket.io backend
└── docs/            # Development plans and notes
```

Client and server have independent `package.json` files — commands must be run from within each directory.

## Commands

### Server (`cd server`)
```bash
npm run dev          # Start dev server (tsx watch)
npm run test         # Run all tests with Vitest
npm run test:watch   # Run tests in watch mode
```

### Client (`cd client`)
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
```

### Database (from `server/`)
```bash
npx prisma migrate dev   # Apply migrations
npx prisma studio        # Open Prisma Studio GUI
npx prisma generate      # Regenerate Prisma Client after schema changes
```

## Architecture

### Backend

- **Entry point**: `server/src/server.ts` — creates HTTP server and attaches Socket.io
- **App setup**: `server/src/app.ts` — Express routes, CORS, JSON middleware
- **Prisma client**: `server/src/config/prisma.ts` — singleton Prisma instance
- **Schema**: `server/prisma/schema.prisma` — PostgreSQL models

**API base**: `http://localhost:3000/api`

Key routes:
- `GET /health`
- `GET /api/menu/categories`
- `GET /api/menu/items?categoryId=<uuid>`
- `GET /api/orders?status=<status>`
- `POST /api/orders`
- `PATCH /api/orders/:id/status` — advance order status (body: `{ "status": "PREPARING" | "READY" | "COMPLETED" }`)
- `PATCH /api/orders/:id/items` — append items to an unsettled order; recalculates totalAmount, resets status to PENDING (body: `{ "items": [{ "menuItemId": "uuid", "quantity": 2, "notes": "..." }] }`); 409 if paymentStatus !== PENDING
- `GET /api/analytics/revenue?days=<number>` — daily revenue (default 7 days, max 90)
- `GET /api/analytics/top-items?limit=<number>` — top selling items (default 5, max 20)
- `GET /api/analytics/category-distribution` — sales quantity per category
- `GET /api/analytics/summary` — total orders, revenue, avg order value (COMPLETED orders only)

Order creation uses a Prisma `$transaction` for atomicity and emits a `new_order` Socket.io event on success.

### Frontend

- **Routing**: React Router nested under a `Layout` wrapper in `client/src/App.tsx`
- **State**: Zustand store for cart state in `client/src/store/useCartStore.ts`
- **KDS State**: Zustand store for kitchen orders in `client/src/store/useKdsStore.ts`
- **KDS Socket**: `client/src/hooks/useKdsSocket.ts` — connects to Socket.io, listens for `new_order` and `order_status_update`
- **KDS Route**: `/kitchen` — independent fullscreen layout (not nested under `Layout`)
- **Admin Route**: `/admin` — standalone fullscreen dashboard with Recharts (line, bar, pie charts)
- **Admin Charts**: `client/src/components/admin/` — RevenueChart, TopItemsChart, CategoryChart
- **API client**: Axios singleton in `client/src/api/apiClient.ts`, base URL from `VITE_API_URL` env var (defaults to `http://localhost:3000/api`)

### Real-time

Socket.io events:
- `new_order` — emitted on order creation (payload: full order with orderItems + menuItem)
- `order_status_update` — emitted on status change (payload: `{ orderId, status, updatedAt }`)
- `order_items_updated` — emitted when items are appended to an order before payment settles (payload: full updated order with orderItems + menuItem)

KDS at `/kitchen` listens for both events to update the kanban board in real-time.

## Database Models

| Model | Key Fields |
|-------|-----------|
| `Category` | `id`, `name` (unique), `description` |
| `MenuItem` | `id`, `name`, `price` (Decimal), `isAvailable`, `categoryId` |
| `Order` | `id`, `tableNumber`, `totalAmount`, `status` (enum), `paymentStatus` (enum) |
| `OrderItem` | `id`, `orderId`, `menuItemId`, `quantity`, `unitPrice` (price snapshot), `notes` |

`Order.status` enum: `PENDING → PREPARING → READY → COMPLETED / CANCELLED`

Status transitions are validated server-side: only `PENDING→PREPARING→READY→COMPLETED` is allowed (single-step forward only).

## Environment Variables

**Server** (`.env` in `server/`):
```
DATABASE_URL=<prisma postgres connection string>
PORT=3000
```

**Client** (`.env` in `client/`):
```
VITE_API_URL=http://localhost:3000/api
```

## Testing

Tests live in `server/tests/`. Prisma client and Socket.io are mocked via Vitest. Run a single test file:
```bash
npx vitest run tests/order.test.ts
```

## Prisma 7 Notes

- DATABASE_URL is `prisma+postgres://...` (Prisma Postgres hosted service)
- PrismaClient **requires** `accelerateUrl` option — `datasources`, `datasourceUrl`, and empty constructors all throw errors in v7
- `prisma.config.ts` is CLI-only (for migrations); runtime config is in `server/src/config/prisma.ts`

## Development Phases

- **Phase 1–4**: Complete (infrastructure, API, WebSockets, Customer App)
- **Phase 5**: Complete (KDS kanban board, order status update API, real-time sync)
- **Phase 6**: Complete (Admin Dashboard with analytics — revenue chart, top items, category distribution)

See `docs/PLAN.md` for detailed task breakdown per phase.
