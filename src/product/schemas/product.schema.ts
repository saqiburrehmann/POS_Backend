import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductCategory } from '../enums/product-category.enum';
import { User } from 'src/users/schemas/user.schema';

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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: User | Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
