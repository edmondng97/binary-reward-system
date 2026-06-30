import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { round4 } from '../common/round';

export const REDIS_CLIENT = 'REDIS_CLIENT';
const LOCK_KEY = 'settlement:lock';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private legKey(nodeId: string, leg: 'L' | 'R') {
    return `node:${nodeId}:${leg === 'L' ? 'leftVolume' : 'rightVolume'}`;
  }

  async incrLeg(nodeId: string, leg: 'L' | 'R', amount: number): Promise<void> {
    await this.redis.incrbyfloat(this.legKey(nodeId, leg), amount);
  }

  async readLegs(nodeId: string): Promise<{ left: number; right: number }> {
    const left = parseFloat((await this.redis.get(this.legKey(nodeId, 'L'))) ?? '0');
    const right = parseFloat((await this.redis.get(this.legKey(nodeId, 'R'))) ?? '0');
    return { left: round4(left), right: round4(right) };
  }

  async clearLegs(nodeId: string): Promise<void> {
    await this.redis.del(this.legKey(nodeId, 'L'));
    await this.redis.del(this.legKey(nodeId, 'R'));
  }

  async acquireSettlementLock(ttlMs: number): Promise<boolean> {
    const res = await this.redis.set(LOCK_KEY, '1', 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async releaseSettlementLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }
}
