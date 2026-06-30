import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletTransaction, WalletTransactionSchema } from './wallet-transaction.schema';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WalletTransaction.name, schema: WalletTransactionSchema }]),
    UsersModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
