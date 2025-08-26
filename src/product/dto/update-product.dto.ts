import { IsOptional, IsNumber, Min, IsEnum, IsString } from 'class-validator';
import { ProductCategory } from '../enums/product-category.enum';

export class UpdateProductDto {
  @IsOptional() name?: string;
  @IsOptional() @IsEnum(ProductCategory) category?: ProductCategory;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsNumber() @Min(0) sellPrice?: number;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) alertQuantity?: number;
  @IsOptional() barcode?: string;
  @IsOptional() @IsString() ownerId?: string;
}
