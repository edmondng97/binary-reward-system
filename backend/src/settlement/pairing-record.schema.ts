import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
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
