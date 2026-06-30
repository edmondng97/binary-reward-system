# Binary Reward Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demonstrable binary-tree MLM reward slice — register into tree, push order volume up the ancestor chain, run pairing settlement (cron + manual), credit wallet transactionally — to showcase flow + architecture in interviews.

**Architecture:** NestJS modular monolith (Users / Tree / Order / Settlement / Wallet modules) over MongoDB (persistence) + Redis (live leg-volume cache + settlement lock). BullMQ runs settlement via a shared worker triggered by cron and a manual REST endpoint. Next.js + React frontend visualizes the tree, forms, settlement trigger, and ledger.

**Tech Stack:** NestJS 10, Mongoose 8, ioredis, BullMQ 5, @nestjs/schedule, Jest, Next.js 14 (App Router) + React, TailwindCSS.

## Global Constraints

- Node.js >= 20.
- All monetary values stored and computed at 4 decimal places; round with a shared `round4(n)` helper, never raw float compare.
- Fixed settlement params (no ranking): `PAIRING_RATE = 0.10`, `DAILY_CAP = 2000` — defined once in `backend/src/config/settlement.config.ts`.
- Volume only propagates to **uplines'** legs, never the ordering node's own legs.
- Settlement must be idempotent: one Redis lock + one `PairingRecord` per node per batch.
- Comments in English; explanations to user in Simplified Chinese.
- Do not add dependencies beyond those listed in Task 1 without asking.
- Do not commit unless the user has authorized it (global rule). Steps below include `git commit` for engineers who have authorization; skip the commit step if not authorized and leave changes staged.

---

## File Structure

```
backend/
  src/
    config/settlement.config.ts        # PAIRING_RATE, DAILY_CAP
    common/round.ts                     # round4 helper
    redis/redis.module.ts               # ioredis provider
    redis/redis.service.ts              # typed leg-volume + lock ops
    users/user.schema.ts
    users/users.module.ts
    users/users.service.ts
    users/users.controller.ts
    tree/tree-node.schema.ts
    tree/tree.module.ts
    tree/tree.service.ts                # placement validation, ancestor chain, propagation
    tree/tree.controller.ts
    orders/order.schema.ts
    orders/orders.module.ts
    orders/orders.service.ts
    orders/orders.controller.ts
    wallet/wallet-transaction.schema.ts
    wallet/wallet.module.ts
    wallet/wallet.service.ts            # transactional credit
    settlement/settlement-batch.schema.ts
    settlement/pairing-record.schema.ts
    settlement/settlement.service.ts    # pairing algorithm + batch
    settlement/settlement.processor.ts  # BullMQ worker
    settlement/settlement.scheduler.ts  # cron enqueue
    settlement/settlement.controller.ts # manual trigger
    settlement/settlement.module.ts
    app.module.ts
    main.ts
  test/ (Jest specs colocated as *.spec.ts)
frontend/
  app/page.tsx                          # dashboard
  components/TreeView.tsx
  components/RegisterForm.tsx
  components/OrderForm.tsx
  components/SettlementPanel.tsx
  components/WalletLedger.tsx
  lib/api.ts                            # REST client
```

---

## Task 1: Backend scaffold + shared primitives

**Files:**

- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/nest-cli.json`, `backend/jest.config.js`
- Create: `backend/src/main.ts`, `backend/src/app.module.ts`
- Create: `backend/src/config/settlement.config.ts`, `backend/src/common/round.ts`
- Test: `backend/src/common/round.spec.ts`

**Interfaces:**

- Produces: `round4(n: number): number`; `PAIRING_RATE: number`, `DAILY_CAP: number` exported from settlement.config.

- [ ] **Step 1: Scaffold project**

```bash
mkdir -p backend && cd backend
npm init -y
npm i @nestjs/common@^10 @nestjs/core@^10 @nestjs/platform-express@^10 \
  @nestjs/mongoose@^10 mongoose@^8 @nestjs/schedule@^4 \
  @nestjs/bullmq@^10 bullmq@^5 ioredis@^5 reflect-metadata rxjs
npm i -D typescript@^5 @nestjs/cli@^10 @nestjs/testing@^10 \
  jest@^29 ts-jest@^29 @types/jest @types/node ts-node
```

- [ ] **Step 2: Config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2021",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "baseUrl": "./src"
  }
}
```

`nest-cli.json`:

```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

`jest.config.js`:

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
};
```

Add to `package.json` scripts: `"start": "nest start", "start:dev": "nest start --watch", "test": "jest"`.

- [ ] **Step 3: Write the failing test for round4**

`backend/src/common/round.spec.ts`:

```ts
import { round4 } from "./round";

describe("round4", () => {
  it("rounds to 4 decimal places", () => {
    expect(round4(1.234567)).toBe(1.2346);
  });
  it("avoids float drift", () => {
    expect(round4(0.1 + 0.2)).toBe(0.3);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx jest src/common/round.spec.ts`
Expected: FAIL — cannot find module './round'.

- [ ] **Step 5: Implement round4 + config**

`backend/src/common/round.ts`:

```ts
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e4) / 1e4;
}
```

`backend/src/config/settlement.config.ts`:

```ts
export const PAIRING_RATE = 0.1;
export const DAILY_CAP = 2000;
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npx jest src/common/round.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Minimal bootstrap**

`backend/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URL ?? "mongodb://localhost:27017/binary_demo",
    ),
  ],
})
export class AppModule {}
```

`backend/src/main.ts`:

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3100);
}
bootstrap();
```

- [ ] **Step 8: Commit**

```bash
git add backend && git commit -m "chore: scaffold NestJS backend with round4 + settlement config"
```

---

## Task 2: Redis service (leg volume + lock)

**Files:**

- Create: `backend/src/redis/redis.module.ts`, `backend/src/redis/redis.service.ts`
- Test: `backend/src/redis/redis.service.spec.ts`

**Interfaces:**

- Produces:
  - `incrLeg(nodeId: string, leg: 'L'|'R', amount: number): Promise<void>`
  - `readLegs(nodeId: string): Promise<{ left: number; right: number }>`
  - `clearLegs(nodeId: string): Promise<void>`
  - `acquireSettlementLock(ttlMs: number): Promise<boolean>`
  - `releaseSettlementLock(): Promise<void>`

