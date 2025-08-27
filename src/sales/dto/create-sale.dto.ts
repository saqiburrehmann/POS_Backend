import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SaleProductDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleProductDto)
  products: SaleProductDto[];

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsEnum(['cash', 'credit'])
  paymentMode: 'cash' | 'credit';

  @IsOptional()
  @IsString()
  customerName?: string;
}
