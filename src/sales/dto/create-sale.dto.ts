import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMode {
  CASH = 'cash',
  CREDIT = 'credit',
}

class SaleProductDto {
  @IsMongoId()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleProductDto)
  products: SaleProductDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  payNow?: boolean;
}
