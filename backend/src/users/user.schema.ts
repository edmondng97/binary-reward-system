import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDoc = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 0 }) walletBalance: number;
}
export const UserSchema = SchemaFactory.createForClass(User);
