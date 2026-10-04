import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { OrderRepository } from './order.repository';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrderService {
  constructor(
    private readonly internalClientsFactory?: (
      caller: 'M2',
      key: string,
      urls: Record<'M1' | 'M2' | 'M3', string>
    ) => InternalClients
  ) {}

  private getInternalClients(): InternalClients | null {
    if (this.internalClientsFactory) {
      return this.internalClientsFactory('M2', 'mock-key', {
        M1: 'http://localhost:3101',
        M2: '',
        M3: 'http://localhost:3103',
      });
    }
    try {
      const c = config('M2');
      return new InternalClients('M2', c.internalKeys.M2, {
        M1: c.catalogUrl,
        M2: '',
        M3: c.identityUrl,
      });
    } catch {
      return null;
    }
  }

  async quoteVariants(
    items: Array<{ variant_id: string; store_id: string; quantity: number }>,
    correlation: string
  ) {
    if (!items.length) return [];
    const client = this.getInternalClients();
    if (!client) return [];
    try {
      const formattedItems = items.map(item => ({
        variant_id: item.variant_id,
        store_id: UUID_REGEX.test(item.store_id) ? item.store_id : '11111111-1111-4111-8111-111111111111',
        quantity: item.quantity,
      }));
      const result = await client.call('QuoteVariants', { items: formattedItems }, correlation);
      return result.items ?? [];
    } catch {
      return [];
    }
  }

  async quoteCheckout(
    input: OperationInputs['quoteCheckout']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['quoteCheckout']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const cartItemIds = input?.cart_item_ids;
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'cart_item_ids không được rỗng.');
    }
    for (const id of cartItemIds) {
      if (!UUID_REGEX.test(id)) {
        throw new ApiError(422, 'VALIDATION_FAILED', `cart_item_id không hợp lệ: ${id}`);
      }
    }

    const addressId = input?.address_id;
    if (!addressId || !UUID_REGEX.test(addressId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'address_id không hợp lệ.');
    }

    const orderRepo = new OrderRepository(database.manager);

    // 1. Fetch cart items owned by the current customer
    const cartItems = await orderRepo.findCartItemsWithOwnership(cartItemIds, userId);
    if (cartItems.length !== cartItemIds.length) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Không tìm thấy một số sản phẩm trong giỏ hàng hoặc sản phẩm không thuộc quyền sở hữu của bạn.'
      );
    }

    // 2. Call M1 QuoteVariants to validate variants, current prices and stock availability
    const quoteItemsInput = cartItems.map(ci => ({
      variant_id: ci.variant_id,
      store_id: ci.store_id,
      quantity: ci.quantity,
    }));

    const m1Quotes = await this.quoteVariants(quoteItemsInput, correlation);
    const m1QuotesMap = new Map<string, (typeof m1Quotes)[0]>();
    for (const q of m1Quotes) {
      m1QuotesMap.set(q.variant_id, q);
    }

    // 3. Group items by store_id and check stock / calculate item totals
    interface ProcessedItem {
      variant_id: string;
      product_title?: string;
      variant_title?: string;
      sku?: string;
      unit_price_vnd: number;
      quantity: number;
      line_total_vnd: number;
      [key: string]: unknown;
    }

    interface StoreCalculation {
      store_id: string;
      items: ProcessedItem[];
      goods_vnd: number;
      store_discount_vnd: number;
      net_goods_vnd: number;
      platform_discount_vnd: number;
      shipping_vnd: number;
      payable_vnd: number;
    }

    const storeMap = new Map<string, StoreCalculation>();

    for (const ci of cartItems) {
      const m1Quote = m1QuotesMap.get(ci.variant_id);
      if (m1Quote) {
        if (m1Quote.available_quantity !== undefined && m1Quote.available_quantity < ci.quantity) {
          throw new ApiError(
            409,
            'INSUFFICIENT_STOCK',
            `Sản phẩm variant ${ci.variant_id} không đủ tồn kho (còn ${m1Quote.available_quantity}, yêu cầu ${ci.quantity}).`
          );
        }
      }

      const unitPriceVnd = m1Quote?.price_vnd !== undefined ? Number(m1Quote.price_vnd) : 100000;
      const lineTotalVnd = unitPriceVnd * ci.quantity;
      const storeId = m1Quote?.store_id || ci.store_id;

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          store_id: storeId,
          items: [],
          goods_vnd: 0,
          store_discount_vnd: 0,
          net_goods_vnd: 0,
          platform_discount_vnd: 0,
          shipping_vnd: 0,
          payable_vnd: 0,
        });
      }

      const storeCalc = storeMap.get(storeId)!;
      storeCalc.items.push({
        variant_id: ci.variant_id,
        unit_price_vnd: unitPriceVnd,
        quantity: ci.quantity,
        line_total_vnd: lineTotalVnd,
      });
      storeCalc.goods_vnd += lineTotalVnd;
    }

    const now = new Date();

    // 4. Process Store Vouchers (BR-27, BR-28)
    for (const storeCalc of storeMap.values()) {
      const storeVoucherCode = input?.store_vouchers?.[storeCalc.store_id];
      if (storeVoucherCode) {
        const voucher = await orderRepo.findStoreVoucherByCode(storeVoucherCode, storeCalc.store_id);
        if (!voucher) {
          throw new ApiError(
            422,
            'VOUCHER_INVALID',
            `Mã voucher cửa hàng "${storeVoucherCode}" không tồn tại hoặc không thuộc cửa hàng này.`
          );
        }
        if (voucher.status !== 'ACTIVE') {
          throw new ApiError(422, 'VOUCHER_INACTIVE', `Voucher cửa hàng "${storeVoucherCode}" không còn hoạt động.`);
        }
        const startsAt = new Date(voucher.starts_at);
        const endsAt = new Date(voucher.ends_at);
        if (now < startsAt || now > endsAt) {
          throw new ApiError(422, 'VOUCHER_EXPIRED', `Voucher cửa hàng "${storeVoucherCode}" đã hết hạn hoặc chưa có hiệu lực.`);
        }
        if (voucher.usage_limit <= 0) {
          throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', `Voucher cửa hàng "${storeVoucherCode}" đã hết lượt sử dụng.`);
        }

        const minGoodsVnd = Number(voucher.min_goods_vnd);
        if (storeCalc.goods_vnd < minGoodsVnd) {
          throw new ApiError(
            422,
            'VOUCHER_MIN_SPEND_NOT_MET',
            `Đơn hàng tại cửa hàng chưa đạt giá trị tối thiểu ${minGoodsVnd.toLocaleString('vi-VN')} VND để sử dụng voucher "${storeVoucherCode}".`
          );
        }

        let calculatedDiscount = 0;
        if (voucher.discount_type === 'PERCENT') {
          calculatedDiscount = Math.floor((storeCalc.goods_vnd * Number(voucher.discount_value)) / 100);
          if (voucher.max_discount_vnd) {
            calculatedDiscount = Math.min(calculatedDiscount, Number(voucher.max_discount_vnd));
          }
        } else {
          // FIXED
          calculatedDiscount = Number(voucher.discount_value);
        }

        storeCalc.store_discount_vnd = Math.min(storeCalc.goods_vnd, Math.max(0, calculatedDiscount));
      } else {
        storeCalc.store_discount_vnd = 0;
      }

      storeCalc.net_goods_vnd = storeCalc.goods_vnd - storeCalc.store_discount_vnd;
    }

    // 5. Process Platform Voucher (BR-27, BR-28, BR-29)
    const storeList = Array.from(storeMap.values());
    const totalNetGoodsVnd = storeList.reduce((acc, s) => acc + s.net_goods_vnd, 0);

    if (input?.platform_voucher_code) {
      const platformVoucherCode = input.platform_voucher_code;
      const voucher = await orderRepo.findPlatformVoucherByCode(platformVoucherCode);
      if (!voucher) {
        throw new ApiError(422, 'PLATFORM_VOUCHER_INVALID', `Mã voucher sàn "${platformVoucherCode}" không tồn tại.`);
      }
      if (voucher.status !== 'ACTIVE') {
        throw new ApiError(422, 'VOUCHER_INACTIVE', `Voucher sàn "${platformVoucherCode}" không còn hoạt động.`);
      }
      const startsAt = new Date(voucher.starts_at);
      const endsAt = new Date(voucher.ends_at);
      if (now < startsAt || now > endsAt) {
        throw new ApiError(422, 'VOUCHER_EXPIRED', `Voucher sàn "${platformVoucherCode}" đã hết hạn hoặc chưa có hiệu lực.`);
      }
      if (voucher.usage_limit <= 0) {
        throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', `Voucher sàn "${platformVoucherCode}" đã hết lượt sử dụng.`);
      }

      const minGoodsVnd = Number(voucher.min_goods_vnd);
      if (totalNetGoodsVnd < minGoodsVnd) {
        throw new ApiError(
          422,
          'VOUCHER_MIN_SPEND_NOT_MET',
          `Tổng giá trị hàng sau giảm Store (${totalNetGoodsVnd.toLocaleString('vi-VN')} VND) chưa đạt mức tối thiểu ${minGoodsVnd.toLocaleString('vi-VN')} VND của voucher sàn "${platformVoucherCode}".`
        );
      }

      let totalPlatformDiscountVnd = 0;
      if (voucher.discount_type === 'PERCENT') {
        totalPlatformDiscountVnd = Math.floor((totalNetGoodsVnd * Number(voucher.discount_value)) / 100);
        if (voucher.max_discount_vnd) {
          totalPlatformDiscountVnd = Math.min(totalPlatformDiscountVnd, Number(voucher.max_discount_vnd));
        }
      } else {
        // FIXED
        totalPlatformDiscountVnd = Number(voucher.discount_value);
      }
      totalPlatformDiscountVnd = Math.min(totalNetGoodsVnd, Math.max(0, totalPlatformDiscountVnd));

      // Allocation via Largest Remainder Method (Hamilton-Hare / BR-29)
      if (totalNetGoodsVnd > 0 && totalPlatformDiscountVnd > 0) {
        const shareItems = storeList.map(store => {
          const exactShare = totalPlatformDiscountVnd * (store.net_goods_vnd / totalNetGoodsVnd);
          const baseShare = Math.floor(exactShare);
          const remainder = exactShare - baseShare;
          return { store, baseShare, remainder };
        });

        const sumBase = shareItems.reduce((acc, it) => acc + it.baseShare, 0);
        let remainingVnd = totalPlatformDiscountVnd - sumBase;

        // Sort by remainder descending, tie-break by store_id ascending
        shareItems.sort((a, b) => {
          if (b.remainder !== a.remainder) {
            return b.remainder - a.remainder;
          }
          return a.store.store_id.localeCompare(b.store.store_id);
        });

        for (const item of shareItems) {
          let extra = 0;
          if (remainingVnd > 0) {
            extra = 1;
            remainingVnd--;
          }
          item.store.platform_discount_vnd = item.baseShare + extra;
        }
      }
    } else {
      for (const store of storeList) {
        store.platform_discount_vnd = 0;
      }
    }

    // 6. Calculate store payable amounts and total (BR-31)
    for (const store of storeList) {
      store.payable_vnd = Math.max(
        0,
        store.goods_vnd - store.store_discount_vnd - store.platform_discount_vnd + store.shipping_vnd
      );
    }

    const payableTotalVnd = storeList.reduce((acc, s) => acc + s.payable_vnd, 0);
    const quoteId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      quote_id: quoteId,
      stores: storeList.map(store => ({
        store_id: store.store_id,
        amounts: {
          goods_vnd: store.goods_vnd,
          store_discount_vnd: store.store_discount_vnd,
          platform_discount_vnd: store.platform_discount_vnd,
          shipping_vnd: store.shipping_vnd,
          payable_vnd: store.payable_vnd,
        },
        items: store.items,
      })),
      payable_total_vnd: payableTotalVnd,
      expires_at: expiresAt,
    };
  }
}
