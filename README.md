# Binary Reward System — Demo

A binary-tree MLM reward demo: users register and are placed into a binary tree; each order propagates volume up every ancestor's left or right leg; nightly (or manual) settlement pairs each node's smaller leg, awards 10% of the paired volume as a bonus (capped at $2,000/cycle), and carries the unpaired remainder forward to the next cycle — final bonus is credited to the user's wallet. Built to showcase the end-to-end flow and the layered architecture decisions behind it.

## Architecture

| Layer        | Technology                                                               |
| ------------ | ------------------------------------------------------------------------ |
| Backend      | NestJS modular monolith — Tree, Order, Settlement, Wallet, Redis modules |
| Database     | MongoDB 7 (Mongoose ODM)                                                 |
| Cache / Legs | Redis 7 (atomic INCRBYFLOAT per leg)                                     |
| Queue        | BullMQ (settlement enqueue / processor)                                  |
| Frontend     | Next.js 14 (App Router) + React + Tailwind CSS                           |

## Running Locally

### Prerequisites

```bash
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7
```

### Backend (port 3100)

```bash
cd backend
npm install
npm run start:dev
```

### Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to use the dashboard.

## REST Smoke Test

`backend/scripts/smoke.http` contains the full ordered request sequence (register root → register children → place orders → run settlement). After running the smoke script, the expected state is:

- Root user `walletBalance`: **350**
- Root node `carryLeft`: **1500**

## Frontend e2e (Playwright)

Three scenarios are covered: happy path (create root → register alice/bob → order → settle → verify root wallet $350), occupied-leg error, and non-positive-order validation.

### Stack-up commands

```bash
# Start mongo + redis (or use existing containers)
docker run -d -p 27017:27017 --name demo-mongo mongo:7
docker run -d -p 6379:6379 --name demo-redis redis:7

# Drop the DB for a fresh run (required — test 2 depends on happy-path state)
mongosh binary_demo --eval "db.dropDatabase()"
redis-cli flushall

# Start backend (:3100) and frontend (:3000)
cd backend && npm run start:dev &
cd frontend && npm run dev &
```

### Run tests

```bash
cd frontend && npm run e2e
```

Expected output: `3 passed`. The occupied-leg and non-positive-order tests depend on happy-path having run first (alice registered at root-L); Playwright runs tests in file order by default, so this is satisfied automatically.

> **Note:** each run requires a fresh database (drop `binary_demo` before running) to keep usernames unique across runs.

## Deliberate Demo Simplifications

These trade-offs were made consciously to keep the demo concise:

- **Password hashing**: SHA-256 instead of bcrypt (speed, no native addon required).
- **Wallet writes**: sequential per-node credits rather than Mongo multi-document transactions (no replica-set requirement).
- **Rate & cap**: fixed 10% / $2,000 constants instead of ranking-tier lookup tables.
- **Settlement concurrency**: crash windows between Mongo carry persistence and Redis `clearLegs()` are acknowledged in `settlement.service.ts` comments but not mitigated — acceptable for a single-node demo, not for production.
