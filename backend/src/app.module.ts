import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URL ?? 'mongodb://localhost:27017/binary_demo'),
    RedisModule,
    UsersModule,
  ],
})
export class AppModule {}
