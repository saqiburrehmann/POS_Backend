import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { nanoid } from 'nanoid';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import * as XLSX from 'xlsx';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    try {
      const { ownerId, ...rest } = dto;

      if (!ownerId || !Types.ObjectId.isValid(ownerId)) {
        throw new NotFoundException('Valid ownerId is required');
      }

      const user = await this.userModel.findById(ownerId);
      if (!user) throw new NotFoundException('Owner user not found');

      const existingProduct = await this.productModel.findOne({
        name: rest.name,
        category: rest.category,
      });

      if (existingProduct) {
        if (!existingProduct.owner)
          existingProduct.owner = new Types.ObjectId(ownerId);
        existingProduct.quantity += rest.quantity;
        existingProduct.costPrice = rest.costPrice;
        existingProduct.sellPrice = rest.sellPrice;

        const updated = await existingProduct.save();
        await updated.populate('owner', 'firstName lastName');
        return new ProductResponseDto(updated);
      }

      if (!rest.barcode) rest.barcode = nanoid(10);

      const barcodeExists = await this.productModel.findOne({
        barcode: rest.barcode,
      });
      if (barcodeExists) throw new ConflictException('Barcode already exists');

      const product = new this.productModel({
        ...rest,
        owner: new Types.ObjectId(ownerId),
      });

      const saved = await product.save();
      await saved.populate('owner', 'firstName lastName');
      return new ProductResponseDto(saved);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors)
          .map((e: any) => e.message)
          .join(', ');
        throw new BadRequestException(messages || 'Validation failed');
      }
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async findAll(): Promise<ProductResponseDto[]> {
    try {
      const products = await this.productModel
        .find()
        .populate('owner', 'firstName lastName')
        .sort({ createdAt: -1 });
      return products.map((p) => new ProductResponseDto(p));
    } catch {
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.productModel
        .findById(id)
        .populate('owner', 'firstName lastName');
      if (!product) throw new NotFoundException('Product not found');
      return new ProductResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch product');
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Product not found');
      if (product.owner.toString() !== userId)
        throw new UnauthorizedException('You cannot update this product');

      if (dto.barcode) {
        const existing = await this.productModel.findOne({
          barcode: dto.barcode,
          _id: { $ne: id },
        });
        if (existing) throw new ConflictException('Barcode already exists');
      }

      if (dto.ownerId) {
        const user = await this.userModel.findById(dto.ownerId);
        if (!user) throw new NotFoundException('Owner user not found');
        product.owner = new Types.ObjectId(dto.ownerId);
      }

      Object.assign(product, dto);
      const updated = await product.save();
      await updated.populate('owner', 'firstName lastName');
      return new ProductResponseDto(updated);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      )
        throw error;
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors)
          .map((e: any) => e.message)
          .join(', ');
        throw new BadRequestException(messages || 'Validation failed');
      }
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    try {
      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Product not found');
      if (product.owner.toString() !== userId)
        throw new UnauthorizedException('You cannot delete this product');

      await product.deleteOne();
      return { message: `Product with ID ${id} deleted successfully` };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      )
        throw error;
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  async restock(id: string, quantity: number, userId: string) {
    try {
      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Product not found');
      if (product.owner.toString() !== userId) {
        throw new UnauthorizedException('You cannot restock this product');
      }

      product.quantity += quantity;
      const updated = await product.save();
      await updated.populate('owner', 'firstName lastName');

      return new ProductResponseDto(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async checkLowStock(): Promise<ProductResponseDto[]> {
    try {
      const lowStock = await this.productModel
        .find({ $expr: { $lt: ['$quantity', '$alertQuantity'] } })
        .populate('owner', 'firstName lastName');
      return lowStock.map((p) => new ProductResponseDto(p));
    } catch {
      throw new InternalServerErrorException('Failed to check low stock');
    }
  }

  async importFromExcel(file: Express.Multer.File, userId: string) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const results: { action: 'restocked' | 'created'; barcode: string }[] =
        [];

      for (const row of rows as any[]) {
        const { name, category, costPrice, sellPrice, quantity, barcode } = row;

        if (!name || !category || !costPrice || !sellPrice || !quantity) {
          continue;
        }

        const existing = await this.productModel.findOne({ barcode });

        if (existing) {
          existing.quantity += Number(quantity);
          await existing.save();
          results.push({ action: 'restocked', barcode });
        } else {
          try {
            const product = new this.productModel({
              name,
              category,
              costPrice: Number(costPrice),
              sellPrice: Number(sellPrice),
              quantity: Number(quantity),
              barcode: barcode || nanoid(10),
              owner: new Types.ObjectId(userId),
            });

            await product.save();
            results.push({ action: 'created', barcode: product.barcode });
          } catch (err) {
            if (err.code === 11000) {
              const existingDup = await this.productModel.findOne({ barcode });
              if (existingDup) {
                existingDup.quantity += Number(quantity);
                await existingDup.save();
                results.push({ action: 'restocked', barcode });
              }
            } else {
              throw err;
            }
          }
        }
      }

      return { message: 'Import completed', results };
    } catch {
      throw new InternalServerErrorException('Failed to import stock');
    }
  }

  async exportToExcel(userId: string) {
    try {
      const products = await this.productModel
        .find({ owner: new Types.ObjectId(userId) })
        .populate('owner', 'firstName lastName')
        .lean();

      if (!products || products.length === 0) {
        throw new NotFoundException('No products found for export');
      }

      const rows = products.map((p) => {
        const owner: any = p.owner;
        return {
          name: p.name,
          category: p.category,
          costPrice: p.costPrice,
          sellPrice: p.sellPrice,
          quantity: p.quantity,
          barcode: p.barcode,
          ownerName: owner?.firstName
            ? `${owner.firstName} ${owner.lastName}`
            : '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch {
      throw new InternalServerErrorException('Failed to export stock');
    }
  }
}
