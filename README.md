# Binary Reward System — Demo

A binary-tree MLM reward demo: users register and are placed into a binary tree; each order propagates volume up every ancestor's left or right leg; nightly (or manual) settlement pairs each node's smaller leg, awards 10% of the paired volume as a bonus (capped at $2,000/cycle), and carries the unpaired remainder forward to the next cycle — final bonus is credited to the user's wallet.  Built to showcase the end-to-end flow and the layered architecture decisions behind it.

## Architecture

| Layer | Technology |
|---|---|
| Backend | NestJS modular monolith — Tree, Order, Settlement, Wallet, Redis modules |
| Database | MongoDB 7 (Mongoose ODM) |
| Cache / Legs | Redis 7 (atomic INCRBYFLOAT per leg) |
| Queue | BullMQ (settlement enqueue / processor) |
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS |

## Running Locally

### Prerequisites

```bash
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7
```

### Backend (port 3001)

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

`backend/scripts/smoke.http` contains the full ordered request sequence (register root → register children → place orders → run settlement).  After running the smoke script, the expected state is:

- Root user `walletBalance`: **350**
- Root node `carryLeft`: **1500**

## Deliberate Demo Simplifications

These trade-offs were made consciously to keep the demo concise:

- **Password hashing**: SHA-256 instead of bcrypt (speed, no native addon required).
- **Wallet writes**: sequential per-node credits rather than Mongo multi-document transactions (no replica-set requirement).
- **Rate & cap**: fixed 10% / $2,000 constants instead of ranking-tier lookup tables.
- **Settlement concurrency**: crash windows between Mongo carry persistence and Redis `clearLegs()` are acknowledged in `settlement.service.ts` comments but not mitigated — acceptable for a single-node demo, not for production.
