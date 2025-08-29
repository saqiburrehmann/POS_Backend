import { Product } from '../schemas/product.schema';

export class ProductResponseDto {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  alertstock: number;
  barcode: string;
  ownerId: string;
  ownerName?: string;

  constructor(product: Product & { _id: any; owner?: any }) {
    this.id = product._id.toString();
    this.name = product.name;
    this.category = product.category;
    this.costPrice = product.costPrice;
    this.sellingPrice = product.sellingPrice;
    this.stock = product.stock;
    this.alertstock = product.alertstock;
    this.barcode = product.barcode;
    this.ownerId = product.owner?._id?.toString() || product.owner?.toString();
    if (product.owner?.firstName && product.owner?.lastName) {
      this.ownerName = `${product.owner.firstName} ${product.owner.lastName}`;
    }
  }
}
