import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SettlementService } from './settlement.service';

@Processor('settlement')
export class SettlementProcessor extends WorkerHost {
  constructor(private readonly settlement: SettlementService) { super(); }
  async process(job: Job<{ triggeredBy: 'cron' | 'manual' }>) {
    return this.settlement.run(job.data.triggeredBy);
  }
}
