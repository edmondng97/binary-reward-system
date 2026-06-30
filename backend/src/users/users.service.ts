import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { User, UserDoc } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<User>) {}

  private hash(pw: string) { return createHash('sha256').update(pw).digest('hex'); }

  async create(username: string, password: string): Promise<UserDoc> {
    const doc = new this.model({ username, passwordHash: this.hash(password), walletBalance: 0 });
    return doc.save();
  }
  findByUsername(username: string) { return this.model.findOne({ username }).exec(); }
  findById(id: string) { return this.model.findById(id).exec(); }
}
