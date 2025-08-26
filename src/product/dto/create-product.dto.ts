import { IsNotEmpty, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { ProductCategory } from '../enums/product-category.enum';

export class CreateProductDto {
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  sellPrice: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  alertQuantity: number;

  @IsOptional()
  barcode?: string;

  @IsNotEmpty()
  ownerId: string;
}
