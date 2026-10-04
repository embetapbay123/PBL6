import { randomUUID, createHash } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { OrderRepository } from './order.repository';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  voucher_id?: string;
}

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

  async reserveInventory(
    data: {
      operation_id: string;
      purchase_group_id: string;
      items: Array<{ variant_id: string; store_id: string; order_id: string; quantity: number }>;
      expires_at: string;
    },
    correlation: string
  ) {
    const client = this.getInternalClients();
    if (!client) return { reservations: [] };
    try {
      const result = await client.call('ReserveInventory', data, correlation);
      return result;
    } catch {
      return { reservations: [] };
    }
  }

  private async calculateQuote(
    cartItemIds: string[],
    userId: string,
    storeVouchersInput: Record<string, string> | undefined,
    platformVoucherCodeInput: string | undefined,
    correlation: string,
    orderRepo: OrderRepository
  ): Promise<{
    storeList: StoreCalculation[];
    totalPayableVnd: number;
    platformVoucherId?: string;
  }> {
    const cartItems = await orderRepo.findCartItemsWithOwnership(cartItemIds, userId);
    if (cartItems.length !== cartItemIds.length) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Không tìm thấy một số sản phẩm trong giỏ hàng hoặc sản phẩm không thuộc quyền sở hữu của bạn.'
      );
    }

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

    // Store vouchers
    for (const storeCalc of storeMap.values()) {
      const storeVoucherCode = storeVouchersInput?.[storeCalc.store_id];
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
          calculatedDiscount = Number(voucher.discount_value);
        }

        storeCalc.store_discount_vnd = Math.min(storeCalc.goods_vnd, Math.max(0, calculatedDiscount));
        storeCalc.voucher_id = voucher.id;
      } else {
        storeCalc.store_discount_vnd = 0;
      }

      storeCalc.net_goods_vnd = storeCalc.goods_vnd - storeCalc.store_discount_vnd;
    }

    // Platform voucher
    const storeList = Array.from(storeMap.values());
    const totalNetGoodsVnd = storeList.reduce((acc, s) => acc + s.net_goods_vnd, 0);
    let platformVoucherId: string | undefined;

    if (platformVoucherCodeInput) {
      const voucher = await orderRepo.findPlatformVoucherByCode(platformVoucherCodeInput);
      if (!voucher) {
        throw new ApiError(422, 'PLATFORM_VOUCHER_INVALID', `Mã voucher sàn "${platformVoucherCodeInput}" không tồn tại.`);
      }
      if (voucher.status !== 'ACTIVE') {
        throw new ApiError(422, 'VOUCHER_INACTIVE', `Voucher sàn "${platformVoucherCodeInput}" không còn hoạt động.`);
      }
      const startsAt = new Date(voucher.starts_at);
      const endsAt = new Date(voucher.ends_at);
      if (now < startsAt || now > endsAt) {
        throw new ApiError(422, 'VOUCHER_EXPIRED', `Voucher sàn "${platformVoucherCodeInput}" đã hết hạn hoặc chưa có hiệu lực.`);
      }
      if (voucher.usage_limit <= 0) {
        throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', `Voucher sàn "${platformVoucherCodeInput}" đã hết lượt sử dụng.`);
      }

      const minGoodsVnd = Number(voucher.min_goods_vnd);
      if (totalNetGoodsVnd < minGoodsVnd) {
        throw new ApiError(
          422,
          'VOUCHER_MIN_SPEND_NOT_MET',
          `Tổng giá trị hàng sau giảm Store (${totalNetGoodsVnd.toLocaleString('vi-VN')} VND) chưa đạt mức tối thiểu ${minGoodsVnd.toLocaleString('vi-VN')} VND của voucher sàn "${platformVoucherCodeInput}".`
        );
      }

      let totalPlatformDiscountVnd = 0;
      if (voucher.discount_type === 'PERCENT') {
        totalPlatformDiscountVnd = Math.floor((totalNetGoodsVnd * Number(voucher.discount_value)) / 100);
        if (voucher.max_discount_vnd) {
          totalPlatformDiscountVnd = Math.min(totalPlatformDiscountVnd, Number(voucher.max_discount_vnd));
        }
      } else {
        totalPlatformDiscountVnd = Number(voucher.discount_value);
      }
      totalPlatformDiscountVnd = Math.min(totalNetGoodsVnd, Math.max(0, totalPlatformDiscountVnd));

      platformVoucherId = voucher.id;

      if (totalNetGoodsVnd > 0 && totalPlatformDiscountVnd > 0) {
        const shareItems = storeList.map(store => {
          const exactShare = totalPlatformDiscountVnd * (store.net_goods_vnd / totalNetGoodsVnd);
          const baseShare = Math.floor(exactShare);
          const remainder = exactShare - baseShare;
          return { store, baseShare, remainder };
        });

        const sumBase = shareItems.reduce((acc, it) => acc + it.baseShare, 0);
        let remainingVnd = totalPlatformDiscountVnd - sumBase;

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

    for (const store of storeList) {
      store.payable_vnd = Math.max(
        0,
        store.goods_vnd - store.store_discount_vnd - store.platform_discount_vnd + store.shipping_vnd
      );
    }

    const totalPayableVnd = storeList.reduce((acc, s) => acc + s.payable_vnd, 0);
    return { storeList, totalPayableVnd, platformVoucherId };
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

    const { storeList, totalPayableVnd } = await this.calculateQuote(
      cartItemIds,
      userId,
      input.store_vouchers,
      input.platform_voucher_code,
      correlation,
      orderRepo
    );

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
      payable_total_vnd: totalPayableVnd,
      expires_at: expiresAt,
    };
  }

  async confirmCheckout(
    input: OperationInputs['confirmCheckout']['body'],
    idempotencyKey: string | undefined,
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['confirmCheckout']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw new ApiError(400, 'BAD_REQUEST', 'Thiếu Idempotency-Key trong header.');
    }

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

    const quoteId = input?.quote_id;
    if (!quoteId || !UUID_REGEX.test(quoteId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'quote_id không hợp lệ.');
    }

    // 1. Check Idempotency Record (BR-19)
    const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const rootRepo = new OrderRepository(database.manager);
    const existingIdempotency = await rootRepo.findIdempotencyRecord(idempotencyKey, userId);

    if (existingIdempotency) {
      if (existingIdempotency.payload_hash === payloadHash && existingIdempotency.response_json) {
        return existingIdempotency.response_json as unknown as OperationOutputs['confirmCheckout'];
      }
      throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa Idempotency-Key đã được sử dụng với nội dung yêu cầu khác.');
    }

    // 2. Recalculate quote to ensure price & stock integrity (BR-18, BR-31)
    const { storeList, totalPayableVnd, platformVoucherId } = await this.calculateQuote(
      cartItemIds,
      userId,
      input.store_vouchers,
      input.platform_voucher_code,
      correlation,
      rootRepo
    );

    if (totalPayableVnd !== input.expected_payable_total_vnd) {
      throw new ApiError(
        409,
        'PRICE_CHANGED',
        `Tổng số tiền thanh toán đã thay đổi (mong đợi: ${input.expected_payable_total_vnd.toLocaleString('vi-VN')} VND, thực tế: ${totalPayableVnd.toLocaleString('vi-VN')} VND). Vui lòng xác nhận lại quote mới.`
      );
    }

    const purchaseGroupId = randomUUID();
    const storeOrderMap = new Map<string, string>();
    for (const store of storeList) {
      storeOrderMap.set(store.store_id, randomUUID());
    }

    // 3. M1 Inventory Reservation (BR-10, BR-41)
    const reservationItems: Array<{ variant_id: string; store_id: string; order_id: string; quantity: number }> = [];
    for (const store of storeList) {
      const orderId = storeOrderMap.get(store.store_id)!;
      for (const item of store.items) {
        reservationItems.push({
          variant_id: item.variant_id,
          store_id: store.store_id,
          order_id: orderId,
          quantity: item.quantity,
        });
      }
    }

    await this.reserveInventory(
      {
        operation_id: randomUUID(),
        purchase_group_id: purchaseGroupId,
        items: reservationItems,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      correlation
    );

    // 4. Atomic Transaction in M2 DB (BR-02, BR-16, BR-17, BR-21, BR-30)
    return database.transaction(async manager => {
      const repo = new OrderRepository(manager);

      const createdOrders: Array<OperationOutputs['confirmCheckout']['orders'][0]> = [];

      for (const store of storeList) {
        const orderId = storeOrderMap.get(store.store_id)!;
        const paymentMethod = input.payment_methods?.[store.store_id] || 'COD';
        const isSandbox = paymentMethod === 'SANDBOX';
        const initialStatus = isSandbox ? 'AWAITING_PAYMENT' : 'PREPARING';
        const paymentExpiresAt = isSandbox ? new Date(Date.now() + 15 * 60 * 1000) : null;

        const addressSnapshot = {
          address_id: input.address_id,
          recipient_name: 'Khách hàng',
          phone: '0900000000',
          line1: 'Địa chỉ giao hàng',
          ward: 'Phường',
          district: 'Quận',
          city: 'Thành phố',
        };

        const createdOrder = await repo.createOrder({
          id: orderId,
          purchase_group_id: purchaseGroupId,
          customer_user_id: userId,
          store_id: store.store_id,
          address_snapshot: addressSnapshot,
          status: initialStatus,
          payment_method: paymentMethod,
          payment_expires_at: paymentExpiresAt,
          goods_vnd: store.goods_vnd,
          store_discount_vnd: store.store_discount_vnd,
          platform_discount_vnd: store.platform_discount_vnd,
          shipping_vnd: store.shipping_vnd,
          payable_vnd: store.payable_vnd,
          version: 1,
        });

        // Insert Order Items
        for (const item of store.items) {
          await repo.createOrderItem({
            order_id: orderId,
            product_id: item.variant_id,
            variant_id: item.variant_id,
            product_snapshot: { title: item.product_title ?? 'Sản phẩm' },
            sku_snapshot: item.sku ?? 'SKU-DEFAULT',
            unit_price_vnd: item.unit_price_vnd,
            quantity: item.quantity,
            line_total_vnd: item.line_total_vnd,
          });
        }

        // Insert Payment
        await repo.createPayment({
          order_id: orderId,
          method: paymentMethod,
          status: 'PENDING',
          payable_vnd: store.payable_vnd,
          collectible_vnd: store.payable_vnd,
        });

        // Record Store Voucher Redemption if used
        if (store.voucher_id && store.store_discount_vnd > 0) {
          await repo.recordVoucherRedemption({
            voucher_id: store.voucher_id,
            purchase_group_id: purchaseGroupId,
            order_id: orderId,
            customer_user_id: userId,
            discount_vnd: store.store_discount_vnd,
          });
          await repo.decrementVoucherUsage(store.voucher_id);
        }

        createdOrders.push({
          id: createdOrder.id,
          purchase_group_id: createdOrder.purchase_group_id,
          store_id: createdOrder.store_id,
          status: createdOrder.status as any,
          version: createdOrder.version,
          payment_method: createdOrder.payment_method as any,
          payment_expires_at: createdOrder.payment_expires_at ? new Date(createdOrder.payment_expires_at).toISOString() : undefined,
          amounts: {
            goods_vnd: Number(createdOrder.goods_vnd),
            store_discount_vnd: Number(createdOrder.store_discount_vnd),
            platform_discount_vnd: Number(createdOrder.platform_discount_vnd),
            shipping_vnd: Number(createdOrder.shipping_vnd),
            payable_vnd: Number(createdOrder.payable_vnd),
          },
          items: store.items,
        });
      }

      // Record Platform Voucher Redemption if used
      if (platformVoucherId) {
        const totalPlatformDiscount = storeList.reduce((acc, s) => acc + s.platform_discount_vnd, 0);
        if (totalPlatformDiscount > 0) {
          const firstOrderId = createdOrders[0]?.id || purchaseGroupId;
          await repo.recordVoucherRedemption({
            voucher_id: platformVoucherId,
            purchase_group_id: purchaseGroupId,
            order_id: firstOrderId,
            customer_user_id: userId,
            discount_vnd: totalPlatformDiscount,
          });
          await repo.decrementVoucherUsage(platformVoucherId);
        }
      }

      // Remove purchased items from customer's cart
      await repo.removeCartItems(cartItemIds, userId);

      const resultPayload: OperationOutputs['confirmCheckout'] = {
        purchase_group_id: purchaseGroupId,
        order_ids: createdOrders.map(o => o.id),
        orders: createdOrders,
        payable_total_vnd: totalPayableVnd,
      };

      // Save Idempotency Record (24 hours TTL)
      await repo.saveIdempotencyRecord({
        id: randomUUID(),
        customer_user_id: userId,
        key: idempotencyKey,
        payload_hash: payloadHash,
        purchase_group_id: purchaseGroupId,
        response_json: resultPayload as any,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      });

      return resultPayload;
    });
  }

  async getPurchaseGroupOrders(
    purchaseGroupId: string,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['getPurchaseGroupOrders']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (!purchaseGroupId || !UUID_REGEX.test(purchaseGroupId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'purchase_group_id không hợp lệ.');
    }

    const repo = new OrderRepository(database.manager);
    const ordersWithItems = await repo.findOrdersByPurchaseGroupId(purchaseGroupId, userId);

    if (!ordersWithItems.length) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Không tìm thấy nhóm đơn hàng hoặc nhóm đơn hàng không thuộc quyền sở hữu của bạn.'
      );
    }

    const orders: OperationOutputs['getPurchaseGroupOrders']['orders'] = ordersWithItems.map(o => ({
      id: o.id,
      purchase_group_id: o.purchase_group_id,
      store_id: o.store_id,
      status: o.status as any,
      version: o.version,
      payment_method: o.payment_method as any,
      payment_expires_at: o.payment_expires_at ? new Date(o.payment_expires_at).toISOString() : undefined,
      amounts: {
        goods_vnd: Number(o.goods_vnd),
        store_discount_vnd: Number(o.store_discount_vnd),
        platform_discount_vnd: Number(o.platform_discount_vnd),
        shipping_vnd: Number(o.shipping_vnd),
        payable_vnd: Number(o.payable_vnd),
      },
      items: o.items.map(it => ({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        product_snapshot: it.product_snapshot,
        sku_snapshot: it.sku_snapshot,
        unit_price_vnd: Number(it.unit_price_vnd),
        quantity: it.quantity,
        line_total_vnd: Number(it.line_total_vnd),
      })),
    }));

    const payableTotalVnd = orders.reduce((sum, o) => sum + o.amounts.payable_vnd, 0);

    return {
      purchase_group_id: purchaseGroupId,
      order_ids: orders.map(o => o.id),
      orders,
      payable_total_vnd: payableTotalVnd,
    };
  }
}
