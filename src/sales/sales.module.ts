import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import {
  Customer,
  CustomerSchema,
} from 'src/customers/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
