# ServeSync

> A comprehensive restaurant management system featuring a customer ordering interface, a real-time Kitchen Display System (KDS), and a data analytics dashboard.

ServeSync streamlines the full front-of-house and kitchen workflow: customers browse the menu and place orders, kitchen staff manage those orders live on a Kanban board, and managers track business performance through interactive charts — all kept in sync in real time via WebSockets.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Real-time Events](#real-time-events)
- [Database Models](#database-models)
- [Testing](#testing)
- [Development Status](#development-status)
- [License](#license)

---

## Features

### 🍽️ Customer App (`/`)
- Browse menu items grouped by category
- Add items to a cart with quantities
- Review the cart and place an order for a table

### 👨‍🍳 Kitchen Display System (`/kitchen`)
- Fullscreen Kanban board organized by order status
- New orders appear instantly — no refresh required
- Advance order status (Pending → Preparing → Ready → Completed) with a click
- Real-time synchronization across all connected screens

### 📊 Admin Dashboard (`/admin`)
- Daily revenue trends (line chart)
- Top-selling items (bar chart)
- Sales distribution by category (pie chart)
- Summary KPIs: total orders, total revenue, average order value

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS v4, React Router 7, Zustand, Recharts, Axios, Socket.io-client |
| **Backend** | Node.js, Express 5, TypeScript, Prisma 7, Socket.io |
| **Database** | PostgreSQL (Prisma Postgres hosted service) |
| **Testing** | Vitest, Supertest |

---

## Architecture

ServeSync is a **monorepo** with independent client and server packages.

```
┌─────────────────┐         REST (Axios)         ┌─────────────────┐
│                 │ ───────────────────────────▶ │                 │
│   React Client  │                               │  Express Server │
│  (Vite + TS)    │ ◀───────────────────────────  │  (Prisma + IO)  │
│                 │      WebSocket (Socket.io)     │                 │
└─────────────────┘                               └────────┬────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   PostgreSQL    │
                                                   │   (Prisma 7)    │
                                                   └─────────────────┘
```

- **REST API** handles menu browsing, order creation, status updates, and analytics.
- **Socket.io** pushes order events to the KDS in real time.
- Order creation runs inside a Prisma `$transaction` for atomicity, then emits a `new_order` event on success.

### Backend key files
- `server/src/server.ts` — HTTP server + Socket.io attachment (entry point)
- `server/src/app.ts` — Express routes, CORS, JSON middleware
- `server/src/config/prisma.ts` — singleton Prisma client (runtime config)
- `server/prisma/schema.prisma` — PostgreSQL models

### Frontend key files
- `client/src/App.tsx` — routing (Customer pages nested under `Layout`; `/kitchen` and `/admin` standalone)
- `client/src/store/useCartStore.ts` — cart state (Zustand)
- `client/src/store/useKdsStore.ts` — kitchen order state (Zustand)
- `client/src/hooks/useKdsSocket.ts` — Socket.io connection for KDS
- `client/src/api/apiClient.ts` — Axios singleton

---

## Project Structure

```
ServeSync/
├── client/                 # React + Vite + Tailwind frontend
│   └── src/
│       ├── api/            # Axios API client
│       ├── components/     # UI components (incl. admin/ charts, KDS columns/cards)
│       ├── hooks/          # useKdsSocket and others
│       ├── pages/          # Menu, Cart, Kitchen, Admin
│       ├── store/          # Zustand stores (cart, KDS)
│       └── App.tsx         # Routing
├── server/                 # Express + Prisma + Socket.io backend
│   ├── prisma/             # schema.prisma + migrations
│   ├── src/
│   │   ├── config/        # prisma.ts singleton
│   │   ├── app.ts         # Express app
│   │   └── server.ts      # HTTP + Socket.io entry point
│   └── tests/              # Vitest tests
└── docs/                   # Development plans and notes
```

> Client and server have **independent** `package.json` files — install dependencies and run commands from within each directory.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (this project uses [Prisma Postgres](https://www.prisma.io/postgres))

### 1. Clone the repository
```bash
git clone <repository-url>
cd ServeSync
```

### 2. Set up the backend
```bash
cd server
npm install

# Create a .env file (see Environment Variables below)
# Apply database migrations
npx prisma migrate dev

# Generate the Prisma Client
npx prisma generate

# Start the dev server (http://localhost:3000)
npm run dev
```

### 3. Set up the frontend
```bash
cd client
npm install

# Create a .env file (see Environment Variables below)
# Start the Vite dev server
npm run dev
```

The client will be available at the URL printed by Vite (default `http://localhost:5173`), connecting to the API at `http://localhost:3000/api`.

---

## Environment Variables

### Server (`server/.env`)
```env
DATABASE_URL=<prisma+postgres connection string>
PORT=3000
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Available Scripts

### Server (`cd server`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with `tsx watch` |
| `npm run test` | Run all tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

### Client (`cd client`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

### Database (`cd server`)
| Command | Description |
|---------|-------------|
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |

---

## API Reference

**Base URL:** `http://localhost:3000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/menu/categories` | List all categories |
| `GET` | `/api/menu/items?categoryId=<uuid>` | List menu items (optionally filtered by category) |
| `GET` | `/api/orders?status=<status>` | List orders (optionally filtered by status) |
| `POST` | `/api/orders` | Create a new order (atomic transaction, emits `new_order`) |
| `PATCH` | `/api/orders/:id/status` | Advance order status — body: `{ "status": "PREPARING" \| "READY" \| "COMPLETED" }` |
| `GET` | `/api/analytics/revenue?days=<n>` | Daily revenue (default 7 days, max 90) |
| `GET` | `/api/analytics/top-items?limit=<n>` | Top-selling items (default 5, max 20) |
| `GET` | `/api/analytics/category-distribution` | Sales quantity per category |
| `GET` | `/api/analytics/summary` | Total orders, revenue, and avg order value (COMPLETED orders only) |

> **Status transitions** are validated server-side: only single-step forward moves are allowed (`PENDING → PREPARING → READY → COMPLETED`).

---

## Real-time Events

Socket.io events emitted by the server and consumed by the KDS at `/kitchen`:

| Event | Trigger | Payload |
|-------|---------|---------|
| `new_order` | Order created | Full order with `orderItems` + `menuItem` |
| `order_status_update` | Status changed | `{ orderId, status, updatedAt }` |

---

## Database Models

| Model | Key Fields |
|-------|-----------|
| `Category` | `id`, `name` (unique), `description` |
| `MenuItem` | `id`, `name`, `price` (Decimal), `imageUrl`, `isAvailable`, `categoryId` |
| `Order` | `id`, `tableNumber`, `totalAmount`, `status`, `paymentStatus` |
| `OrderItem` | `id`, `orderId`, `menuItemId`, `quantity`, `unitPrice` (price snapshot), `notes` |

**Enums**
- `OrderStatus`: `PENDING → PREPARING → READY → COMPLETED / CANCELLED`
- `PaymentStatus`: `PENDING`, `PAID`, `REFUNDED`

> `OrderItem.unitPrice` snapshots the menu item's price at order time, so later price changes don't alter historical orders.

### Prisma 7 notes
- `DATABASE_URL` uses the `prisma+postgres://...` scheme (Prisma Postgres hosted service).
- The runtime `PrismaClient` requires the `accelerateUrl` option — configured in `server/src/config/prisma.ts`.
- `prisma.config.ts` is CLI-only (used for migrations).

---

## Testing

Tests live in `server/tests/`. The Prisma client and Socket.io are mocked via Vitest.

```bash
cd server
npm run test                      # Run all tests
npx vitest run tests/order.test.ts  # Run a single test file
```

---

## Development Status

All planned phases are complete:

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Infrastructure & database (Prisma models, Express, PostgreSQL) | ✅ |
| 2 | Core API (menu & order endpoints, TDD) | ✅ |
| 3 | Real-time WebSockets (`new_order`, `order_status_update`) | ✅ |
| 4 | Customer App (menu browsing, cart, checkout) | ✅ |
| 5 | Kitchen Display System (Kanban board, status updates) | ✅ |
| 6 | Admin Dashboard (revenue, top items, category distribution) | ✅ |

See `docs/PLAN.md` for the detailed task breakdown per phase.

---

## License

See the [LICENSE](LICENSE) file for details.
