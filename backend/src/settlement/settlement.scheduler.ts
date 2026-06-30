import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SettlementScheduler {
  constructor(@InjectQueue('settlement') private readonly queue: Queue) {}
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async daily() { await this.queue.add('run', { triggeredBy: 'cron' }); }
}
