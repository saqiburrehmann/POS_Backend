import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Sale, SaleDocument } from 'src/sales/schemas/sale.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
  ) {}

  async create(dto: CreateCustomerDto) {
    try {
      const { name, phone, email } = dto;

      const existingCustomer = await this.customerModel.findOne({
        $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      });

      if (existingCustomer)
        throw new ConflictException('Customer already exists');

      const customer = new this.customerModel({
        name,
        phone,
        email,
        pendingAmount: 0,
        sales: [],
      });

      return await customer.save();
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Failed to create customer');
    }
  }

  async findAll() {
    try {
      const customers = await this.customerModel.find();

      return await Promise.all(
        customers.map(async (customer) => {
          const stats = await this.calculateStats(
            customer._id as Types.ObjectId,
          );
          return { ...customer.toObject(), ...stats };
        }),
      );
    } catch {
      throw new InternalServerErrorException('Failed to fetch customers');
    }
  }

  async findOne(id: string) {
    try {
      const customer = await this.customerModel.findById(id);
      if (!customer) throw new NotFoundException('Customer not found');

      const stats = await this.calculateStats(customer._id as Types.ObjectId);
      return { ...customer.toObject(), ...stats };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch customer');
    }
  }

  async getPaymentStatus(filter?: 'paid' | 'pending') {
    try {
      const customers = await this.customerModel.find().populate({
        path: 'sales',
        select: 'total paidAmount status',
        model: 'Sale',
      });

      let results = customers.map((customer) => {
        const sales = Array.isArray(customer.sales) ? customer.sales : [];

        const paidSales = sales.filter((s: any) => s.status === 'paid').length;
        const pendingSales = sales.filter(
          (s: any) => s.status !== 'paid',
        ).length;

        return {
          customerId: customer._id,
          name: customer.name,
          totalSales: sales.length,
          paidSales,
          pendingSales,
          pendingAmount: customer.pendingAmount,
        };
      });

      if (filter === 'paid')
        results = results.filter((c) => c.pendingAmount === 0);
      else if (filter === 'pending')
        results = results.filter((c) => c.pendingAmount > 0);

      return results;
    } catch {
      throw new InternalServerErrorException('Failed to fetch payment status');
    }
  }

  private async calculateStats(customerId: Types.ObjectId) {
    try {
      const sales = await this.saleModel
        .find({ customer: customerId }, 'total createdAt')
        .sort({ createdAt: 1 })
        .lean();

      const lastPurchaseDate =
        sales.length > 0 ? (sales[sales.length - 1] as any).createdAt : null;
      const totalSpent = sales.reduce((acc, sale: any) => acc + sale.total, 0);

      return { lastPurchaseDate, totalSpent };
    } catch {
      throw new InternalServerErrorException('Failed to calculate stats');
    }
  }
}
