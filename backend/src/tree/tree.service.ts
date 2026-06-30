import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TreeNode, TreeNodeDoc, Upline } from './tree-node.schema';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

interface RegisterInput {
  username: string; password: string;
  sponsorUsername: string; placementUsername: string; position: 'L' | 'R';
}

@Injectable()
export class TreeService {
  constructor(
    @InjectModel(TreeNode.name) private readonly model: Model<TreeNode>,
    private readonly users: UsersService,
    private readonly redis: RedisService,
  ) {}

  findByUsername(username: string) { return this.model.findOne({ username }).exec(); }
  allNodes() { return this.model.find().exec(); }

  async createRoot(username: string, password: string): Promise<TreeNodeDoc> {
    const user = await this.users.create(username, password);
    const node = new this.model({
      userId: String(user._id), username, sponsorId: null,
      placementId: null, position: null, uplines: [], carryLeft: 0, carryRight: 0,
    });
    return node.save();
  }

  async register(input: RegisterInput): Promise<TreeNodeDoc> {
    const placement = await this.model.findOne({ username: input.placementUsername }).exec();
    if (!placement) throw new NotFoundException('placement not found');
    const sponsor = await this.model.findOne({ username: input.sponsorUsername }).exec();
    if (!sponsor) throw new NotFoundException('sponsor not found');

    const legField = input.position === 'L' ? 'leftChildId' : 'rightChildId';
    if (placement[legField]) {
      throw new BadRequestException(`placement ${input.position} leg is occupied`);
    }

    const user = await this.users.create(input.username, input.password);
    // ancestor chain: this node sits at `position` under placement → prepend placement;
    // then inherit placement's own uplines (already parent→root ordered).
    const uplines: Upline[] = [
      { nodeId: String(placement._id), position: input.position },
      ...placement.uplines,
    ];
    const node = new this.model({
      userId: String(user._id), username: input.username,
      sponsorId: String(sponsor._id), placementId: String(placement._id),
      position: input.position, uplines, carryLeft: 0, carryRight: 0,
    });
    const saved = await node.save();

    placement[legField] = saved._id;
    await placement.save();
    return saved;
  }

  // Push `amount` to every upline's leg (the leg this node sits on for that upline).
  async propagateVolume(nodeId: string, amount: number): Promise<void> {
    const node = await this.model.findById(nodeId).exec();
    if (!node) throw new NotFoundException('node not found');
    for (const up of node.uplines) {
      await this.redis.incrLeg(up.nodeId, up.position, amount);
    }
  }
}
