import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get(':id')
  async get(@Param('id') id: string) {
    const u = await this.users.findById(id);
    return u && { id: u._id, username: u.username, walletBalance: u.walletBalance };
  }
}
