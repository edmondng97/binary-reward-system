import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type SettlementBatchDoc = HydratedDocument<SettlementBatch>;

@Schema({ timestamps: true })
export class SettlementBatch {
  @Prop({ required: true }) triggeredBy: string;  // 'cron' | 'manual'
  @Prop({ required: true, default: 'running' }) status: string;
  @Prop({ default: 0 }) totalBonus: number;
  @Prop({ default: null }) endedAt: Date | null;
}
export const SettlementBatchSchema = SchemaFactory.createForClass(SettlementBatch);
