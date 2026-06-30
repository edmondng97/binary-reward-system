import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TreeNode, TreeNodeSchema } from './tree-node.schema';
import { TreeService } from './tree.service';
import { TreeController } from './tree.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: TreeNode.name, schema: TreeNodeSchema }]), UsersModule],
  providers: [TreeService],
  controllers: [TreeController],
  exports: [TreeService, MongooseModule],
})
export class TreeModule {}
