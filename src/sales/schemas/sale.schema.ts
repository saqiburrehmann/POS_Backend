// schemas/sale.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Customer } from 'src/customers/schemas/customer.schema';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true })
export class Sale {
  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    required: true,
  })
  products: {
    product: Types.ObjectId;
    quantity: number;
    price: number;
  }[];

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  profit: number;

  @Prop({ required: true, enum: ['cash', 'credit'] })
  paymentMode: 'cash' | 'credit';

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ default: 'pending', enum: ['paid', 'pending', 'partial'] })
  status: 'paid' | 'pending' | 'partial';

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer?: Types.ObjectId;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
