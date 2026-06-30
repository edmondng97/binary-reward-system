import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/user.schema';
import { WalletTransaction, WalletTxnDoc } from './wallet-transaction.schema';
import { round4 } from '../common/round';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(WalletTransaction.name) private readonly txnModel: Model<WalletTransaction>,
  ) {}

  // Balance update + ledger write. In a replica-set Mongo this would wrap a session txn;
  // for the demo the two writes are sequential and idempotency is guaranteed upstream
  // (one PairingRecord per node per batch).
  async credit(userId: string, amount: number, refId: string): Promise<{ balanceAfter: number | null }> {
    if (!(amount > 0)) return { balanceAfter: null };
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('user not found');
    user.walletBalance = round4(user.walletBalance + amount);
    await user.save();
    const txn = new this.txnModel({
      userId, type: 'BONUS_IN', amount: round4(amount), refId, balanceAfter: user.walletBalance,
    });
    await txn.save();
    return { balanceAfter: user.walletBalance };
  }

  ledger(userId: string): Promise<WalletTxnDoc[]> {
    return this.txnModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
