import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { SettlementBatch, SettlementBatchSchema } from './settlement-batch.schema';
import { PairingRecord, PairingRecordSchema } from './pairing-record.schema';
import { SettlementService } from './settlement.service';
import { SettlementProcessor } from './settlement.processor';
import { SettlementScheduler } from './settlement.scheduler';
import { SettlementController } from './settlement.controller';
import { TreeModule } from '../tree/tree.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SettlementBatch.name, schema: SettlementBatchSchema },
      { name: PairingRecord.name, schema: PairingRecordSchema },
    ]),
    BullModule.registerQueue({ name: 'settlement' }),
    TreeModule, WalletModule,
  ],
  providers: [SettlementService, SettlementProcessor, SettlementScheduler],
  controllers: [SettlementController],
})
export class SettlementModule {}
