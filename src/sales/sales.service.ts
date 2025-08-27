import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { Product, ProductDocument } from 'src/product/schemas/product.schema';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateSaleDto): Promise<Sale> {
    try {
      const productIds = dto.products.map((p) => p.productId);

      const products = await this.productModel.find({
        _id: { $in: productIds },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('Some products not found');
      }

      let total = 0;
      let profit = 0;
      const saleProducts: {
        product: Types.ObjectId;
        quantity: number;
        price: number;
      }[] = [];

      for (const item of dto.products) {
        const product = products.find(
          (p) => p._id.toString() === item.productId,
        );
        if (!product) continue;

        if (product.quantity < item.quantity) {
          throw new BadRequestException(`Not enough stock for ${product.name}`);
        }

        // Deduct stock without session (for local development)
        product.quantity -= item.quantity;
        await product.save();

        const lineTotal = product.sellPrice * item.quantity;
        total += lineTotal;
        profit += (product.sellPrice - product.costPrice) * item.quantity;

        saleProducts.push({
          product: new Types.ObjectId(item.productId),
          quantity: item.quantity,
          price: product.sellPrice,
        });
      }

      if (dto.discount) {
        total = Math.max(0, total - dto.discount);
        profit = Math.max(0, profit - dto.discount);
      }

      const sale = new this.saleModel({
        products: saleProducts,
        discount: dto.discount || 0,
        total,
        profit,
        paymentMode: dto.paymentMode,
        customerName: dto.customerName,
      });

      return await sale.save();

      // TODO: Later, wrap this in a session transaction for replica set / Atlas
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Failed to create sale');
    }
  }

  async findAll() {
    try {
      return await this.saleModel.find().populate('products.product');
    } catch {
      throw new InternalServerErrorException('Failed to fetch sales');
    }
  }

  async findOne(id: string) {
    try {
      const sale = await this.saleModel
        .findById(id)
        .populate('products.product');
      if (!sale) throw new NotFoundException('Sale not found');
      return sale;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch sale');
    }
  }

  async getReport(startDate?: string, endDate?: string) {
    try {
      // console.log('Generating sales report for:', startDate, 'to', endDate);

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          throw new BadRequestException(
            'Invalid startDate format. Use YYYY-MM-DD',
          );
        }
      }

      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (isNaN(end.getTime())) {
          throw new BadRequestException(
            'Invalid endDate format. Use YYYY-MM-DD',
          );
        }
      }

      const filter: any = {};
      if (start && end) filter.createdAt = { $gte: start, $lte: end };
      else if (start) filter.createdAt = { $gte: start };
      else if (end) filter.createdAt = { $lte: end };

      const sales = await this.saleModel
        .find(filter)
        .populate('products.product');

      if (!sales.length) {
        // console.warn('No sales found for the given date range');
        return { totalRevenue: 0, totalProfit: 0, salesCount: 0 };
      }

      const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
      const totalProfit = sales.reduce((acc, sale) => acc + sale.profit, 0);
      const salesCount = sales.length;

      const report = { totalRevenue, totalProfit, salesCount };
      // console.log('Report:', report);

      return report;
    } catch (error) {
      // console.error('Error generating report:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}
