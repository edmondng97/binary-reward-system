import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TreeNodeDoc = HydratedDocument<TreeNode>;

@Schema({ _id: false })
export class Upline { @Prop() nodeId: string; @Prop() position: 'L' | 'R'; }
const UplineSchema = SchemaFactory.createForClass(Upline);

@Schema({ timestamps: true })
export class TreeNode {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ default: null }) sponsorId: string | null;
  @Prop({ default: null }) placementId: string | null;
  @Prop({ type: String, default: null }) position: 'L' | 'R' | null;
  @Prop({ type: Types.ObjectId, default: null }) leftChildId: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null }) rightChildId: Types.ObjectId | null;
  @Prop({ type: [UplineSchema], default: [] }) uplines: Upline[];
  @Prop({ default: 0 }) carryLeft: number;
  @Prop({ default: 0 }) carryRight: number;
}
export const TreeNodeSchema = SchemaFactory.createForClass(TreeNode);
