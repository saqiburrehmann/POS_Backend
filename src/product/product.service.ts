import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
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
    const { ownerId, ...rest } = dto;
    console.log('📌 OwnerId in create DTO:', ownerId);
    console.log('📦 Product data in create DTO:', rest);

    if (!ownerId || !Types.ObjectId.isValid(ownerId)) {
      console.error('❌ Invalid ownerId:', ownerId);
      throw new NotFoundException('Valid ownerId is required');
    }

    const user = await this.userModel.findById(ownerId);
    if (!user) throw new NotFoundException('Owner user not found');

    const existingProduct = await this.productModel.findOne({
      name: rest.name,
      category: rest.category,
    });

    if (existingProduct) {
      console.log('🔄 Existing product found, updating quantity');
      if (!existingProduct.owner)
        existingProduct.owner = new Types.ObjectId(ownerId);
      existingProduct.quantity += rest.quantity;
      existingProduct.costPrice = rest.costPrice;
      existingProduct.sellPrice = rest.sellPrice;

      const updated = await existingProduct.save();
      await updated.populate('owner', 'firstName lastName');
      console.log('✅ Updated product:', updated);
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
    console.log('✅ Product saved:', saved);
    return new ProductResponseDto(saved);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productModel
      .find()
      .populate('owner', 'firstName lastName')
      .sort({ createdAt: -1 });
    console.log('📦 All products:', products.length);
    return products.map((p) => new ProductResponseDto(p));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productModel
      .findById(id)
      .populate('owner', 'firstName lastName');
    if (!product) throw new NotFoundException('Product not found');
    console.log('📦 Found product:', product);
    return new ProductResponseDto(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    if (product.owner.toString() !== userId)
      throw new UnauthorizedException('You cannot update this product');

    console.log('🔹 Updating product with DTO:', dto);

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
    console.log('✅ Product updated:', updated);
    return new ProductResponseDto(updated);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    if (product.owner.toString() !== userId)
      throw new UnauthorizedException('You cannot delete this product');

    await product.deleteOne();
    console.log('✅ Product deleted:', id);
    return { message: `Product with ID ${id} deleted successfully` };
  }

  async checkLowStock(): Promise<ProductResponseDto[]> {
    const lowStock = await this.productModel
      .find({ $expr: { $lt: ['$quantity', '$alertQuantity'] } })
      .populate('owner', 'firstName lastName');
    console.log('📦 Low stock products found:', lowStock.length);
    return lowStock.map((p) => new ProductResponseDto(p));
  }
}
