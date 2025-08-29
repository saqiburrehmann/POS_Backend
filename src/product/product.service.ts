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

  async create(
    dto: CreateProductDto,
    ownerId: string,
  ): Promise<ProductResponseDto> {
    try {
      if (!Types.ObjectId.isValid(ownerId)) {
        throw new BadRequestException('Invalid ownerId');
      }

      const owner = await this.userModel.findById(ownerId);
      if (!owner) throw new NotFoundException('Owner not found');

      // Prevent duplicate product name + category for same owner
      const existingProduct = await this.productModel.findOne({
        name: dto.name,
        category: dto.category,
        owner: owner._id,
      });

      if (existingProduct) {
        existingProduct.stock += dto.stock;
        existingProduct.costPrice = dto.costPrice;
        existingProduct.sellingPrice = dto.sellingPrice;
        const updated = await existingProduct.save();
        await updated.populate('owner', 'firstName lastName');
        return new ProductResponseDto(updated);
      }

      // Ensure barcode uniqueness
      const barcode = dto.barcode || nanoid(10);
      const barcodeExists = await this.productModel.findOne({ barcode });
      if (barcodeExists) throw new ConflictException('Barcode already exists');

      const product = new this.productModel({
        ...dto,
        barcode,
        owner: owner._id,
      });
      const saved = await product.save();
      await saved.populate('owner', 'firstName lastName');
      return new ProductResponseDto(saved);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;

      throw new InternalServerErrorException('Failed to create product');
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

      // check ownership
      if (product.owner.toString() !== userId.toString()) {
        throw new UnauthorizedException('You cannot update this product');
      }

      // barcode uniqueness check
      if (dto.barcode) {
        const exists = await this.productModel.findOne({
          barcode: dto.barcode,
          _id: { $ne: id },
        });
        if (exists) throw new ConflictException('Barcode already exists');
      }

      // handle owner change if provided
      if (dto.ownerId) {
        const user = await this.userModel.findById(dto.ownerId);
        if (!user) throw new NotFoundException('New owner not found');
        product.owner = new Types.ObjectId(dto.ownerId);
      }

      // only assign defined fields (avoid overwriting with undefined)
      Object.entries(dto).forEach(([key, value]) => {
        if (value !== undefined && key !== 'ownerId') {
          (product as any)[key] = value;
        }
      });

      const updated = await product.save();
      await updated.populate('owner', 'firstName lastName');
      return new ProductResponseDto(updated);
    } catch (error) {
      console.error('Update error:', error); // 👈 Keep this in prod logs
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async findAll(): Promise<ProductResponseDto[]> {
    try {
      const products = await this.productModel
        .find()
        .populate('owner', 'firstName lastName');
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

  async restock(id: string, stock: number, userId: string) {
    try {
      if (stock <= 0) throw new BadRequestException('stock must be > 0');

      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Product not found');
      if (product.owner.toString() !== userId)
        throw new UnauthorizedException('You cannot restock this product');

      product.stock += stock;
      const updated = await product.save();
      await updated.populate('owner', 'firstName lastName');
      return new ProductResponseDto(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      )
        throw error;

      throw new InternalServerErrorException('Failed to restock product');
    }
  }

  async checkLowStock(): Promise<ProductResponseDto[]> {
    try {
      const lowStock = await this.productModel
        .find({ $expr: { $lt: ['$stock', '$alertstock'] } })
        .populate('owner', 'firstName lastName');
      return lowStock.map((p) => new ProductResponseDto(p));
    } catch {
      throw new InternalServerErrorException('Failed to check low stock');
    }
  }

  async importFromExcel(file: Express.Multer.File, userId: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const results: { action: 'restocked' | 'created'; barcode: string }[] =
        [];

      for (const row of rows as any[]) {
        const { name, category, costPrice, sellingPrice, stock, barcode } = row;
        if (!name || !category || !costPrice || !sellingPrice || !stock)
          continue;

        let product = await this.productModel.findOne({
          barcode,
          owner: userId,
        });

        if (product) {
          product.stock += Number(stock);
          product.costPrice = Number(costPrice);
          product.sellingPrice = Number(sellingPrice);
          await product.save();
          results.push({ action: 'restocked', barcode: product.barcode });
        } else {
          const newProduct = new this.productModel({
            name,
            category,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            stock: Number(stock),
            barcode: barcode || nanoid(10),
            owner: new Types.ObjectId(userId),
          });
          await newProduct.save();
          results.push({ action: 'created', barcode: newProduct.barcode });
        }
      }

      return { message: 'Import completed', results };
    } catch {
      throw new InternalServerErrorException('Failed to import stock');
    }
  }

  async exportToExcel(userId: string) {
    try {
      const products = await this.productModel.find({ owner: userId }).lean();
      if (!products.length) throw new NotFoundException('No products found');

      const rows = products.map((p) => ({
        name: p.name,
        category: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        barcode: p.barcode,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to export stock');
    }
  }
}
