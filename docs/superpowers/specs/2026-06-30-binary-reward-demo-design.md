# Binary Reward System — Interview Demo Design

**Date:** 2026-06-30
**Purpose:** A focused, demonstrable slice of a binary-tree MLM reward system, built to showcase **end-to-end flow clarity + architecture decisions** in job interviews (not algorithm depth).

---

## 1. Background

Extracted from a production binary MLM reward system (Node.js/Feathers + MongoDB + Redis) with four dense business blocks: binary placement, top-up/package purchase, reward distribution (direct/binary/leadership/pool), and cap deduction.

For the demo we keep only the **hardest-to-fake, easiest-to-narrate spine** and cut the MLM business noise.

### In scope (4 actions)
1. **Register + Placement** — sponsor / placement / position(L/R), with slot-availability check and ancestor-chain maintenance.
2. **Order / inject volume** — add an amount to a user; it accumulates up the placement ancestor chain into each upline's left/right leg.
3. **Pairing settlement** — smaller-leg pairing × fixed rate → daily cap → carry-over remainder. Runs via Cron **and** a manual "run now" button (same worker).
4. **Wallet credit** — bonus credited to wallet with transactional audit trail.

### Out of scope (cut as MLM noise)
- Packages / ranking / rank upgrade
- Static/Dynamic dual-cap deduction & multi-round redistribution
- Direct Reward progressive-difference / Leadership 12-portion / Pool / VIP
- auto-reload / grace period / robot trading

### Demonstration focus
End-to-end flow clarity + architecture decisions: service boundaries, MongoDB data modeling, Redis caching of tree volume, BullMQ cron settlement, transactional consistency / idempotency. **Algorithm is intentionally simple (fixed rate + fixed cap) so it does not distract from flow + architecture.**

---

## 2. Architecture

```
Frontend (Next.js + React)
  · binary tree visualization  · register/order forms  · "run settlement" button
  · volume-flows-up animation   · wallet / transaction ledger
        │ REST (HTTP)
Backend (NestJS monolith, modular)
  UsersModule · TreeModule · OrderModule · SettlementModule · WalletModule
  SettlementModule → BullMQ Queue (cron + manual trigger)
        │                              │
   MongoDB (persistence)          Redis (cache / locks)
```

### Module boundaries (single responsibility, called via service interfaces)

| Module | Responsibility | Depends on |
|--------|----------------|-----------|
| UsersModule | accounts, wallet balance read | MongoDB |
| TreeModule | placement, up/down-line relations, slot validation, left/right leg volume accumulation | MongoDB + Redis |
| OrderModule | order action → trigger volume propagation up the tree | TreeModule |
| SettlementModule | pairing settlement (min-leg × rate × cap × carry), cron + manual trigger, idempotency lock | TreeModule + WalletModule + BullMQ + Redis |
| WalletModule | bonus credit, transaction ledger, transactional records | MongoDB |

### Key architecture decisions (interview talking points)
- **Redis holds real-time left/right leg volume** (`leftVolume`/`rightVolume`): fast INCR on order, fast read on settlement, avoids re-aggregating Mongo each time.
- **BullMQ carries the settlement job**: cron enqueue + manual-button enqueue go through the **same worker**, so scheduled and live-demo runs share identical logic.
- **Settlement idempotency**: Redis distributed lock + settlement batch ID prevent double-settlement (common concurrency interview question).

---

## 3. Data Model (MongoDB)

**Tree representation:** ancestor-chain `uplines` array (not just a parent pointer), mirroring the original `placement-uplines` design. Rationale: settlement / volume propagation need all uplines of a node fast — an ancestor chain gets them in one query, no recursive tree walk. Cost: maintain the array on write, but registration is low-frequency. This "read-heavy → redundant ancestor chain trades write cost for read speed" tradeoff is a strong talking point.

