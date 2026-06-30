import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type WalletTxnDoc = HydratedDocument<WalletTransaction>;

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) type: string;       // 'BONUS_IN'
  @Prop({ required: true }) amount: number;
  @Prop({ default: null }) refId: string | null; // → PairingRecord
  @Prop({ required: true }) balanceAfter: number;
}
export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
