import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductCategory } from '../enums/product-category.enum';

export type ProductDocument = Product &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ProductCategory })
  category: ProductCategory;

  @Prop({ required: true })
  costPrice: number;

  @Prop({ required: true })
  sellPrice: number;

  @Prop({ required: true, default: 0 })
  quantity: number;

  @Prop({ default: 5 })
  alertQuantity: number;

  @Prop({ unique: true, required: true })
  barcode: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