```
User { _id, username (unique), passwordHash, walletBalance (Decimal, 4dp), createdAt }

TreeNode {
  _id, userId, sponsorId, placementId,
  position,            // 'L' | 'R' under placementId
  leftChildId, rightChildId,   // null = empty slot
  uplines: [ { nodeId, position } ],  // ancestor chain (direct parent → root); position = which leg this node sits on for that ancestor
  carryLeft, carryRight,       // carry-over remainder volume after last settlement
  createdAt
}

Order { _id, userId, nodeId, amount, createdAt }

SettlementBatch { _id, triggeredBy ('cron'|'manual'), status ('running'|'completed'|'failed'), totalBonus, startedAt, endedAt }

PairingRecord {   // per-user per-batch pairing result (audit + idempotency)
  _id, batchId, nodeId,
  leftVolume, rightVolume, pairedAmount,
  bonus, cappedAmount,
  carryLeftAfter, carryRightAfter
}

WalletTransaction { _id, userId, type ('BONUS_IN'|...), amount, refId (→ PairingRecord), balanceAfter, createdAt }
```

### Redis keys
```
node:{nodeId}:leftVolume     // real-time accumulated left-leg volume
node:{nodeId}:rightVolume    // real-time accumulated right-leg volume
settlement:lock              // settlement distributed lock (idempotency)
```

### Talking points
- `PairingRecord` + `SettlementBatch` make settlement auditable, traceable, idempotent — each user pairs once per batch.
- `carryLeft/carryRight` persist in MongoDB; Redis holds the live accumulator — dual-write consistency topic.
- `WalletTransaction.refId` traces every dollar back to a specific pairing — financial-audit closure.

---

## 4. End-to-End Data Flow

### Action 1: Register + Placement
```
POST /users/register { username, sponsor, placement, position }
  → TreeModule validates:
      ① is placement's {position} leg empty? (422 if occupied)
      ② is placement inside sponsor's downline network?
  → create User + TreeNode
  → build ancestor chain: copy placement.uplines + append placement itself
  → write back placement.leftChildId / rightChildId
  (all in one transaction)
```

### Action 2: Order → volume propagates up
```
POST /orders { userId, amount }
  → create Order
  → read TreeNode.uplines (one query → all uplines)
  → for each upline: by this node's position(L/R) under that upline
      Redis INCRBY node:{uplineId}:{left|right}Volume  amount
  (volume only flows to uplines' legs, not self)
```
O(tree height), one array pass + batch Redis INCR. Frontend plays the "amount flows up the tree" animation here.

### Action 3: Pairing settlement (Cron / manual, same path)
```
Cron(daily) or POST /settlement/run (manual)
  → BullMQ enqueue settlement job
  → Worker:
      ① acquire Redis settlement:lock (idempotency)
      ② create SettlementBatch(status=running)
      ③ for each TreeNode:
          left  = Redis leftVolume  + carryLeft
          right = Redis rightVolume + carryRight
          paired = min(left, right)
          bonus  = paired × RATE
          if bonus > DAILY_CAP: capped = bonus - DAILY_CAP; bonus = DAILY_CAP
          carry write-back = larger leg minus paired
          write PairingRecord
          WalletModule.credit(bonus)
          clear current Redis volume, persist carry to Mongo
      ④ SettlementBatch(status=completed, totalBonus)
      ⑤ release lock
```
Most architecture-dense step: idempotency lock, batch audit, Redis↔Mongo dual-write, cron/manual shared worker. Capped overflow recorded in `cappedAmount` (original sent it to company; here we just record).

### Action 4: Wallet credit (nested inside Action 3)
```
WalletModule.credit(userId, bonus, pairingRecordId)
  → transaction: User.walletBalance += bonus
                 create WalletTransaction(refId=pairingRecordId, balanceAfter)
```
Balance update + ledger write in one transaction; refId traces to the pairing record — audit closure.

---

## 5. One-minute interview narrative

> Registration places a person into the binary tree and maintains an ancestor chain → an order pushes volume up the ancestor chain into uplines' left/right legs (Redis live accumulation) → settlement (cron or manual) pairs the smaller leg, applies a fixed rate, hits a daily cap, carries over the remainder, all idempotent and auditable → the bonus is credited to the wallet transactionally, every dollar traceable.

---

## 6. Tech stack summary
- **Backend:** NestJS (modular monolith), Mongoose, BullMQ
- **Stores:** MongoDB (persistence), Redis (volume cache + settlement lock)
- **Frontend:** Next.js + React (tree visualization, forms, settlement trigger, ledger)
- **Settlement:** BullMQ worker, triggered by cron schedule and manual REST endpoint
```