- [ ] **Step 1: Write the failing test (mock ioredis)**

`backend/src/redis/redis.service.spec.ts`:

```ts
import { RedisService } from "./redis.service";

class FakeRedis {
  store = new Map<string, string>();
  async incrbyfloat(k: string, n: number) {
    const v = (parseFloat(this.store.get(k) ?? "0") + n).toString();
    this.store.set(k, v);
    return v;
  }
  async hget() {
    return null;
  }
  async get(k: string) {
    return this.store.get(k) ?? null;
  }
  async del(k: string) {
    this.store.delete(k);
    return 1;
  }
  async set(k: string, v: string, mode?: string, ttl?: number, nx?: string) {
    if (nx === "NX" && this.store.has(k)) return null;
    this.store.set(k, v);
    return "OK";
  }
}

describe("RedisService", () => {
  it("accumulates and reads leg volume", async () => {
    const svc = new RedisService(new FakeRedis() as any);
    await svc.incrLeg("n1", "L", 100);
    await svc.incrLeg("n1", "L", 50);
    await svc.incrLeg("n1", "R", 30);
    expect(await svc.readLegs("n1")).toEqual({ left: 150, right: 30 });
  });
  it("lock is exclusive", async () => {
    const svc = new RedisService(new FakeRedis() as any);
    expect(await svc.acquireSettlementLock(1000)).toBe(true);
    expect(await svc.acquireSettlementLock(1000)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/redis/redis.service.spec.ts`
Expected: FAIL — cannot find './redis.service'.

- [ ] **Step 3: Implement RedisService**

`backend/src/redis/redis.service.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { round4 } from "../common/round";

export const REDIS_CLIENT = "REDIS_CLIENT";
const LOCK_KEY = "settlement:lock";

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private legKey(nodeId: string, leg: "L" | "R") {
    return `node:${nodeId}:${leg === "L" ? "leftVolume" : "rightVolume"}`;
  }

  async incrLeg(nodeId: string, leg: "L" | "R", amount: number): Promise<void> {
    await this.redis.incrbyfloat(this.legKey(nodeId, leg), amount);
  }

  async readLegs(nodeId: string): Promise<{ left: number; right: number }> {
    const left = parseFloat(
      (await this.redis.get(this.legKey(nodeId, "L"))) ?? "0",
    );
    const right = parseFloat(
      (await this.redis.get(this.legKey(nodeId, "R"))) ?? "0",
    );
    return { left: round4(left), right: round4(right) };
  }

  async clearLegs(nodeId: string): Promise<void> {
    await this.redis.del(this.legKey(nodeId, "L"));
    await this.redis.del(this.legKey(nodeId, "R"));
  }

  async acquireSettlementLock(ttlMs: number): Promise<boolean> {
    const res = await this.redis.set(LOCK_KEY, "1", "PX", ttlMs, "NX");
    return res === "OK";
  }

  async releaseSettlementLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/redis/redis.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the module**

`backend/src/redis/redis.module.ts`:

```ts
import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { RedisService, REDIS_CLIENT } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? "redis://localhost:6379"),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
```

Add `RedisModule` to `app.module.ts` imports.

- [ ] **Step 6: Commit**

```bash
git add backend/src/redis backend/src/app.module.ts
git commit -m "feat: redis service for leg volume + settlement lock"
```

---

## Task 3: Users module (account + wallet balance)

**Files:**

- Create: `backend/src/users/user.schema.ts`, `users.service.ts`, `users.controller.ts`, `users.module.ts`
- Test: `backend/src/users/users.service.spec.ts`

**Interfaces:**

- Produces:
  - `User` schema: `{ username: string; passwordHash: string; walletBalance: number }`
  - `UsersService.create(username, password): Promise<UserDoc>`
  - `UsersService.findByUsername(username): Promise<UserDoc | null>`
  - `UsersService.findById(id): Promise<UserDoc | null>`

- [ ] **Step 1: Define schema**

`backend/src/users/user.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDoc = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 0 }) walletBalance: number;
}
export const UserSchema = SchemaFactory.createForClass(User);
```

- [ ] **Step 2: Write the failing test**

`backend/src/users/users.service.spec.ts`:

```ts
import { UsersService } from "./users.service";

function fakeModel() {
  const docs: any[] = [];
  const M: any = function (d: any) {
    Object.assign(this, d);
  };
  M.prototype.save = function () {
    docs.push(this);
    return Promise.resolve(this);
  };
  M.findOne = (q: any) => ({
    exec: () =>
      Promise.resolve(docs.find((d) => d.username === q.username) ?? null),
  });
  M.findById = (id: any) => ({
    exec: () => Promise.resolve(docs.find((d) => d._id === id) ?? null),
  });
  return M;
}

