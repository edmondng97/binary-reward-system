import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TreeNode } from '../tree/tree-node.schema';
import { TreeService } from '../tree/tree.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { SettlementBatch } from './settlement-batch.schema';
import { PairingRecord } from './pairing-record.schema';
import { PAIRING_RATE, DAILY_CAP } from '../config/settlement.config';
import { round4 } from '../common/round';

export function pairNode(left: number, right: number, rate: number, cap: number) {
  const pairedAmount = round4(Math.min(left, right));
  let bonus = round4(pairedAmount * rate);
  let cappedAmount = 0;
  if (bonus > cap) { cappedAmount = round4(bonus - cap); bonus = round4(cap); }
  return {
    pairedAmount, bonus, cappedAmount,
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
    @InjectModel(SettlementBatch.name) private readonly batchModel: Model<SettlementBatch>,
    @InjectModel(PairingRecord.name) private readonly recordModel: Model<PairingRecord>,
    @InjectModel(TreeNode.name) private readonly nodeModel: Model<TreeNode>,
  ) {}

  async run(triggeredBy: 'cron' | 'manual'): Promise<{ batchId: string; totalBonus: number; skipped?: boolean }> {
    const locked = await this.redis.acquireSettlementLock(LOCK_TTL_MS);
    if (!locked) return { batchId: '', totalBonus: 0, skipped: true };

    const batch = await new this.batchModel({ triggeredBy, status: 'running' }).save();
    let totalBonus = 0;
    try {
      const nodes = await this.tree.allNodes();
      for (const node of nodes) {
        const live = await this.redis.readLegs(String(node._id));
        const left = round4(live.left + node.carryLeft);
        const right = round4(live.right + node.carryRight);
        const r = pairNode(left, right, PAIRING_RATE, DAILY_CAP);

        await new this.recordModel({
          batchId: String(batch._id), nodeId: String(node._id),
          leftVolume: left, rightVolume: right, pairedAmount: r.pairedAmount,
          bonus: r.bonus, cappedAmount: r.cappedAmount,
          carryLeftAfter: r.carryLeftAfter, carryRightAfter: r.carryRightAfter,
        }).save();

        if (r.bonus > 0) {
          await this.wallet.credit(node.userId, r.bonus, String(batch._id) + ':' + String(node._id));
          totalBonus = round4(totalBonus + r.bonus);
        }

        node.carryLeft = r.carryLeftAfter;
        node.carryRight = r.carryRightAfter;
        // DEMO SIMPLIFICATION (single-node manual settlement):
        // Crash window (a): if the process dies after node.save() but before
        // clearLegs(), the next batch will re-add the same live Redis legs to
        // the already-persisted carry, causing double-counting.
        await node.save();
        // Crash window (b): an order arriving between the readLegs() call above
        // and clearLegs() here is NOT protected by the settlement lock; its
        // volume will be silently dropped when the legs are cleared.
        await this.redis.clearLegs(String(node._id));
      }
      batch.status = 'completed';
      batch.totalBonus = totalBonus;
      batch.endedAt = new Date();
      await batch.save();
      return { batchId: String(batch._id), totalBonus };
    } catch (e) {
      batch.status = 'failed';
      await batch.save();
      throw e;
    } finally {
      await this.redis.releaseSettlementLock();
    }
  }
}
