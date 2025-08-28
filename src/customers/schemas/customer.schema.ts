import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ default: 0 })
  pendingAmount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Sale' }], default: [] })
  sales: Types.ObjectId[];
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
