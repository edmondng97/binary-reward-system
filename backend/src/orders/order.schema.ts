import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type OrderDoc = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) nodeId: string;
  @Prop({ required: true }) amount: number;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
