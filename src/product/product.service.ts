import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    try {
      const existingProduct = await this.productModel.findOne({
        name: dto.name,
        category: dto.category,
      });

      if (existingProduct) {
        existingProduct.quantity += dto.quantity;

        existingProduct.costPrice = dto.costPrice;
        existingProduct.sellPrice = dto.sellPrice;

        const updated = await existingProduct.save();
        return new ProductResponseDto(updated);
      }

      // Generate barcode if not provided
      if (!dto.barcode) dto.barcode = nanoid(10);

      // Ensure barcode uniqueness
      const barcodeExists = await this.productModel.findOne({
        barcode: dto.barcode,
      });
      if (barcodeExists) throw new ConflictException('Barcode already exists');

      // Create new product
      const product = new this.productModel(dto);
      const saved = await product.save();
      return new ProductResponseDto(saved);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async findAll(): Promise<ProductResponseDto[]> {
    try {
      const products = await this.productModel.find().sort({ createdAt: -1 });
      return products.map((p) => new ProductResponseDto(p));
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return new ProductResponseDto(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    try {
      if (dto.barcode) {
        const existing = await this.productModel.findOne({
          barcode: dto.barcode,
          _id: { $ne: id },
        });
        if (existing) throw new ConflictException('Barcode already exists');
      }

      const updated = await this.productModel.findByIdAndUpdate(id, dto, {
        new: true,
      });
      if (!updated) throw new NotFoundException('Product not found');

      return new ProductResponseDto(updated);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.productModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Product not found');
    return { message: `Product with ID ${id} deleted successfully` };
  }

  async checkLowStock(): Promise<ProductResponseDto[]> {
    const lowStock = await this.productModel.find({
      $expr: { $lt: ['$quantity', '$alertQuantity'] },
    });
    return lowStock.map((p) => new ProductResponseDto(p));
  }
}
