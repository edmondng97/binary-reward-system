import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { TreeModule } from './tree/tree.module';
import { OrdersModule } from './orders/orders.module';
import { WalletModule } from './wallet/wallet.module';
import { SettlementModule } from './settlement/settlement.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URL ?? 'mongodb://localhost:27017/binary_demo'),
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' } }),
    RedisModule,
    UsersModule,
    TreeModule,
    OrdersModule,
    WalletModule,
    SettlementModule,
  ],
})
export class AppModule {}
