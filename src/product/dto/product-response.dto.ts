import { Product } from '../schemas/product.schema';

export class ProductResponseDto {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  quantity: number;
  alertQuantity: number;
  barcode: string;
  ownerId: string;
  ownerName?: string;

  constructor(product: Product & { _id: any; owner?: any }) {
    this.id = product._id.toString();
    this.name = product.name;
    this.category = product.category;
    this.sellPrice = product.sellPrice;
    this.quantity = product.quantity;
    this.alertQuantity = product.alertQuantity;
    this.barcode = product.barcode;
    this.ownerId = product.owner?._id?.toString() || product.owner?.toString();
    if (product.owner?.firstName && product.owner?.lastName) {
      this.ownerName = `${product.owner.firstName} ${product.owner.lastName}`;
    }
  }
}
