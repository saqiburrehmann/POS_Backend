import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get('payment-status')
  async paymentStatus(@Query('filter') filter?: 'paid' | 'pending') {
    return this.customersService.getPaymentStatus(filter);
  }

  @Get()
  async findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
