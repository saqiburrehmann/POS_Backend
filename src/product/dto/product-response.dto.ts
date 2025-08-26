import { Expose } from 'class-transformer';
import { ProductDocument } from '../schemas/product.schema';

export class ProductResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  category: string;

  @Expose()
  costPrice: number;

  @Expose()
  sellPrice: number;

  @Expose()
  quantity: number;

  @Expose()
  alertQuantity: number;

  @Expose()
  barcode: string;

  constructor(product: ProductDocument) {
    this.id = product._id.toString();
    this.name = product.name;
    this.category = product.category;
    this.costPrice = product.costPrice;
    this.sellPrice = product.sellPrice;
    this.quantity = product.quantity;
    this.alertQuantity = product.alertQuantity;
    this.barcode = product.barcode;
  }
}
