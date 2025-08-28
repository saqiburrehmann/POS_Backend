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
import {
  Customer,
  CustomerDocument,
} from 'src/customers/schemas/customer.schema';
import { CreateSaleDto } from './dto/create-sale.dto';
import { calculateSale, getPaymentStatus } from './utils/sales.utils';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
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

      // check stock & update
      for (const item of dto.products) {
        const product = products.find(
          (p) => p._id.toString() === item.productId,
        );
        if (!product) continue;
        if (product.quantity < item.quantity) {
          throw new BadRequestException(`Not enough stock for ${product.name}`);
        }
        product.quantity -= item.quantity;
        await product.save();
      }

      const { total, profit, saleProducts } = calculateSale(
        products,
        dto.products,
        dto.discount ?? 0,
      );

      const paidAmount = dto.payNow ? total : (dto.paidAmount ?? 0);
      const status = getPaymentStatus(total, paidAmount);

      const sale = await this.saleModel.create({
        products: saleProducts,
        discount: dto.discount || 0,
        total,
        profit,
        paymentMode: dto.paymentMode,
        paidAmount,
        status,
        customer: dto.customerId ? new Types.ObjectId(dto.customerId) : null,
      });

      // update customer account if exists
      if (dto.customerId) {
        const customer = await this.customerModel.findById(dto.customerId);
        if (!customer) throw new NotFoundException('Customer not found');

        if (status !== 'paid') {
          customer.pendingAmount += total - paidAmount;
        }

        customer.sales.push(sale._id as Types.ObjectId);
        await customer.save();
      }

      return sale;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create sale');
    }
  }

  async findAll(): Promise<Sale[]> {
    try {
      return this.saleModel
        .find()
        .populate('products.product')
        .populate('customer');
    } catch {
      throw new InternalServerErrorException('Failed to fetch sales');
    }
  }

  async findOne(id: string): Promise<Sale> {
    try {
      const sale = await this.saleModel
        .findById(id)
        .populate('products.product')
        .populate('customer');
      if (!sale) throw new NotFoundException('Sale not found');
      return sale;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch sale');
    }
  }

  async getReport(startDate?: string, endDate?: string) {
    try {
      const filter: any = {};
      if (startDate || endDate) filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);

      const sales = await this.saleModel
        .find(filter)
        .populate('products.product')
        .populate('customer');

      const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
      const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);

      return { totalRevenue, totalProfit, salesCount: sales.length };
    } catch {
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}
