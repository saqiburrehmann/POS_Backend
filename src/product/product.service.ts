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
}
