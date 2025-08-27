// sales/schemas/sale.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/product/schemas/product.schema';

export type SaleDocument = Sale &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

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
    product: Product | Types.ObjectId;
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

  @Prop()
  customerName?: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
