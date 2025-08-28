import { Types } from 'mongoose';
import { ProductDocument } from 'src/product/schemas/product.schema';

export function calculateSale(
  products: ProductDocument[],
  dtoProducts: { productId: string; quantity: number }[],
  discount: number,
) {
  let total = 0;
  let profit = 0;
  const saleProducts: {
    product: Types.ObjectId;
    quantity: number;
    price: number;
  }[] = [];

  for (const item of dtoProducts) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product) continue;

    const lineTotal = product.sellPrice * item.quantity;
    total += lineTotal;
    profit += (product.sellPrice - product.costPrice) * item.quantity;

    saleProducts.push({
      product: product._id,
      quantity: item.quantity,
      price: product.sellPrice,
    });
  }

  if (discount) {
    total = Math.max(0, total - discount);
    profit = Math.max(0, profit - discount);
  }

  return { total, profit, saleProducts };
}

export function getPaymentStatus(total: number, paidAmount: number) {
  if (paidAmount >= total) return 'paid';
  if (paidAmount === 0) return 'pending';
  return 'partial';
}
