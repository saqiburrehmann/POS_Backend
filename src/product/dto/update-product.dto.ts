import { IsOptional, IsNumber, Min, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from '../enums/product-category.enum';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  alertQuantity?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