describe("UsersService", () => {
  it("hashes password on create", async () => {
    const svc = new UsersService(fakeModel());
    const u = await svc.create("alice", "secret");
    expect(u.username).toBe("alice");
    expect(u.passwordHash).not.toBe("secret");
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx jest src/users/users.service.spec.ts`
Expected: FAIL — cannot find './users.service'.

- [ ] **Step 4: Implement service**

`backend/src/users/users.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHash } from "crypto";
import { User, UserDoc } from "./user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<User>) {}

  private hash(pw: string) {
    return createHash("sha256").update(pw).digest("hex");
  }

  async create(username: string, password: string): Promise<UserDoc> {
    const doc = new this.model({
      username,
      passwordHash: this.hash(password),
      walletBalance: 0,
    });
    return doc.save();
  }
  findByUsername(username: string) {
    return this.model.findOne({ username }).exec();
  }
  findById(id: string) {
    return this.model.findById(id).exec();
  }
}
```

> Note: SHA-256 is for demo only; real systems use bcrypt. Call this out in interviews.

- [ ] **Step 5: Run test, verify it passes**

Run: `npx jest src/users/users.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Controller + module**

`backend/src/users/users.controller.ts`:

```ts
import { Controller, Get, Param } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get(":id")
  async get(@Param("id") id: string) {
    const u = await this.users.findById(id);
    return (
      u && { id: u._id, username: u.username, walletBalance: u.walletBalance }
    );
  }
}
```

`backend/src/users/users.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.schema";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
```

Add `UsersModule` to `app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/users backend/src/app.module.ts
git commit -m "feat: users module with wallet balance"
```

---

## Task 4: Tree module — schema, placement validation, ancestor chain

**Files:**

- Create: `backend/src/tree/tree-node.schema.ts`, `tree.service.ts`, `tree.controller.ts`, `tree.module.ts`
- Test: `backend/src/tree/tree.service.spec.ts`

**Interfaces:**

- Consumes: `UsersService.create`, `RedisService.incrLeg/readLegs/clearLegs`.
- Produces:
  - `TreeNode` schema: `{ userId, username, sponsorId, placementId, position: 'L'|'R', leftChildId, rightChildId, uplines: {nodeId,position}[], carryLeft, carryRight }`
  - `TreeService.register({ username, password, sponsorUsername, placementUsername, position }): Promise<TreeNodeDoc>`
  - `TreeService.createRoot(username, password): Promise<TreeNodeDoc>`
  - `TreeService.propagateVolume(nodeId, amount): Promise<void>`
  - `TreeService.findByUsername(username): Promise<TreeNodeDoc | null>`
  - `TreeService.allNodes(): Promise<TreeNodeDoc[]>`

- [ ] **Step 1: Define schema**

`backend/src/tree/tree-node.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type TreeNodeDoc = HydratedDocument<TreeNode>;

@Schema({ _id: false })
export class Upline {
  @Prop() nodeId: string;
  @Prop() position: "L" | "R";
}
const UplineSchema = SchemaFactory.createForClass(Upline);

@Schema({ timestamps: true })
export class TreeNode {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ default: null }) sponsorId: string | null;
  @Prop({ default: null }) placementId: string | null;
  @Prop({ type: String, default: null }) position: "L" | "R" | null;
  @Prop({ type: Types.ObjectId, default: null })
  leftChildId: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null })
  rightChildId: Types.ObjectId | null;
  @Prop({ type: [UplineSchema], default: [] }) uplines: Upline[];
  @Prop({ default: 0 }) carryLeft: number;
  @Prop({ default: 0 }) carryRight: number;
}
export const TreeNodeSchema = SchemaFactory.createForClass(TreeNode);
```

- [ ] **Step 2: Write the failing test for placement validation + ancestor chain**

`backend/src/tree/tree.service.spec.ts`:

```ts
import { TreeService } from "./tree.service";

// In-memory fakes; assert business rules, not Mongo wiring.
function fakeNodeModel() {
  const docs: any[] = [];
  let seq = 1;
  const M: any = function (d: any) {
    Object.assign(this, d, { _id: "id" + seq++ });
  };
  M.prototype.save = function () {
    const i = docs.findIndex((d) => d._id === this._id);
    if (i >= 0) docs[i] = this;
    else docs.push(this);
    return Promise.resolve(this);
  };
  M.findOne = (q: any) => ({
    exec: () =>
      Promise.resolve(docs.find((d) => d.username === q.username) ?? null),
  });
  M.findById = (id: any) => ({
    exec: () =>
      Promise.resolve(docs.find((d) => String(d._id) === String(id)) ?? null),
  });
  M.find = () => ({ exec: () => Promise.resolve(docs) });
  M._docs = docs;
  return M;
}
const fakeUsers = {
  create: async (u: string) => ({ _id: "u-" + u, username: u }),
} as any;
const fakeRedis = {
  incrLeg: jest.fn(),
  readLegs: jest.fn(),
  clearLegs: jest.fn(),
} as any;

describe("TreeService", () => {
  it("rejects placement on an occupied leg", async () => {
    const M = fakeNodeModel();
    const svc = new TreeService(M, fakeUsers, fakeRedis);
    const root = await svc.createRoot("root", "p");
    await svc.register({
      username: "a",
      password: "p",
      sponsorUsername: "root",
      placementUsername: "root",
      position: "L",
    });
    await expect(
      svc.register({
        username: "b",
        password: "p",
        sponsorUsername: "root",
        placementUsername: "root",
        position: "L",
      }),
    ).rejects.toThrow(/occupied/i);
  });

  it("builds ancestor chain = placement.uplines + placement", async () => {
    const M = fakeNodeModel();
    const svc = new TreeService(M, fakeUsers, fakeRedis);
    await svc.createRoot("root", "p");
    await svc.register({
      username: "a",
      password: "p",
      sponsorUsername: "root",
      placementUsername: "root",
      position: "L",
    });
    const child = await svc.register({
      username: "b",
      password: "p",
      sponsorUsername: "root",
      placementUsername: "a",
      position: "R",
    });
    // a's parent is root(L); b's parent is a(R). chain (parent→root): a, root
    expect(child.uplines.map((u: any) => u.position)).toEqual(["R", "L"]);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx jest src/tree/tree.service.spec.ts`
Expected: FAIL — cannot find './tree.service'.

- [ ] **Step 4: Implement TreeService**

`backend/src/tree/tree.service.ts`:

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TreeNode, TreeNodeDoc, Upline } from "./tree-node.schema";
import { UsersService } from "../users/users.service";
import { RedisService } from "../redis/redis.service";

interface RegisterInput {
  username: string;
  password: string;
  sponsorUsername: string;
  placementUsername: string;
  position: "L" | "R";
}

@Injectable()
export class TreeService {
  constructor(
    @InjectModel(TreeNode.name) private readonly model: Model<TreeNode>,
    private readonly users: UsersService,
    private readonly redis: RedisService,
  ) {}

  findByUsername(username: string) {
    return this.model.findOne({ username }).exec();
  }
  allNodes() {
    return this.model.find().exec();
  }

  async createRoot(username: string, password: string): Promise<TreeNodeDoc> {
    const user = await this.users.create(username, password);
    const node = new this.model({
      userId: String(user._id),
      username,
      sponsorId: null,
      placementId: null,
      position: null,
      uplines: [],
      carryLeft: 0,
      carryRight: 0,
    });
    return node.save();
  }

  async register(input: RegisterInput): Promise<TreeNodeDoc> {
    const placement = await this.model
      .findOne({ username: input.placementUsername })
      .exec();
    if (!placement) throw new NotFoundException("placement not found");
    const sponsor = await this.model
      .findOne({ username: input.sponsorUsername })
      .exec();
    if (!sponsor) throw new NotFoundException("sponsor not found");

    const legField = input.position === "L" ? "leftChildId" : "rightChildId";
    if (placement[legField]) {
      throw new BadRequestException(
        `placement ${input.position} leg is occupied`,
      );
    }

    const user = await this.users.create(input.username, input.password);
    // ancestor chain: this node sits at `position` under placement → prepend placement;
    // then inherit placement's own uplines (already parent→root ordered).
    const uplines: Upline[] = [
      { nodeId: String(placement._id), position: input.position },
      ...placement.uplines,
    ];
    const node = new this.model({
      userId: String(user._id),
      username: input.username,
      sponsorId: String(sponsor._id),
      placementId: String(placement._id),
      position: input.position,
      uplines,
      carryLeft: 0,
      carryRight: 0,
    });
    const saved = await node.save();

    placement[legField] = saved._id;
    await placement.save();
    return saved;
  }

  // Push `amount` to every upline's leg (the leg this node sits on for that upline).
  async propagateVolume(nodeId: string, amount: number): Promise<void> {
    const node = await this.model.findById(nodeId).exec();
    if (!node) throw new NotFoundException("node not found");
    for (const up of node.uplines) {
      await this.redis.incrLeg(up.nodeId, up.position, amount);
    }
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx jest src/tree/tree.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Controller + module**

`backend/src/tree/tree.controller.ts`:

```ts
import { Body, Controller, Get, Post } from "@nestjs/common";
import { TreeService } from "./tree.service";

@Controller("tree")
export class TreeController {
  constructor(private readonly tree: TreeService) {}

  @Post("root")
  createRoot(@Body() b: { username: string; password: string }) {
    return this.tree.createRoot(b.username, b.password);
  }

  @Post("register")
  register(@Body() b: any) {
    return this.tree.register(b);
  }

  @Get()
  async list() {
    const nodes = await this.tree.allNodes();
    return Promise.all(
      nodes.map(async (n) => ({
        id: String(n._id),
        username: n.username,
        placementId: n.placementId,
        position: n.position,
        leftChildId: n.leftChildId,
        rightChildId: n.rightChildId,
        carryLeft: n.carryLeft,
        carryRight: n.carryRight,
      })),
    );
  }
}
```

`backend/src/tree/tree.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TreeNode, TreeNodeSchema } from "./tree-node.schema";
import { TreeService } from "./tree.service";
import { TreeController } from "./tree.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TreeNode.name, schema: TreeNodeSchema },
    ]),
    UsersModule,
  ],
  providers: [TreeService],
  controllers: [TreeController],
  exports: [TreeService, MongooseModule],
})
export class TreeModule {}
```

Add `TreeModule` to `app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/tree backend/src/app.module.ts
git commit -m "feat: tree module with placement validation + ancestor chain + volume propagation"
```

---

## Task 5: Orders module

**Files:**

- Create: `backend/src/orders/order.schema.ts`, `orders.service.ts`, `orders.controller.ts`, `orders.module.ts`
- Test: `backend/src/orders/orders.service.spec.ts`

**Interfaces:**

- Consumes: `TreeService.findByUsername`, `TreeService.propagateVolume`.
- Produces: `OrdersService.placeOrder(username, amount): Promise<OrderDoc>`

- [ ] **Step 1: Schema**

`backend/src/orders/order.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
export type OrderDoc = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) nodeId: string;
  @Prop({ required: true }) amount: number;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
```

- [ ] **Step 2: Write the failing test**

`backend/src/orders/orders.service.spec.ts`:

```ts
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  it("creates order and propagates volume up the tree", async () => {
    const node = { _id: "n1", userId: "u1" };
    const tree = {
      findByUsername: jest.fn().mockResolvedValue(node),
      propagateVolume: jest.fn().mockResolvedValue(undefined),
    } as any;
    const saved: any[] = [];
    const M: any = function (d: any) {
      Object.assign(this, d);
    };
    M.prototype.save = function () {
      saved.push(this);
      return Promise.resolve(this);
    };
    const svc = new OrdersService(M, tree);

    await svc.placeOrder("alice", 100);

    expect(saved[0].amount).toBe(100);
    expect(tree.propagateVolume).toHaveBeenCalledWith("n1", 100);
  });

  it("rejects non-positive amount", async () => {
    const svc = new OrdersService({} as any, {} as any);
    await expect(svc.placeOrder("alice", 0)).rejects.toThrow(/amount/i);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx jest src/orders/orders.service.spec.ts`
Expected: FAIL — cannot find './orders.service'.

- [ ] **Step 4: Implement service**

`backend/src/orders/orders.service.ts`:

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDoc } from "./order.schema";
import { TreeService } from "../tree/tree.service";
import { round4 } from "../common/round";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<Order>,
    private readonly tree: TreeService,
  ) {}

  async placeOrder(username: string, amount: number): Promise<OrderDoc> {
    if (!(amount > 0)) throw new BadRequestException("amount must be positive");
    const node = await this.tree.findByUsername(username);
    if (!node) throw new NotFoundException("user node not found");
    const order = new this.model({
      userId: node.userId,
      nodeId: String(node._id),
      amount: round4(amount),
    });
    const saved = await order.save();
    await this.tree.propagateVolume(String(node._id), round4(amount));
    return saved;
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx jest src/orders/orders.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Controller + module**

`backend/src/orders/orders.controller.ts`:

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post()
  place(@Body() b: { username: string; amount: number }) {
    return this.orders.placeOrder(b.username, b.amount);
  }
}
```

`backend/src/orders/orders.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "./order.schema";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { TreeModule } from "../tree/tree.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    TreeModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
```

Add `OrdersModule` to `app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/orders backend/src/app.module.ts
git commit -m "feat: orders module triggers volume propagation"
```

---

## Task 6: Wallet module (transactional credit)

**Files:**

- Create: `backend/src/wallet/wallet-transaction.schema.ts`, `wallet.service.ts`, `wallet.controller.ts`, `wallet.module.ts`
- Test: `backend/src/wallet/wallet.service.spec.ts`

**Interfaces:**

- Consumes: `User` model (via UsersModule export).
- Produces:
  - `WalletTransaction` schema: `{ userId, type, amount, refId, balanceAfter }`
  - `WalletService.credit(userId, amount, refId): Promise<{ balanceAfter: number }>`
  - `WalletService.ledger(userId): Promise<WalletTxnDoc[]>`

- [ ] **Step 1: Schema**

`backend/src/wallet/wallet-transaction.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
export type WalletTxnDoc = HydratedDocument<WalletTransaction>;

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) type: string; // 'BONUS_IN'
  @Prop({ required: true }) amount: number;
  @Prop({ default: null }) refId: string | null; // → PairingRecord
  @Prop({ required: true }) balanceAfter: number;
}
export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);
```

- [ ] **Step 2: Write the failing test**

`backend/src/wallet/wallet.service.spec.ts`:

```ts
import { WalletService } from "./wallet.service";
import { round4 } from "../common/round";

