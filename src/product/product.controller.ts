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
    console.log('🚀 Incoming request to create product, JWT user:', req.user);

    const userId = req.user?.['id'] || req.user?.['sub'];
    console.log('🔹 Extracted userId from token:', userId);

    if (!userId) {
      console.error('❌ No userId found in request!');
      throw new UnauthorizedException('Authenticated userId not found');
    }

    console.log('📦 Product body:', body);
    return this.productsService.create({ ...body, ownerId: userId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @Req() req: Request,
  ) {
    console.log(
      '🚀 Incoming request to update product:',
      id,
      'JWT user:',
      req.user,
    );

    const userId = req.user?.['id'] || req.user?.['sub'];
    console.log('🔹 Extracted userId from token for update:', userId);

    return this.productsService.update(id, body, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    console.log('🚀 Fetching all products');
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log('🚀 Fetching product by ID:', id);
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    console.log(
      '🚀 Incoming request to delete product:',
      id,
      'JWT user:',
      req.user,
    );

    const userId = req.user?.['id'] || req.user?.['sub'];
    console.log('🔹 Extracted userId from token for delete:', userId);

    return this.productsService.remove(id, userId);
  }

  @Get('alerts/low-stock')
  async checkLowStock() {
    console.log('🚀 Checking low stock products');
    return this.productsService.checkLowStock();
  }
}
