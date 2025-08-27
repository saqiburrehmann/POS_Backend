import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductsService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import type { Request } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() body: Omit<CreateProductDto, 'ownerId'>,
    @Req() req: Request,
  ) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    if (!userId) {
      throw new UnauthorizedException('Authenticated userId not found');
    }
    return this.productsService.create({ ...body, ownerId: userId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    return this.productsService.update(id, body, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    return this.productsService.remove(id, userId);
  }

  @Get('alerts/low-stock')
  async checkLowStock() {
    return this.productsService.checkLowStock();
  }
}
