import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError, notImplemented } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { moneyNumber } from '../../../shared/src/money';
import { fingerprint } from '../../../shared/src/idempotency';
import { CatalogClient, CatalogDirectory } from '../catalog-client';
import { requireStorePermission, accessToken } from '../scope';
import { PaymentService } from '../payment/payment.service';
import { PaymentPort } from '../payment/payment.port';
import { EntityManager } from 'typeorm';
import { QuoteStore, RedisQuoteStore } from './quote-store';
import { emitEvent } from '../../../shared/src/events';
import { audit } from '../../../shared/src/audit';
import { VoucherRepository } from '../voucher/voucher.repository';
import { OrderRepository, OrderRow, OrderItemRow } from './order.repository';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProcessedItem {
  product_id: string;
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
    ) => InternalClients,
    private readonly dependencies: {
      catalog?: CatalogDirectory;
      quotes?: QuoteStore;
      payments?: (manager: EntityManager) => PaymentPort;
      vouchers?: (manager: EntityManager) => VoucherRepository;
    } = {},
  ) {
    this.quoteStore = dependencies.quotes ?? new RedisQuoteStore();
    this.catalog = dependencies.catalog ?? new CatalogClient();
  }

  private readonly quoteStore: QuoteStore;
  private readonly catalog: CatalogDirectory;
  private payments(manager: EntityManager): PaymentPort {
    const port = this.dependencies.payments?.(manager) ?? new PaymentService(manager);
    if (port.manager !== manager) throw new Error('TRANSACTION_MANAGER_MISMATCH');
    return port;
  }
  private vouchers(manager: EntityManager): VoucherRepository {
    return this.dependencies.vouchers?.(manager) ?? new VoucherRepository(manager);
  }

  private getInternalClients(): InternalClients {
    if (this.internalClientsFactory) return this.internalClientsFactory('M2','test',{M1:'',M2:'',M3:''});
    const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});
  }
  async quoteVariants(items:Array<{variant_id:string;store_id:string;quantity:number}>,correlation:string) {
    if (!items.length) return [];
    return (await this.getInternalClients().call('QuoteVariants',{items},correlation)).items;
  }
  private quoteInput(input:OperationInputs['quoteCheckout']['body']) {
    return {cart_item_ids:[...input.cart_item_ids].sort(),address_id:input.address_id,
      payment_methods:input.payment_methods,store_vouchers:input.store_vouchers,platform_voucher_code:input.platform_voucher_code};
  }

  private mapOrderRowToDto(order: OrderRow & { items: OrderItemRow[] }): OperationOutputs['getOwnOrder'] {
    return {
      id: order.id,
      purchase_group_id: order.purchase_group_id,
      store_id: order.store_id,
      status: order.status as any,
      version: order.version,
      payment_method: order.payment_method as any,
      payment_status: order.payment_status ?? undefined,
      refund_status: order.refund_status ?? undefined,
      payment_expires_at: order.payment_expires_at ? new Date(order.payment_expires_at).toISOString() : undefined,
      amounts: {
        goods_vnd: moneyNumber(order.goods_vnd),
        store_discount_vnd: moneyNumber(order.store_discount_vnd),
        platform_discount_vnd: moneyNumber(order.platform_discount_vnd),
        shipping_vnd: moneyNumber(order.shipping_vnd),
        payable_vnd: moneyNumber(order.payable_vnd),
      },
      items: order.items.map(it => ({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        product_snapshot: it.product_snapshot,
        sku_snapshot: it.sku_snapshot,
        unit_price_vnd: moneyNumber(it.unit_price_vnd),
        quantity: it.quantity,
        line_total_vnd: moneyNumber(it.line_total_vnd),
      })),
    };
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
    if (new Set(cartItemIds).size!==cartItemIds.length || cartItems.length !== cartItemIds.length) {
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
    const products=new Map<string,Awaited<ReturnType<CatalogDirectory['product']>>>();
    for (const item of cartItems) {
      if (!item.product_id) throw new ApiError(409,'CART_MAPPING_REQUIRED','Item cũ chưa có Product; hãy xóa và thêm lại.');
      if (!products.has(item.product_id)) products.set(item.product_id,await this.catalog.product(item.product_id,correlation));
    }

    for (const ci of cartItems) {
      const m1Quote = m1QuotesMap.get(ci.variant_id);
      if (!m1Quote || m1Quote.store_id!==ci.store_id) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Quote không khớp Cart.');
      if (m1Quote) {
        if (m1Quote.available_quantity !== undefined && m1Quote.available_quantity < ci.quantity) {
          throw new ApiError(
            409,
            'INSUFFICIENT_STOCK',
            `Sản phẩm variant ${ci.variant_id} không đủ tồn kho (còn ${m1Quote.available_quantity}, yêu cầu ${ci.quantity}).`
          );
        }
      }

      const unitPriceVnd = moneyNumber(m1Quote.price_vnd);
      const lineTotalVnd = moneyNumber(BigInt(unitPriceVnd) * BigInt(ci.quantity));
      const storeId = m1Quote.store_id;
      const product=products.get(ci.product_id!)!;
      const variant=product.variants.find(v=>v.id===ci.variant_id);
      if (!variant || product.store_id!==storeId) throw new ApiError(409,'CART_PRODUCT_CHANGED','Product/Variant/Store không còn khớp.');

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
        product_id:product.id,product_title:product.title,sku:variant.sku,
        variant_id: ci.variant_id,
        unit_price_vnd: unitPriceVnd,
        quantity: ci.quantity,
        line_total_vnd: lineTotalVnd,
      });
      storeCalc.goods_vnd = moneyNumber(BigInt(storeCalc.goods_vnd)+BigInt(lineTotalVnd));
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
        if (!(await orderRepo.voucherAvailable(voucher,userId))) {
          throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', `Voucher cửa hàng "${storeVoucherCode}" đã hết lượt sử dụng.`);
        }

        const minGoodsVnd = moneyNumber(voucher.min_goods_vnd);
        if (storeCalc.goods_vnd < minGoodsVnd) {
          throw new ApiError(
            422,
            'VOUCHER_MIN_SPEND_NOT_MET',
            `Đơn hàng tại cửa hàng chưa đạt giá trị tối thiểu ${minGoodsVnd.toLocaleString('vi-VN')} VND để sử dụng voucher "${storeVoucherCode}".`
          );
        }

        let calculatedDiscount = 0;
        if (voucher.discount_type === 'PERCENT') {
          calculatedDiscount = moneyNumber(BigInt(storeCalc.goods_vnd)*BigInt(voucher.discount_value)/100n);
          if (voucher.max_discount_vnd) {
            calculatedDiscount = Math.min(calculatedDiscount, moneyNumber(voucher.max_discount_vnd));
          }
        } else {
          calculatedDiscount = moneyNumber(voucher.discount_value);
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
    const totalNetGoodsVnd = moneyNumber(storeList.reduce((acc,s)=>acc+BigInt(s.net_goods_vnd),0n));
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
      if (!(await orderRepo.voucherAvailable(voucher,userId))) {
        throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', `Voucher sàn "${platformVoucherCodeInput}" đã hết lượt sử dụng.`);
      }

      const minGoodsVnd = moneyNumber(voucher.min_goods_vnd);
      if (totalNetGoodsVnd < minGoodsVnd) {
        throw new ApiError(
          422,
          'VOUCHER_MIN_SPEND_NOT_MET',
          `Tổng giá trị hàng sau giảm Store (${totalNetGoodsVnd.toLocaleString('vi-VN')} VND) chưa đạt mức tối thiểu ${minGoodsVnd.toLocaleString('vi-VN')} VND của voucher sàn "${platformVoucherCodeInput}".`
        );
      }

      let totalPlatformDiscountVnd = 0;
      if (voucher.discount_type === 'PERCENT') {
        totalPlatformDiscountVnd = moneyNumber(BigInt(totalNetGoodsVnd)*BigInt(voucher.discount_value)/100n);
        if (voucher.max_discount_vnd) {
          totalPlatformDiscountVnd = Math.min(totalPlatformDiscountVnd, moneyNumber(voucher.max_discount_vnd));
        }
      } else {
        totalPlatformDiscountVnd = moneyNumber(voucher.discount_value);
      }
      totalPlatformDiscountVnd = Math.min(totalNetGoodsVnd, Math.max(0, totalPlatformDiscountVnd));

      platformVoucherId = voucher.id;

      if (totalNetGoodsVnd > 0 && totalPlatformDiscountVnd > 0) {
        const shareItems = storeList.map(store => {
          const numerator = BigInt(totalPlatformDiscountVnd) * BigInt(store.net_goods_vnd);
          const baseShare = moneyNumber(numerator / BigInt(totalNetGoodsVnd));
          const remainder = numerator % BigInt(totalNetGoodsVnd);
          return { store, baseShare, remainder };
        });

        const sumBase = shareItems.reduce((acc, it) => acc + it.baseShare, 0);
        let remainingVnd = totalPlatformDiscountVnd - sumBase;

        shareItems.sort((a, b) => {
          if (b.remainder !== a.remainder) {
            return b.remainder > a.remainder ? 1 : -1;
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

  async revalidateQuote(
    input: OperationInputs['quoteCheckout']['body'],
    auth: any,
    correlation: string,
    orderRepo: OrderRepository
  ): Promise<{
    storeList: StoreCalculation[];
    context: any;
    payable: number;
    platformVoucherId?: string;
    snapshotHash: string;
  }> {
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

    const { storeList, platformVoucherId } = await this.calculateQuote(
      cartItemIds,
      userId,
      input.store_vouchers,
      input.platform_voucher_code,
      correlation,
      orderRepo
    );

    const context = await this.getInternalClients().call('ResolveCheckoutContext', {
      token: accessToken(auth),
      address_id: addressId,
      store_ids: storeList.map(s => s.store_id),
    }, correlation);

    for (const store of storeList) {
      const snapshot = context.stores?.find((s: any) => s.id === store.store_id);
      if (!snapshot) throw new ApiError(503, 'DEPENDENCY_CONTRACT_INVALID', 'Lookup thiếu Store.');
      store.shipping_vnd = moneyNumber(snapshot.shipping_fee_vnd);
      store.payable_vnd = moneyNumber(BigInt(store.goods_vnd) - BigInt(store.store_discount_vnd) - BigInt(store.platform_discount_vnd) + BigInt(store.shipping_vnd));
    }

    const payable = moneyNumber(storeList.reduce((sum, s) => sum + BigInt(s.payable_vnd), 0n));
    const snapshotHash = fingerprint({ storeList, context });

    return { storeList, context, payable, platformVoucherId, snapshotHash };
  }

  async quoteCheckout(
    input: OperationInputs['quoteCheckout']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['quoteCheckout']> {
    const orderRepo = new OrderRepository(database.manager);
    const { storeList, payable, snapshotHash } = await this.revalidateQuote(
      input,
      auth,
      correlation,
      orderRepo
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const quoteId = randomUUID();
    await this.quoteStore.put(quoteId, {
      user_id: auth.user_id,
      request_hash: fingerprint(this.quoteInput(input)),
      snapshot_hash: snapshotHash,
      expires_at: expiresAt,
    });
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
      payable_total_vnd: payable,
      expires_at: expiresAt,
    };
  }

  async confirmCheckout(
    input: OperationInputs['confirmCheckout']['body'],
    key: string | undefined,
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['confirmCheckout']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');
    if (!key?.trim()) throw new ApiError(422, 'VALIDATION_FAILED', 'Thiếu Idempotency-Key.');

    const idempotencyKey = key.trim();
    const requestPayloadHash = fingerprint({
      cart_item_ids: [...input.cart_item_ids].sort(),
      address_id: input.address_id,
      payment_methods: input.payment_methods,
      platform_voucher_code: input.platform_voucher_code,
      store_vouchers: input.store_vouchers,
      quote_id: input.quote_id,
      expected_payable_total_vnd: input.expected_payable_total_vnd,
    });

    const rootRepo = new OrderRepository(database.manager);

    const existingRecord = await rootRepo.findIdempotencyRecord(idempotencyKey, userId);
    if (existingRecord) {
      if (existingRecord.payload_hash !== requestPayloadHash) {
        throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency-Key đã dùng với payload khác.');
      }
      return existingRecord.response_json as OperationOutputs['confirmCheckout'];
    }

    const quote = await this.quoteStore.get(input.quote_id);
    if (!quote || quote.user_id !== userId) {
      throw new ApiError(404, 'QUOTE_NOT_FOUND', 'Không tìm thấy quote của Customer.');
    }
    if (Date.parse(quote.expires_at) <= Date.now()) {
      throw new ApiError(409, 'QUOTE_EXPIRED', 'Quote đã hết hạn.');
    }
    if (quote.request_hash !== fingerprint(this.quoteInput(input))) {
      throw new ApiError(409, 'QUOTE_CHANGED', 'Nội dung khác quote.');
    }

    // BUG-QUOTE-01: Revalidate quote against current upstream data before reserve or DB effects
    const { storeList, context, payable, platformVoucherId, snapshotHash } = await this.revalidateQuote(
      input,
      auth,
      correlation,
      rootRepo
    );

    if (snapshotHash !== quote.snapshot_hash) {
      throw new ApiError(409, 'QUOTE_CHANGED', 'Dữ liệu sản phẩm, giá hoặc địa chỉ đã thay đổi. Vui lòng tạo quote mới.');
    }

    if (input.expected_payable_total_vnd !== payable) {
      throw new ApiError(409, 'QUOTE_CHANGED', 'Tổng tiền thanh toán không khớp với quote.');
    }

    for (const store of storeList) {
      const method = input.payment_methods?.[store.store_id];
      if (!method || !['COD', 'SANDBOX'].includes(method)) {
        throw new ApiError(422, 'VALIDATION_FAILED', `Thiếu hoặc không hợp lệ phương thức thanh toán cho Store ${store.store_id}.`);
      }
    }

    const purchaseGroupId = randomUUID();
    const now = new Date();
    const storeOrders = storeList.map(store => {
      const orderId = randomUUID();
      const method = input.payment_methods[store.store_id] as 'COD' | 'SANDBOX';
      const status = method === 'COD' ? 'PREPARING' : 'AWAITING_PAYMENT';
      const paymentExpiresAt = method === 'SANDBOX' ? new Date(now.getTime() + 15 * 60 * 1000) : null;
      return {
        ...store,
        orderId,
        paymentMethod: method,
        status,
        paymentExpiresAt,
      };
    });

    const reservationItems: Array<{
      variant_id: string;
      store_id: string;
      order_id: string;
      quantity: number;
    }> = [];
    for (const store of storeOrders) {
      for (const item of store.items) {
        reservationItems.push({
          variant_id: item.variant_id,
          store_id: store.store_id,
          order_id: store.orderId,
          quantity: item.quantity,
        });
      }
    }

    const reservationExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const reserveOpId = randomUUID();
    const reserveResult = await this.getInternalClients().call('ReserveInventory', {
      operation_id: reserveOpId,
      purchase_group_id: purchaseGroupId,
      items: reservationItems,
      expires_at: reservationExpiresAt.toISOString(),
    }, correlation);

    try {
      return await database.transaction(async manager => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
          'M2.Confirm:' + userId + ':' + idempotencyKey,
        ]);

        const repo = new OrderRepository(manager);
        const existingTxRecord = await repo.findIdempotencyRecord(idempotencyKey, userId);
        if (existingTxRecord) {
          if (existingTxRecord.payload_hash !== requestPayloadHash) {
            throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency-Key đã dùng với payload khác.');
          }
          return existingTxRecord.response_json as OperationOutputs['confirmCheckout'];
        }

        const voucherRepo = this.vouchers(manager);
        const voucherHolds: Array<{
          voucher_id: string;
          purchase_group_id: string;
          customer_user_id: string;
          store_id?: string | null;
          discount_vnd: number;
          expires_at: Date;
        }> = [];

        for (const store of storeOrders) {
          if (store.voucher_id && store.store_discount_vnd > 0) {
            voucherHolds.push({
              voucher_id: store.voucher_id,
              purchase_group_id: purchaseGroupId,
              customer_user_id: userId,
              store_id: store.store_id,
              discount_vnd: store.store_discount_vnd,
              expires_at: reservationExpiresAt,
            });
          }
        }

        const totalPlatformDiscountVnd = storeOrders.reduce((acc, s) => acc + s.platform_discount_vnd, 0);
        if (platformVoucherId && totalPlatformDiscountVnd > 0) {
          voucherHolds.push({
            voucher_id: platformVoucherId,
            purchase_group_id: purchaseGroupId,
            customer_user_id: userId,
            store_id: null,
            discount_vnd: totalPlatformDiscountVnd,
            expires_at: reservationExpiresAt,
          });
        }

        // When reserving multiple vouchers, call in sorted voucher_id order
        voucherHolds.sort((a, b) => a.voucher_id.localeCompare(b.voucher_id));
        for (const hold of voucherHolds) {
          await voucherRepo.reserveVoucher(hold);
        }

        for (const store of storeOrders) {
          await repo.createOrder({
            id: store.orderId,
            purchase_group_id: purchaseGroupId,
            customer_user_id: userId,
            store_id: store.store_id,
            address_snapshot: context.address_snapshot ?? {},
            status: store.status,
            payment_method: store.paymentMethod,
            payment_expires_at: store.paymentExpiresAt,
            goods_vnd: store.goods_vnd,
            store_discount_vnd: store.store_discount_vnd,
            platform_discount_vnd: store.platform_discount_vnd,
            shipping_vnd: store.shipping_vnd,
            payable_vnd: store.payable_vnd,
            version: 0,
          });

          for (const item of store.items) {
            await repo.createOrderItem({
              order_id: store.orderId,
              product_id: item.product_id,
              variant_id: item.variant_id,
              product_snapshot: { title: item.product_title },
              sku_snapshot: item.sku ?? '',
              unit_price_vnd: item.unit_price_vnd,
              quantity: item.quantity,
              line_total_vnd: item.line_total_vnd,
            });
          }

          await manager.query(
            `INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_user_id, reason, operation_id, created_at)
             VALUES (gen_random_uuid(), $1, NULL, $2, $3, 'ORDER_CREATED', gen_random_uuid(), NOW())`,
            [store.orderId, store.status, userId]
          );
        }

        const redemptionRows: Array<{
          voucher_id: string;
          order_id: string;
          customer_user_id: string;
          discount_vnd: number;
        }> = [];

        for (const store of storeOrders) {
          if (store.voucher_id && store.store_discount_vnd > 0) {
            redemptionRows.push({
              voucher_id: store.voucher_id,
              order_id: store.orderId,
              customer_user_id: userId,
              discount_vnd: store.store_discount_vnd,
            });
          }
          if (platformVoucherId && store.platform_discount_vnd > 0) {
            redemptionRows.push({
              voucher_id: platformVoucherId,
              order_id: store.orderId,
              customer_user_id: userId,
              discount_vnd: store.platform_discount_vnd,
            });
          }
        }

        await voucherRepo.commitVoucherRedemptions(purchaseGroupId, redemptionRows);

        const paymentPort = this.payments(manager);
        for (const store of storeOrders) {
          await paymentPort.createForOrder({
            order_id: store.orderId,
            method: store.paymentMethod,
            payable_vnd: BigInt(store.payable_vnd),
            operation_id: randomUUID(),
            correlation_id: correlation,
          });
        }

        await repo.removeCartItems(input.cart_item_ids, userId);

        for (const store of storeOrders) {
          await audit(
            manager,
            'M2',
            userId,
            'Order',
            store.orderId,
            'CONFIRM_CHECKOUT',
            correlation,
            {},
            { id: store.orderId, status: store.status, payable_vnd: store.payable_vnd }
          );

          await emitEvent(
            manager,
            'OrderCreated',
            {
              order_id: store.orderId,
              purchase_group_id: purchaseGroupId,
              store_id: store.store_id,
              customer_user_id: userId,
              payable_vnd: store.payable_vnd,
            },
            correlation
          );
        }

        const responseDto: OperationOutputs['confirmCheckout'] = {
          purchase_group_id: purchaseGroupId,
          order_ids: storeOrders.map(s => s.orderId),
          orders: storeOrders.map(store => ({
            id: store.orderId,
            purchase_group_id: purchaseGroupId,
            store_id: store.store_id,
            status: store.status as any,
            version: 0,
            payment_method: store.paymentMethod as any,
            payment_expires_at: store.paymentExpiresAt ? store.paymentExpiresAt.toISOString() : undefined,
            amounts: {
              goods_vnd: store.goods_vnd,
              store_discount_vnd: store.store_discount_vnd,
              platform_discount_vnd: store.platform_discount_vnd,
              shipping_vnd: store.shipping_vnd,
              payable_vnd: store.payable_vnd,
            },
            items: store.items.map(it => ({
              product_id: it.product_id,
              variant_id: it.variant_id,
              product_snapshot: { title: it.product_title },
              sku_snapshot: it.sku ?? '',
              unit_price_vnd: it.unit_price_vnd,
              quantity: it.quantity,
              line_total_vnd: it.line_total_vnd,
            })),
          })),
          payable_total_vnd: payable,
        };

        await repo.saveIdempotencyRecord({
          customer_user_id: userId,
          key: idempotencyKey,
          payload_hash: requestPayloadHash,
          purchase_group_id: purchaseGroupId,
          response_json: responseDto as any,
          expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        });

        return responseDto;
      });
    } catch (dbError) {
      if (reserveResult?.reservations?.length) {
        const orderReservations = new Map<string, string[]>();
        for (const r of reserveResult.reservations) {
          const list = orderReservations.get(r.order_id) ?? [];
          list.push(r.id);
          orderReservations.set(r.order_id, list);
        }
        for (const [orderId, resIds] of orderReservations.entries()) {
          try {
            await this.getInternalClients().call('ReleaseReservation', {
              operation_id: randomUUID(),
              order_id: orderId,
              reservation_ids: [...new Set(resIds)],
              reason: 'CONFIRM_FAILED',
            }, correlation);
          } catch {
            // ignore compensation failure
          }
        }
      }
      throw dbError;
    }
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
        goods_vnd: moneyNumber(o.goods_vnd),
        store_discount_vnd: moneyNumber(o.store_discount_vnd),
        platform_discount_vnd: moneyNumber(o.platform_discount_vnd),
        shipping_vnd: moneyNumber(o.shipping_vnd),
        payable_vnd: moneyNumber(o.payable_vnd),
      },
      items: o.items.map(it => ({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        product_snapshot: it.product_snapshot,
        sku_snapshot: it.sku_snapshot,
        unit_price_vnd: moneyNumber(it.unit_price_vnd),
        quantity: it.quantity,
        line_total_vnd: moneyNumber(it.line_total_vnd),
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

  // --- ORDER-03: Order Read Endpoints ---

  async listOwnOrders(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listOwnOrders']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new OrderRepository(database.manager);
    const { items, total } = await repo.pageCustomerOrders(userId, page, size);

    return {
      items: items.map(this.mapOrderRowToDto),
      total,
      page,
      size,
    };
  }

  async getOwnOrder(
    id: string,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['getOwnOrder']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mã đơn hàng id không hợp lệ.');
    }

    const repo = new OrderRepository(database.manager);
    const order = await repo.findCustomerOrderById(id, userId);
    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng hoặc đơn hàng không thuộc quyền sở hữu của bạn.');
    }

    return this.mapOrderRowToDto(order);
  }

  async listStoreOrders(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listStoreOrders']> {
    const storeId = requireStorePermission(auth,'order.store.read_status_cancel');
    if (!storeId) {
      throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập đơn hàng của cửa hàng.');
    }

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new OrderRepository(database.manager);
    const { items, total } = await repo.pageStoreOrders(storeId, page, size);

    return {
      items: items.map(this.mapOrderRowToDto),
      total,
      page,
      size,
    };
  }

  async getStoreOrder(
    id: string,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['getStoreOrder']> {
    const storeId = requireStorePermission(auth,'order.store.read_status_cancel');
    if (!storeId) {
      throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập đơn hàng của cửa hàng.');
    }

    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mã đơn hàng id không hợp lệ.');
    }

    const repo = new OrderRepository(database.manager);
    const order = await repo.findStoreOrderById(id, storeId);
    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong cửa hàng của bạn.');
    }

    return this.mapOrderRowToDto(order);
  }

  // --- ORDER-04: Order State Machine & Cancellation ---

  async transitionStoreOrder(
    id: string,
    input: OperationInputs['transitionStoreOrder']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['transitionStoreOrder']> {
    const storeId = requireStorePermission(auth,'order.store.read_status_cancel');
    if (!storeId) {
      throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền thao tác đơn hàng của cửa hàng.');
    }

    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mã đơn hàng id không hợp lệ.');
    }

    if (input?.expected_version === undefined || typeof input.expected_version !== 'number') {
      throw new ApiError(422, 'VALIDATION_FAILED', 'expected_version phải là số nguyên.');
    }

    const toStatus = input?.to_status;
    const validTargetStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED'];
    if (!validTargetStatuses.includes(toStatus)) {
      throw new ApiError(422, 'VALIDATION_FAILED', `to_status không hợp lệ: ${toStatus}`);
    }

    return database.transaction(async manager => {
      const repo = new OrderRepository(manager);
      const order = await repo.lockStoreOrderById(id, storeId);
      if (!order) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong cửa hàng của bạn.');
      }

      if (order.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản đơn hàng không khớp (xung đột dữ liệu).');
      }

      // Legal state transitions:
      // PENDING is reached only after inventory consumption by the checkout/payment workflow.
      // CONFIRMED -> PROCESSING
      // PROCESSING -> SHIPPED
      // SHIPPED -> COMPLETED
      const legalTransitions: Record<string, string[]> = {
        PENDING: ['CONFIRMED'],
        CONFIRMED: ['PROCESSING'],
        PROCESSING: ['SHIPPED'],
        SHIPPED: ['COMPLETED'],
      };

      const allowedNext = legalTransitions[order.status] ?? [];
      if (!allowedNext.includes(toStatus)) {
        throw new ApiError(
          409,
          'INVALID_STATE_TRANSITION',
          `Không thể chuyển trạng thái đơn hàng từ "${order.status}" sang "${toStatus}".`
        );
      }

      if(toStatus==='COMPLETED') {
        const payment=await repo.lockPaymentByOrderId(id);
        if(!payment || payment.status!=='SUCCEEDED' || BigInt(payment.collected_vnd)<BigInt(order.payable_vnd)) throw new ApiError(409,'PAYMENT_NOT_COLLECTED','Chưa thu đủ tiền.');
      }
      const updated = await repo.updateOrderStatusWithHistory({
        order_id: id,
        from_status: order.status,
        to_status: toStatus,
        expected_version: input.expected_version,
        actor_user_id: auth.user_id,
      });

      if (!updated) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản đơn hàng đã thay đổi.');
      }

      if(toStatus==='SHIPPED') await repo.ship(id);
      if(toStatus==='COMPLETED') await repo.deliver(id);
      await audit(manager,'M2',auth.user_id,'Order',id,'TRANSITION_ORDER',correlation,
        {status:order.status,version:order.version},{status:updated.status,version:updated.version});

      // If transition to COMPLETED: emit OrderCompleted outbox event (BR: OrderCompleted outbox cùng transaction)
      if (toStatus === 'COMPLETED') {
        await emitEvent(
          manager,
          'OrderCompleted',
          {
            order_id: id,
            store_id: storeId,
            user_id: order.customer_user_id,
            version: updated.version,
            items: order.items.map(it => ({
              product_id: it.product_id,
              variant_id: it.variant_id,
              quantity: it.quantity,
            })),
          },
          correlation
        );
      }

      return this.mapOrderRowToDto({
        ...updated,
        items: order.items,
        payment_status: order.payment_status,
        refund_status: order.refund_status,
      });
    });
  }

  async cancelOwnOrder(
    id: string,
    input: OperationInputs['cancelOwnOrder']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['cancelOwnOrder']> {
    if (!auth?.user_id) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');
    return this.cancelOrderInternal(id, input, auth, correlation, false);
  }

  async cancelStoreOrder(
    id: string,
    input: OperationInputs['cancelStoreOrder']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['cancelStoreOrder']> {
    const storeId = requireStorePermission(auth, 'order.store.read_status_cancel');
    return this.cancelOrderInternal(id, input, auth, correlation, true, storeId);
  }

  private async cancelOrderInternal(
    id: string,
    input: OperationInputs['cancelOwnOrder']['body'],
    auth: any,
    correlation: string,
    isStore: boolean,
    storeId?: string
  ): Promise<OperationOutputs['cancelOwnOrder']> {
    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'id không hợp lệ.');
    }
    if (input?.expected_version === undefined || typeof input.expected_version !== 'number' || !Number.isInteger(input.expected_version)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'expected_version phải là số nguyên.');
    }
    if (input.reason !== undefined && typeof input.reason !== 'string') {
      throw new ApiError(422, 'VALIDATION_FAILED', 'reason không hợp lệ.');
    }
    if (input.reason && input.reason.length > 200) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Lý do hủy không được quá 200 ký tự.');
    }

    const cancelOpId = randomUUID();
    let originalStatus = '';
    let originalStoreId = '';
    let originalItems: OrderItemRow[] = [];
    let shouldRestock = false;
    let shouldRelease = false;

    const result = await database.transaction(async manager => {
      const repo = new OrderRepository(manager);
      const order = isStore
        ? await repo.lockStoreOrderById(id, storeId!)
        : await repo.lockCustomerOrderById(id, auth.user_id);

      if (!order) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Order.');
      }

      this.checkCancellation(order, input.expected_version);

      originalStatus = order.status;
      originalStoreId = order.store_id;
      originalItems = order.items ?? [];
      if (['PENDING', 'CONFIRMED'].includes(order.status)) {
        shouldRestock = true;
      } else if (order.status === 'AWAITING_PAYMENT') {
        shouldRelease = true;
      }

      const defaultReason = isStore ? 'Hủy bởi Cửa hàng' : 'Hủy bởi Khách hàng';
      const reason = input.reason?.trim() || defaultReason;

      const updated = await repo.updateOrderStatusWithHistory({
        order_id: id,
        from_status: order.status,
        to_status: 'CANCELLED',
        expected_version: input.expected_version,
        actor_user_id: auth.user_id,
        reason,
      });

      if (!updated) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản đơn hàng đã thay đổi.');
      }

      const payment = await repo.lockPaymentByOrderId(id);
      let paymentStatus = payment?.status;
      let refundStatus = order.refund_status;

      if (payment) {
        if (order.payment_method === 'SANDBOX' && payment.status === 'SUCCEEDED') {
          const refundResult = await this.payments(manager).requestRefund({
            order_id: id,
            payment_id: payment.id,
            amount_vnd: BigInt(payment.collected_vnd || payment.payable_vnd),
            operation_id: randomUUID(),
            correlation_id: correlation,
          });
          refundStatus = refundResult.status;
        } else if (payment.status === 'PENDING') {
          await manager.query("UPDATE payment SET status='CANCELLED', version=version+1 WHERE id=$1", [payment.id]);
          paymentStatus = 'CANCELLED';
          if (payment.method === 'COD') {
            await manager.query("UPDATE c_o_d_collection SET status='CANCELLED' WHERE order_id=$1 AND status='PENDING'", [id]);
          }
        }
      }

      await audit(
        manager,
        'M2',
        auth.user_id,
        'Order',
        id,
        'CANCEL_ORDER',
        correlation,
        { status: order.status, version: order.version },
        { status: updated.status, version: updated.version }
      );

      await emitEvent(
        manager,
        'OrderCancelled',
        {
          order_id: id,
          purchase_group_id: order.purchase_group_id,
          store_id: order.store_id,
          customer_user_id: order.customer_user_id,
          from_status: order.status,
          version: updated.version,
          reason,
        },
        correlation
      );

      return this.mapOrderRowToDto({
        ...updated,
        items: order.items,
        payment_status: paymentStatus,
        refund_status: refundStatus,
      });
    });

    if (shouldRestock && originalItems.length > 0) {
      try {
        await this.getInternalClients().call('RestockOrder', {
          operation_id: cancelOpId,
          order_id: id,
          items: originalItems.map(it => ({
            variant_id: it.variant_id,
            store_id: originalStoreId,
            quantity: it.quantity,
          })),
        }, correlation);
      } catch {
        // Handled/retried by worker
      }
    } else if (shouldRelease) {
      try {
        await this.getInternalClients().call('ReleaseReservation', {
          operation_id: cancelOpId,
          order_id: id,
          reservation_ids: [id],
          reason: 'ORDER_CANCELLED',
        }, correlation);
      } catch {
        // Handled/retried by worker
      }
    }

    return result;
  }

  private checkCancellation(order: OrderRow, version: number): void {
    if (order.version !== version) throw new ApiError(409, 'VERSION_CONFLICT', 'Order đã thay đổi.');
    if (!['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new ApiError(409, 'ORDER_CANNOT_BE_CANCELLED', 'Không thể hủy ở trạng thái này.');
    }
  }

  async collectCod(id:string,input:OperationInputs['collectCod']['body'],auth:any,_correlation:string):Promise<OperationOutputs['collectCod']> {
    const storeId=requireStorePermission(auth,'cod.store.collect');
    return database.transaction(async manager=>{
      const repo=new OrderRepository(manager),order=await repo.lockStoreOrderById(id,storeId);
      if(!order) throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
      if(order.version!==input.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
      if(order.status!=='SHIPPED' || order.payment_method!=='COD') throw new ApiError(409,'INVALID_STATE_TRANSITION','Chỉ thu COD cho đơn đang giao.');
      const payment=await repo.lockPaymentByOrderId(id);
      if(!payment || ['SUCCEEDED','CANCELLED'].includes(payment.status)) throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment không cho phép thu COD.');
      if(input.amount_collected_vnd!==moneyNumber(payment.collectible_vnd)) throw new ApiError(422,'COD_AMOUNT_MISMATCH','Phải thu đủ số tiền phải thu.');
      const result=await this.payments(manager).recordCodCollection({order_id:id,amount_vnd:BigInt(input.amount_collected_vnd),operation_id:randomUUID(),actor_user_id:auth.user_id,correlation_id:_correlation});
      if(result.status!=='SUCCEEDED' || result.order_id!==id || result.collected_vnd!==moneyNumber(payment.collectible_vnd)) throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment chưa xác nhận thu đủ COD.');
      const updated=await repo.incrementOrderVersion(id,input.expected_version);
      if(!updated) throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
      return this.mapOrderRowToDto({...updated,items:order.items,payment_status:result.status,refund_status:order.refund_status});
    });
  }

  async verifyReviewEligibility(
    input: OperationInputs['VerifyReviewEligibility']['body']
  ): Promise<OperationOutputs['VerifyReviewEligibility']> {
    const orderItemId = input?.order_item_id;
    const customerUserId = input?.customer_user_id;
    const productId = input?.product_id;

    if (!orderItemId || !UUID_REGEX.test(orderItemId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'order_item_id không hợp lệ.');
    }
    if (!customerUserId || !UUID_REGEX.test(customerUserId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'customer_user_id không hợp lệ.');
    }
    if (!productId || !UUID_REGEX.test(productId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'product_id không hợp lệ.');
    }

    const repo = new OrderRepository(database.manager);
    const item = await repo.findOrderItemEligibility(orderItemId);

    if (!item) {
      return {
        eligible: false,
        reason: 'Không tìm thấy mục đơn hàng tương ứng.',
      };
    }

    if (item.customer_user_id !== customerUserId) {
      return {
        eligible: false,
        reason: 'Mục đơn hàng không thuộc về khách hàng này.',
      };
    }

    if (item.product_id !== productId) {
      return {
        eligible: false,
        reason: 'Sản phẩm không khớp với mục đơn hàng.',
      };
    }

    if (item.order_status !== 'COMPLETED') {
      return {
        eligible: false,
        reason: `Đơn hàng chưa hoàn thành (trạng thái: ${item.order_status}).`,
      };
    }

    return {
      eligible: true,
    };
  }
}



