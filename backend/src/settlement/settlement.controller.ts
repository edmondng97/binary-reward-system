import { Controller, Get, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SettlementService } from './settlement.service';

@Controller('settlement')
export class SettlementController {
  constructor(
    @InjectQueue('settlement') private readonly queue: Queue,
    private readonly settlement: SettlementService,
  ) {}

  @Post('run')
  async run() { await this.queue.add('run', { triggeredBy: 'manual' }); return { enqueued: true }; }

  @Get('latest')
  latest() { return this.settlement.latest(); }
}
