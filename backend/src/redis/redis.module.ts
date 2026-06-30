import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService, REDIS_CLIENT } from './redis.service';

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, useFactory: () => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379') },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
