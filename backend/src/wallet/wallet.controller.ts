import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}
  @Get(':userId/ledger')
  ledger(@Param('userId') userId: string) { return this.wallet.ledger(userId); }
}
