import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDoc } from './order.schema';
import { TreeService } from '../tree/tree.service';
import { round4 } from '../common/round';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<Order>,
    private readonly tree: TreeService,
  ) {}

  async placeOrder(username: string, amount: number): Promise<OrderDoc> {
    if (!(amount > 0)) throw new BadRequestException('amount must be positive');
    const node = await this.tree.findByUsername(username);
    if (!node) throw new NotFoundException('user node not found');
    const order = new this.model({ userId: node.userId, nodeId: String(node._id), amount: round4(amount) });
    const saved = await order.save();
    await this.tree.propagateVolume(String(node._id), round4(amount));
    return saved;
  }
}
