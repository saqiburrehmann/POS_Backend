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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { ProductsService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @UseGuards(JwtAuthGuard)
  @Post(':id/restock')
  async restock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
    @Req() req: Request,
  ) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    return this.productsService.restock(id, body.quantity, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('alerts/low-stock')
  async checkLowStock() {
    return this.productsService.checkLowStock();
  }

  @UseGuards(JwtAuthGuard)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importStock(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    return this.productsService.importFromExcel(file, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/excel')
  async exportStock(@Req() req: Request, @Res() res: Response) {
    const userId = req.user?.['id'] || req.user?.['sub'];
    const buffer = await this.productsService.exportToExcel(userId);

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  }
}
