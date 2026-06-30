import { Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('settlement')
export class SettlementController {
  constructor(@InjectQueue('settlement') private readonly queue: Queue) {}
  @Post('run')
  async run() { await this.queue.add('run', { triggeredBy: 'manual' }); return { enqueued: true }; }
}