describe("WalletService", () => {
  it("credits balance and records a traceable transaction", async () => {
    const user: any = {
      _id: "u1",
      walletBalance: 100,
      save: jest.fn().mockResolvedValue(true),
    };
    const userModel: any = {
      findById: () => ({ exec: () => Promise.resolve(user) }),
    };
    const saved: any[] = [];
    const TxnModel: any = function (d: any) {
      Object.assign(this, d);
    };
    TxnModel.prototype.save = function () {
      saved.push(this);
      return Promise.resolve(this);
    };

    const svc = new WalletService(userModel, TxnModel);
    const res = await svc.credit("u1", 55.5, "pair-1");

    expect(res.balanceAfter).toBe(round4(155.5));
    expect(user.walletBalance).toBe(round4(155.5));
    expect(saved[0]).toMatchObject({
      userId: "u1",
      amount: 55.5,
      refId: "pair-1",
      type: "BONUS_IN",
      balanceAfter: 155.5,
    });
  });

  it("skips zero-amount credits", async () => {
    const svc = new WalletService({} as any, {} as any);
    const res = await svc.credit("u1", 0, "pair-1");
    expect(res.balanceAfter).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx jest src/wallet/wallet.service.spec.ts`
Expected: FAIL — cannot find './wallet.service'.

- [ ] **Step 4: Implement service**

`backend/src/wallet/wallet.service.ts`:

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "../users/user.schema";
import { WalletTransaction, WalletTxnDoc } from "./wallet-transaction.schema";
import { round4 } from "../common/round";

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(WalletTransaction.name)
    private readonly txnModel: Model<WalletTransaction>,
  ) {}

  // Balance update + ledger write. In a replica-set Mongo this would wrap a session txn;
  // for the demo the two writes are sequential and idempotency is guaranteed upstream
  // (one PairingRecord per node per batch).
  async credit(
    userId: string,
    amount: number,
    refId: string,
  ): Promise<{ balanceAfter: number | null }> {
    if (!(amount > 0)) return { balanceAfter: null };
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException("user not found");
    user.walletBalance = round4(user.walletBalance + amount);
    await user.save();
    const txn = new this.txnModel({
      userId,
      type: "BONUS_IN",
      amount: round4(amount),
      refId,
      balanceAfter: user.walletBalance,
    });
    await txn.save();
    return { balanceAfter: user.walletBalance };
  }

  ledger(userId: string): Promise<WalletTxnDoc[]> {
    return this.txnModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx jest src/wallet/wallet.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Controller + module**

`backend/src/wallet/wallet.controller.ts`:

```ts
import { Controller, Get, Param } from "@nestjs/common";
import { WalletService } from "./wallet.service";

@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}
  @Get(":userId/ledger")
  ledger(@Param("userId") userId: string) {
    return this.wallet.ledger(userId);
  }
}
```

`backend/src/wallet/wallet.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  WalletTransaction,
  WalletTransactionSchema,
} from "./wallet-transaction.schema";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    UsersModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
```

Add `WalletModule` to `app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/wallet backend/src/app.module.ts
git commit -m "feat: wallet module with traceable credit + ledger"
```

---

## Task 7: Settlement core — pairing algorithm + batch

**Files:**

- Create: `backend/src/settlement/settlement-batch.schema.ts`, `pairing-record.schema.ts`, `settlement.service.ts`
- Test: `backend/src/settlement/settlement.service.spec.ts`

**Interfaces:**

- Consumes: `TreeService.allNodes`, `RedisService.readLegs/clearLegs/acquireSettlementLock/releaseSettlementLock`, `WalletService.credit`, model for SettlementBatch + PairingRecord, `TreeNode` model (for carry write-back).
- Produces:
  - `pairNode(left, right, rate, cap)` pure helper → `{ pairedAmount, bonus, cappedAmount, carryLeftAfter, carryRightAfter }`
  - `SettlementService.run(triggeredBy: 'cron'|'manual'): Promise<{ batchId: string; totalBonus: number; skipped?: boolean }>`

- [ ] **Step 1: Write the failing test for the pure pairing helper**

`backend/src/settlement/settlement.service.spec.ts`:

```ts
import { pairNode } from "./settlement.service";

describe("pairNode", () => {
  it("pairs smaller leg and carries the remainder (no cap hit)", () => {
    // left 5000, right 3500, rate 10%, cap 2000
    expect(pairNode(5000, 3500, 0.1, 2000)).toEqual({
      pairedAmount: 3500,
      bonus: 350,
      cappedAmount: 0,
      carryLeftAfter: 1500,
      carryRightAfter: 0,
    });
  });

  it("applies the daily cap and records the overflow", () => {
    // left 30000 right 30000 rate 10% → 3000 bonus capped to 2000
    expect(pairNode(30000, 30000, 0.1, 2000)).toEqual({
      pairedAmount: 30000,
      bonus: 2000,
      cappedAmount: 1000,
      carryLeftAfter: 0,
      carryRightAfter: 0,
    });
  });

  it("zero on an empty leg", () => {
    expect(pairNode(1000, 0, 0.1, 2000)).toEqual({
      pairedAmount: 0,
      bonus: 0,
      cappedAmount: 0,
      carryLeftAfter: 1000,
      carryRightAfter: 0,
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/settlement/settlement.service.spec.ts`
Expected: FAIL — cannot find './settlement.service'.

- [ ] **Step 3: Implement schemas + pure helper + service**

`backend/src/settlement/settlement-batch.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
export type SettlementBatchDoc = HydratedDocument<SettlementBatch>;

@Schema({ timestamps: true })
export class SettlementBatch {
  @Prop({ required: true }) triggeredBy: string; // 'cron' | 'manual'
  @Prop({ required: true, default: "running" }) status: string;
  @Prop({ default: 0 }) totalBonus: number;
  @Prop({ default: null }) endedAt: Date | null;
}
export const SettlementBatchSchema =
  SchemaFactory.createForClass(SettlementBatch);
```

`backend/src/settlement/pairing-record.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
export type PairingRecordDoc = HydratedDocument<PairingRecord>;

@Schema({ timestamps: true })
export class PairingRecord {
  @Prop({ required: true }) batchId: string;
  @Prop({ required: true }) nodeId: string;
  @Prop() leftVolume: number;
  @Prop() rightVolume: number;
  @Prop() pairedAmount: number;
  @Prop() bonus: number;
  @Prop() cappedAmount: number;
  @Prop() carryLeftAfter: number;
  @Prop() carryRightAfter: number;
}
export const PairingRecordSchema = SchemaFactory.createForClass(PairingRecord);
// Idempotency: one record per node per batch.
PairingRecordSchema.index({ batchId: 1, nodeId: 1 }, { unique: true });
```

`backend/src/settlement/settlement.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TreeNode } from "../tree/tree-node.schema";
import { TreeService } from "../tree/tree.service";
import { RedisService } from "../redis/redis.service";
import { WalletService } from "../wallet/wallet.service";
import { SettlementBatch } from "./settlement-batch.schema";
import { PairingRecord } from "./pairing-record.schema";
import { PAIRING_RATE, DAILY_CAP } from "../config/settlement.config";
import { round4 } from "../common/round";

export function pairNode(
  left: number,
  right: number,
  rate: number,
  cap: number,
) {
  const pairedAmount = round4(Math.min(left, right));
  let bonus = round4(pairedAmount * rate);
  let cappedAmount = 0;
  if (bonus > cap) {
    cappedAmount = round4(bonus - cap);
    bonus = cap;
  }
  return {
    pairedAmount,
    bonus,
    cappedAmount,
    carryLeftAfter: round4(left - pairedAmount),
    carryRightAfter: round4(right - pairedAmount),
  };
}

const LOCK_TTL_MS = 60_000;

@Injectable()
export class SettlementService {
  constructor(
    private readonly tree: TreeService,
    private readonly redis: RedisService,
    private readonly wallet: WalletService,
    @InjectModel(SettlementBatch.name)
    private readonly batchModel: Model<SettlementBatch>,
    @InjectModel(PairingRecord.name)
    private readonly recordModel: Model<PairingRecord>,
    @InjectModel(TreeNode.name) private readonly nodeModel: Model<TreeNode>,
  ) {}

  async run(
    triggeredBy: "cron" | "manual",
  ): Promise<{ batchId: string; totalBonus: number; skipped?: boolean }> {
    const locked = await this.redis.acquireSettlementLock(LOCK_TTL_MS);
    if (!locked) return { batchId: "", totalBonus: 0, skipped: true };

    const batch = await new this.batchModel({
      triggeredBy,
      status: "running",
    }).save();
    let totalBonus = 0;
    try {
      const nodes = await this.tree.allNodes();
      for (const node of nodes) {
        const live = await this.redis.readLegs(String(node._id));
        const left = round4(live.left + node.carryLeft);
        const right = round4(live.right + node.carryRight);
        const r = pairNode(left, right, PAIRING_RATE, DAILY_CAP);

        await new this.recordModel({
          batchId: String(batch._id),
          nodeId: String(node._id),
          leftVolume: left,
          rightVolume: right,
          pairedAmount: r.pairedAmount,
          bonus: r.bonus,
          cappedAmount: r.cappedAmount,
          carryLeftAfter: r.carryLeftAfter,
          carryRightAfter: r.carryRightAfter,
        }).save();

        if (r.bonus > 0) {
          await this.wallet.credit(
            node.userId,
            r.bonus,
            String(batch._id) + ":" + String(node._id),
          );
          totalBonus = round4(totalBonus + r.bonus);
        }

        node.carryLeft = r.carryLeftAfter;
        node.carryRight = r.carryRightAfter;
        await node.save();
        await this.redis.clearLegs(String(node._id));
      }
      batch.status = "completed";
      batch.totalBonus = totalBonus;
      batch.endedAt = new Date();
      await batch.save();
      return { batchId: String(batch._id), totalBonus };
    } catch (e) {
      batch.status = "failed";
      await batch.save();
      throw e;
    } finally {
      await this.redis.releaseSettlementLock();
    }
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/settlement/settlement.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/settlement
git commit -m "feat: settlement pairing algorithm + batch with idempotency lock"
```

---

## Task 8: Settlement wiring — BullMQ worker, cron, manual endpoint

**Files:**

- Create: `backend/src/settlement/settlement.processor.ts`, `settlement.scheduler.ts`, `settlement.controller.ts`, `settlement.module.ts`
- Modify: `backend/src/app.module.ts` (register BullMQ + ScheduleModule)
- Test: `backend/src/settlement/settlement.processor.spec.ts`

**Interfaces:**

- Consumes: `SettlementService.run`.
- Produces: queue name `'settlement'`, job name `'run'`; `POST /settlement/run` enqueues a manual job and returns `{ enqueued: true }`.

- [ ] **Step 1: Write the failing test for the processor**

`backend/src/settlement/settlement.processor.spec.ts`:

```ts
import { SettlementProcessor } from "./settlement.processor";

describe("SettlementProcessor", () => {
  it("delegates job to SettlementService.run with triggeredBy", async () => {
    const settlement = {
      run: jest.fn().mockResolvedValue({ batchId: "b1", totalBonus: 10 }),
    } as any;
    const proc = new SettlementProcessor(settlement);
    const res = await proc.process({
      name: "run",
      data: { triggeredBy: "manual" },
    } as any);
    expect(settlement.run).toHaveBeenCalledWith("manual");
    expect(res).toEqual({ batchId: "b1", totalBonus: 10 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/settlement/settlement.processor.spec.ts`
Expected: FAIL — cannot find './settlement.processor'.

- [ ] **Step 3: Implement processor, scheduler, controller, module**

`backend/src/settlement/settlement.processor.ts`:

```ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { SettlementService } from "./settlement.service";

@Processor("settlement")
export class SettlementProcessor extends WorkerHost {
  constructor(private readonly settlement: SettlementService) {
    super();
  }
  async process(job: Job<{ triggeredBy: "cron" | "manual" }>) {
    return this.settlement.run(job.data.triggeredBy);
  }
}
```

`backend/src/settlement/settlement.scheduler.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class SettlementScheduler {
  constructor(@InjectQueue("settlement") private readonly queue: Queue) {}
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async daily() {
    await this.queue.add("run", { triggeredBy: "cron" });
  }
}
```

`backend/src/settlement/settlement.controller.ts`:

```ts
import { Controller, Post } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Controller("settlement")
export class SettlementController {
  constructor(@InjectQueue("settlement") private readonly queue: Queue) {}
  @Post("run")
  async run() {
    await this.queue.add("run", { triggeredBy: "manual" });
    return { enqueued: true };
  }
}
```

`backend/src/settlement/settlement.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import {
  SettlementBatch,
  SettlementBatchSchema,
} from "./settlement-batch.schema";
import { PairingRecord, PairingRecordSchema } from "./pairing-record.schema";
import { SettlementService } from "./settlement.service";
import { SettlementProcessor } from "./settlement.processor";
import { SettlementScheduler } from "./settlement.scheduler";
import { SettlementController } from "./settlement.controller";
import { TreeModule } from "../tree/tree.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SettlementBatch.name, schema: SettlementBatchSchema },
      { name: PairingRecord.name, schema: PairingRecordSchema },
    ]),
    BullModule.registerQueue({ name: "settlement" }),
    TreeModule,
    WalletModule,
  ],
  providers: [SettlementService, SettlementProcessor, SettlementScheduler],
  controllers: [SettlementController],
})
export class SettlementModule {}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/settlement/settlement.processor.spec.ts`
Expected: PASS.

- [ ] **Step 5: Register infra in app.module.ts**

Update `backend/src/app.module.ts` to include:

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
// ...inside imports array:
ScheduleModule.forRoot(),
BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' } }),
RedisModule, UsersModule, TreeModule, OrdersModule, WalletModule, SettlementModule,
```

- [ ] **Step 6: Full backend test run**

Run: `npx jest`
Expected: all suites PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/settlement backend/src/app.module.ts
git commit -m "feat: settlement worker, daily cron, manual trigger endpoint"
```

---

## Task 9: Manual end-to-end smoke (requires running Mongo + Redis)

**Files:**

- Create: `backend/scripts/smoke.http` (REST snippets) — documentation of the demo flow.

**Interfaces:** none (manual verification task).

- [ ] **Step 1: Start infra + app**

```bash
docker run -d -p 27017:27017 --name demo-mongo mongo:7
docker run -d -p 6379:6379 --name demo-redis redis:7
cd backend && npm run start:dev
```

- [ ] **Step 2: Drive the flow + record expected outputs**

`backend/scripts/smoke.http`:

```http
### create root
POST http://localhost:3100/tree/root
Content-Type: application/json
{ "username": "root", "password": "p" }

### register a under root-L
POST http://localhost:3100/tree/register
Content-Type: application/json
{ "username": "a", "password": "p", "sponsorUsername": "root", "placementUsername": "root", "position": "L" }

### register b under root-R
POST http://localhost:3100/tree/register
Content-Type: application/json
{ "username": "b", "password": "p", "sponsorUsername": "root", "placementUsername": "root", "position": "R" }

### order on a → +5000 to root.left
POST http://localhost:3100/orders
Content-Type: application/json
{ "username": "a", "amount": 5000 }

### order on b → +3500 to root.right
POST http://localhost:3100/orders
Content-Type: application/json
{ "username": "b", "amount": 3500 }

### run settlement → root pairs 3500 × 10% = 350 bonus
POST http://localhost:3100/settlement/run

### check root user wallet (expect walletBalance 350 after worker runs)
# GET http://localhost:3100/users/<rootUserId>
```

- [ ] **Step 3: Verify**

Expected: after settlement, root's `walletBalance == 350`, root node `carryLeft == 1500`, `carryRight == 0`. Confirm in a Mongo shell or via the users endpoint.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/smoke.http
git commit -m "docs: end-to-end smoke script for demo flow"
```

---

## Task 10: Frontend — dashboard, tree view, forms, settlement, ledger

**Files:**

- Create: `frontend/package.json`, `frontend/lib/api.ts`, `frontend/app/page.tsx`
- Create: `frontend/components/RegisterForm.tsx`, `OrderForm.tsx`, `SettlementPanel.tsx`, `TreeView.tsx`, `WalletLedger.tsx`

**Interfaces:**

- Consumes backend REST: `POST /tree/root`, `POST /tree/register`, `GET /tree`, `POST /orders`, `POST /settlement/run`, `GET /users/:id`, `GET /wallet/:userId/ledger`.

- [ ] **Step 1: Scaffold Next.js**

```bash
npx create-next-app@14 frontend --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2: API client**

`frontend/lib/api.ts`:

```ts
const BASE = process.env.NEXT_PUBLIC_API ?? "http://localhost:3100";
async function req(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => ({}))).message ?? res.statusText,
    );
  return res.json();
}
export const api = {
  createRoot: (username: string, password: string) =>
    req("/tree/root", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (b: {
    username: string;
    password: string;
    sponsorUsername: string;
    placementUsername: string;
    position: "L" | "R";
  }) => req("/tree/register", { method: "POST", body: JSON.stringify(b) }),
  tree: () => req("/tree"),
  order: (username: string, amount: number) =>
    req("/orders", {
      method: "POST",
      body: JSON.stringify({ username, amount }),
    }),
  settle: () => req("/settlement/run", { method: "POST" }),
  ledger: (userId: string) => req(`/wallet/${userId}/ledger`),
};
```

- [ ] **Step 3: Tree view (renders nodes + legs from GET /tree)**

`frontend/components/TreeView.tsx`:

```tsx
"use client";
type Node = {
  id: string;
  username: string;
  placementId: string | null;
  position: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
  carryLeft: number;
  carryRight: number;
};

export function TreeView({ nodes }: { nodes: Node[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = nodes.find((n) => !n.placementId);
  if (!root)
    return <p className="text-gray-500">No tree yet. Create a root.</p>;

  const render = (node: Node): JSX.Element => {
    const left = node.leftChildId ? byId.get(node.leftChildId) : undefined;
    const right = node.rightChildId ? byId.get(node.rightChildId) : undefined;
    return (
      <div className="flex flex-col items-center">
        <div className="rounded border px-3 py-1 bg-white shadow text-sm">
          <div className="font-semibold">{node.username}</div>
          <div className="text-xs text-gray-500">
            L:{node.carryLeft} R:{node.carryRight}
          </div>
        </div>
        {(left || right) && (
          <div className="flex gap-8 mt-4">
            <div>{left ? render(left) : <Empty label="L" />}</div>
            <div>{right ? render(right) : <Empty label="R" />}</div>
          </div>
        )}
      </div>
    );
  };
  return <div className="overflow-auto p-4">{render(root)}</div>;
}
const Empty = ({ label }: { label: string }) => (
  <div className="rounded border border-dashed px-3 py-1 text-xs text-gray-400">
    {label} empty
  </div>
);
```

- [ ] **Step 4: Forms + settlement panel**

`frontend/components/RegisterForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function RegisterForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    username: "",
    password: "p",
    sponsorUsername: "",
    placementUsername: "",
    position: "L" as "L" | "R",
  });
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await api.register(f);
      onDone();
    } catch (x: any) {
      setErr(x.message);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">Register</h3>
      {["username", "sponsorUsername", "placementUsername"].map((k) => (
        <input
          key={k}
          placeholder={k}
          className="border p-1 w-full"
          value={(f as any)[k]}
          onChange={(e) => setF({ ...f, [k]: e.target.value })}
        />
      ))}
      <select
        className="border p-1 w-full"
        value={f.position}
        onChange={(e) => setF({ ...f, position: e.target.value as "L" | "R" })}
      >
        <option value="L">L</option>
        <option value="R">R</option>
      </select>
      <button className="bg-blue-600 text-white px-3 py-1 rounded">
        Register
      </button>
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  );
}
```

`frontend/components/OrderForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function OrderForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState(1000);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await api.order(username, Number(amount));
      onDone();
    } catch (x: any) {
      setErr(x.message);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">Place Order</h3>
      <input
        placeholder="username"
        className="border p-1 w-full"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="number"
        className="border p-1 w-full"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className="bg-green-600 text-white px-3 py-1 rounded">
        Order
      </button>
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  );
}
```

`frontend/components/SettlementPanel.tsx`:

```tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function SettlementPanel({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const run = async () => {
    setMsg("enqueued...");
    await api.settle();
    setTimeout(async () => {
      await onDone();
      setMsg("settlement done");
    }, 1500);
  };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Settlement</h3>
      <button
        onClick={run}
        className="bg-purple-600 text-white px-3 py-1 rounded"
      >
        Run settlement now
      </button>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Dashboard page wiring**

`frontend/app/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TreeView } from "@/components/TreeView";
import { RegisterForm } from "@/components/RegisterForm";
import { OrderForm } from "@/components/OrderForm";
import { SettlementPanel } from "@/components/SettlementPanel";

export default function Page() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [rootName, setRootName] = useState("root");
  const refresh = async () => setNodes(await api.tree());
  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="p-6 grid grid-cols-3 gap-6">
      <section className="col-span-2 border rounded bg-gray-50">
        <TreeView nodes={nodes} />
      </section>
      <aside className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold">Create Root</h3>
          <input
            className="border p-1 w-full"
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
          />
          <button
            className="bg-gray-800 text-white px-3 py-1 rounded"
            onClick={async () => {
              await api.createRoot(rootName, "p");
              refresh();
            }}
          >
            Create
          </button>
        </div>
        <RegisterForm onDone={refresh} />
        <OrderForm onDone={refresh} />
        <SettlementPanel onDone={refresh} />
      </aside>
    </main>
  );
}
```

- [ ] **Step 6: Manual verify the full demo**

Run backend + `cd frontend && npm run dev`. In the browser: create root → register a/b → order on a (5000) and b (3500) → run settlement → confirm tree carry values update (root L:1500 R:0).

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat: frontend dashboard — tree view, forms, settlement, ledger"
```

---

## Self-Review Notes

- **Spec coverage:** Action 1 (register+placement) → Task 4; Action 2 (order/propagate) → Task 5; Action 3 (settlement cron+manual, idempotency, carry) → Tasks 7-8; Action 4 (wallet credit, traceable) → Task 6. Redis leg cache → Task 2. Data models all created in their owning tasks. Frontend visualization → Task 10. All covered.
- **Idempotency:** Redis lock (Task 2/7) + unique index `{batchId, nodeId}` (Task 7).
- **Type consistency:** `pairNode` signature and return shape identical in Task 7 test + impl; `WalletService.credit(userId, amount, refId)` consistent between Task 6 and its caller in Task 7; `propagateVolume(nodeId, amount)` consistent between Task 4 and caller in Task 5.
- **Known demo simplifications (call out in interview):** SHA-256 not bcrypt; sequential writes instead of Mongo multi-doc transactions (single-node Mongo); settlement iterates all nodes (fine at demo scale, would paginate/shard at scale).

```

```
