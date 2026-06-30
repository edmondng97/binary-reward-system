import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post()
  place(@Body() b: { username: string; amount: number }) {
    return this.orders.placeOrder(b.username, b.amount);
  }
}
