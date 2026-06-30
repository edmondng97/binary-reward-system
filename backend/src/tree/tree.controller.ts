import { Body, Controller, Get, Post } from '@nestjs/common';
import { TreeService } from './tree.service';

@Controller('tree')
export class TreeController {
  constructor(private readonly tree: TreeService) {}

  @Post('root')
  createRoot(@Body() b: { username: string; password: string }) {
    return this.tree.createRoot(b.username, b.password);
  }

  @Post('register')
  register(@Body() b: any) { return this.tree.register(b); }

  @Get()
  async list() {
    const nodes = await this.tree.allNodes();
    return Promise.all(nodes.map(async (n) => ({
      id: String(n._id), userId: n.userId, username: n.username,
      placementId: n.placementId, position: n.position,
      leftChildId: n.leftChildId, rightChildId: n.rightChildId,
      carryLeft: n.carryLeft, carryRight: n.carryRight,
    })));
  }
}
