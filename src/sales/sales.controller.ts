import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Get()
  async findAll() {
    return this.salesService.findAll();
  }

  @Get('report')
  async getReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getReport(startDate, endDate);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
