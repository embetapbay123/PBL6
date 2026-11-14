import type {OrderSearch} from './order-search';
import {orderTimelineActor} from './order-timeline';
import {readReturnPolicy} from '../returns/return-policy';
import {DeliveryReturnRunner} from '../returns/delivery-return.runner';
import {ReturnsRunner} from '../returns/returns.runner';
import {assertDeliveryNotReturning} from '../returns/delivery-return-guards';
import { CheckoutRunner, CheckoutPlan, commandId, recoveryPending } from './checkout.runner';
import { OrderInventoryRunner, queueInventoryCommand, changeOrderStatus, requestClosedRefund } from './order-inventory.runner';
import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { moneyNumber } from '../../../shared/src/money';
import { fingerprint } from '../../../shared/src/idempotency';
import { CatalogClient, CatalogDirectory } from '../catalog-client';
import { requireStorePermission, accessToken } from '../scope';
import { PaymentService } from '../payment/payment.service';
import { PaymentPort } from '../payment/payment.port';
import { DataSource, EntityManager } from 'typeorm';
import { QuoteStore, RedisQuoteStore } from './quote-store';
import { emitEvent } from '../../../shared/src/events';
import { audit } from '../../../shared/src/audit';
import { VoucherRepository } from '../voucher/voucher.repository';
import { OrderRepository, OrderRow, OrderItemRow } from './order.repository';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { commandId as deterministicUuid } from './checkout.runner';

interface ProcessedItem {
  product_id: string;
  variant_id: string;
  product_title?: string;
  variant_title?: string;
  variant_values?: Record<string,unknown>;
  sku?: string;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
  available_quantity?: number;
  version?: number;
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
      source?: DataSource;
      catalog?: CatalogDirectory;
      quotes?: QuoteStore;
      payments?: (manager: EntityManager) => PaymentPort;
      vouchers?: (manager: EntityManager) => VoucherRepository;
    } = {},
  ) {
    this.quoteStore = dependencies.quotes ?? new RedisQuoteStore();
    this.catalog = dependencies.catalog ?? new CatalogClient();
  }

  private get source():DataSource { return this.dependencies.source ?? database; }
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
  private quoteInput(input: OperationInputs['quoteCheckout']['body']) {
    return {
      ...(input.source==='BUY_NOW'?{source:'BUY_NOW',buy_now:input.buy_now}:{cart_item_ids:[...input.cart_item_ids].sort()}),
      address_id: input.address_id,
      payment_methods: input.payment_methods
        ? Object.keys(input.payment_methods).sort().reduce((acc, k) => { acc[k] = input.payment_methods[k]; return acc; }, {} as any)
        : undefined,
      store_vouchers: input.store_vouchers
        ? Object.keys(input.store_vouchers).sort().reduce((acc, k) => { acc[k] = input.store_vouchers![k]; return acc; }, {} as any)
        : undefined,
      platform_voucher_code: input.platform_voucher_code,
    };
  }

  private mapOrderRowToDto(order: OrderRow & { items: OrderItemRow[] }): OperationOutputs['getOwnOrder'] {
    return {
      id: order.id,
      shipping_mode: order.shipping_mode ?? 'LEGACY_MANUAL',
      ...(order.shipping_delivered_at?{shipping_delivered_at:new Date(order.shipping_delivered_at).toISOString()}:{}),
      ...(order.created_at ? {created_at: new Date(order.created_at).toISOString()} : {}),
      ...(order.status_history ? {timeline: order.status_history.map(event => ({status: event.to_status,
        ...(event.from_status ? {from_status: event.from_status} : {}), occurred_at: new Date(event.created_at).toISOString(),
        actor_kind: orderTimelineActor(event,order.customer_user_id)}))} : {}),
      purchase_group_id: order.purchase_group_id,
      store_id: order.store_id,
      status: order.status as any,
      version: order.version,
      payment_method: order.payment_method as any,
      payment_status: order.payment_status ?? undefined,
      refund_status: order.refund_status ?? undefined,
      payment_expires_at: order.payment_expires_at ? new Date(order.payment_expires_at).toISOString() : undefined,
      ...(readReturnPolicy(order.return_policy_snapshot) ? {return_policy_snapshot:readReturnPolicy(order.return_policy_snapshot)!} : {}),
      ...(order.completed_at ? {completed_at:new Date(order.completed_at).toISOString()} : {}),
      ...(order.address_snapshot?{address_snapshot:order.address_snapshot}:{}),
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
    orderRepo: OrderRepository,
    buyNow?: {product_id:string;variant_id:string;quantity:number}
  ): Promise<{
    storeList: StoreCalculation[];
    totalPayableVnd: number;
    platformVoucherId?: string;
  }> {
    const direct=buyNow?await this.catalog.product(buyNow.product_id,correlation):undefined;
    if(direct&&(direct.status!=='ACTIVE'||direct.moderation_status!=='VISIBLE'||!direct.variants.some(v=>v.id===buyNow!.variant_id&&v.status==='ACTIVE')))
      throw new ApiError(409,'PRODUCT_NOT_AVAILABLE','Sản phẩm hoặc phân loại hiện không thể mua.');
    const cartItems = direct?[{id:'buy-now:'+buyNow!.variant_id,product_id:direct.id,store_id:direct.store_id,variant_id:buyNow!.variant_id,quantity:buyNow!.quantity}]:await orderRepo.findCartItemsWithOwnership(cartItemIds,userId);
    if (!direct && (new Set(cartItemIds).size!==cartItemIds.length || cartItems.length !== cartItemIds.length)) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Không tìm thấy một số sản phẩm trong giỏ hàng hoặc sản phẩm không thuộc quyền sở hữu của bạn.'
      );
    }

    cartItems.sort((a,b)=>a.store_id.localeCompare(b.store_id) || a.variant_id.localeCompare(b.variant_id));
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
    if(direct)products.set(direct.id,direct);
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
        product_id: product.id,
        product_title: product.title,
        variant_values: variant.variant_values ?? {},
        variant_title: Object.values(variant.variant_values ?? {}).map(value=>typeof value==='object'?JSON.stringify(value):String(value)).join(' / ') || 'Phân loại tiêu chuẩn',
        sku: variant.sku,
        variant_id: ci.variant_id,
        unit_price_vnd: unitPriceVnd,
        quantity: ci.quantity,
        line_total_vnd: lineTotalVnd,
        available_quantity: m1Quote.available_quantity,
        version: m1Quote.version,
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
          if (voucher.max_discount_vnd !== undefined && voucher.max_discount_vnd !== null) {
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
        if (voucher.max_discount_vnd !== undefined && voucher.max_discount_vnd !== null) {
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

  private validateSelection(input:OperationInputs['quoteCheckout']['body']) {
    if(input?.source==='BUY_NOW'){
      const line=input.buy_now;
      if('cart_item_ids' in input||!line||!UUID_REGEX.test(line.product_id)||!UUID_REGEX.test(line.variant_id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>2147483647)
        throw new ApiError(422,'VALIDATION_FAILED','Lựa chọn mua ngay không hợp lệ.');
      return;
    }
    if(input?.source!==undefined&&input.source!=='CART'||!input||'buy_now' in input||!Array.isArray(input.cart_item_ids)||!input.cart_item_ids.length||input.cart_item_ids.length>100||input.cart_item_ids.some(id=>!UUID_REGEX.test(id)))
      throw new ApiError(422,'VALIDATION_FAILED','Danh sách giỏ hàng không hợp lệ.');
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
    legacySnapshotHash: string;
  }> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    this.validateSelection(input);
    const cartItemIds = input.source==='BUY_NOW'?[]:input.cart_item_ids;

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
      orderRepo,
      input.source==='BUY_NOW'?input.buy_now:undefined
    );

    const context = await this.getInternalClients().call('ResolveCheckoutContext', {
      token: accessToken(auth),
      address_id: addressId,
      store_ids: storeList.map(s => s.store_id),
    }, correlation);

    // Canonical sorting of storeList and items for snapshot stability
    storeList.sort((a, b) => a.store_id.localeCompare(b.store_id));
    for (const store of storeList) {
      store.items.sort((a, b) => a.variant_id.localeCompare(b.variant_id));
    }

    const contextStores = Array.isArray(context?.stores)
      ? [...context.stores].sort((a: any, b: any) => (a.id ?? '').localeCompare(b.id ?? ''))
      : context?.stores;

    for (const store of storeList) {
      const snapshot = contextStores?.find((s: any) => s.id === store.store_id);
      if (!snapshot) throw new ApiError(503, 'DEPENDENCY_CONTRACT_INVALID', 'Lookup thiếu Store.');
      if(!snapshot.return_address || ['recipient_name','phone','line1','ward','district','city'].some(key=>typeof snapshot.return_address![key as keyof typeof snapshot.return_address]!=='string'||!snapshot.return_address![key as keyof typeof snapshot.return_address]!.trim()))throw new ApiError(409,'STORE_RETURN_ADDRESS_REQUIRED','Cửa hàng chưa hoàn thiện địa chỉ nhận trả để nhận đơn mới.');
      store.shipping_vnd = moneyNumber(snapshot.shipping_fee_vnd);
      store.payable_vnd = moneyNumber(BigInt(store.goods_vnd) - BigInt(store.store_discount_vnd) - BigInt(store.platform_discount_vnd) + BigInt(store.shipping_vnd));
    }

    const canonicalSnapshot = {
      stores: storeList.map(s => ({
        store_id: s.store_id,
        goods_vnd: s.goods_vnd,
        store_discount_vnd: s.store_discount_vnd,
        net_goods_vnd: s.net_goods_vnd,
        platform_discount_vnd: s.platform_discount_vnd,
        shipping_vnd: s.shipping_vnd,
        payable_vnd: s.payable_vnd,
        voucher_id: s.voucher_id,
        items: s.items.map(it => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          unit_price_vnd: it.unit_price_vnd,
          quantity: it.quantity,
          line_total_vnd: it.line_total_vnd,
          available_quantity: it.available_quantity,
          version: it.version,
        })),
      })),
      context: {
        address_snapshot: context?.address_snapshot,
        stores: contextStores,
      },
    };

    const payable = moneyNumber(storeList.reduce((sum, s) => sum + BigInt(s.payable_vnd), 0n));
    const legacySnapshotHash=fingerprint(canonicalSnapshot);
    const snapshotHash = fingerprint({...canonicalSnapshot,identity:storeList.map(s=>({store_id:s.store_id,items:s.items.map(it=>({product_id:it.product_id,variant_id:it.variant_id,title:it.product_title,sku:it.sku,variant_values:it.variant_values}))}))});

    return { storeList, context, payable, platformVoucherId, snapshotHash,legacySnapshotHash };
  }

  async quoteCheckout(
    input: OperationInputs['quoteCheckout']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['quoteCheckout']> {
    const orderRepo = new OrderRepository(this.source.manager);
    const { storeList, payable, snapshotHash, context } = await this.revalidateQuote(
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
      snapshot_version: 2,
      expires_at: expiresAt,
    });
    return {
      quote_id: quoteId,
      stores: storeList.map(store => ({
        store_id: store.store_id,
        ...(context.stores.find((row:any)=>row.id===store.store_id)?.return_address ? {return_policy_snapshot:{version:'PLATFORM_2026_10_30' as const,window_hours:168 as const,full_refund_includes_original_shipping:true as const,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED' as const,return_address:context.stores.find((row:any)=>row.id===store.store_id)!.return_address!}} : {}),
        amounts: {
          goods_vnd: store.goods_vnd,
          store_discount_vnd: store.store_discount_vnd,
          platform_discount_vnd: store.platform_discount_vnd,
          shipping_vnd: store.shipping_vnd,
          payable_vnd: store.payable_vnd,
        },
        items: store.items.map(({available_quantity,version,...item})=>item),
      })),
      payable_total_vnd: payable,
      expires_at: expiresAt,
    };
  }

  private checkoutRunner() {
    return new CheckoutRunner(this.source,(op,body,corr)=>this.getInternalClients().call(op,body,corr),
      (plan,reservations,manager)=>this.commitCheckout(plan,reservations,manager));
  }

  async recoverOrders() {
    await this.checkoutRunner().tick();
    await new OrderInventoryRunner(this.source,(op,body,corr)=>this.getInternalClients().call(op,body,corr)).tick();
    await new DeliveryReturnRunner(this.source,(op,body,corr)=>this.getInternalClients().call(op,body,corr)).tick();
    await new ReturnsRunner(this.source,(op,body,corr)=>this.getInternalClients().call(op,body,corr)).tick();
  }

  async confirmCheckout(input:OperationInputs['confirmCheckout']['body'],key:string|undefined,auth:any,correlation:string):Promise<OperationOutputs['confirmCheckout']> {
    if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    if(!key?.trim() || key.trim().length>200)throw new ApiError(422,'VALIDATION_FAILED','Idempotency-Key không hợp lệ.');
    this.validateSelection(input);
    const normalized=input.source==='BUY_NOW'?{...input}:{...input,cart_item_ids:[...input.cart_item_ids].sort()};
    try {
      return await this.checkoutRunner().confirm(auth.user_id,key.trim(),fingerprint(normalized),correlation,async()=>{
        const quote=await this.quoteStore.get(input.quote_id);
        if(!quote || quote.user_id!==auth.user_id)throw new ApiError(404,'QUOTE_NOT_FOUND','Không tìm thấy quote của Customer.');
        if(Date.parse(quote.expires_at)<=Date.now())throw new ApiError(409,'QUOTE_EXPIRED','Quote đã hết hạn.');
        if(quote.request_hash!==fingerprint(this.quoteInput(input)))throw new ApiError(409,'QUOTE_CHANGED','Nội dung khác quote.');
        const calculated=await this.revalidateQuote(input,auth,correlation,new OrderRepository(this.source.manager));
        if((quote.snapshot_version===2?calculated.snapshotHash:calculated.legacySnapshotHash)!==quote.snapshot_hash || calculated.payable!==input.expected_payable_total_vnd)
          throw new ApiError(409,'QUOTE_CHANGED','Giá, tồn kho hoặc địa chỉ đã thay đổi; vui lòng tạo quote mới.');
        const storeIds=new Set(calculated.storeList.map(x=>x.store_id));
        if(Object.keys(input.payment_methods).length!==storeIds.size || Object.keys(input.payment_methods).some(x=>!storeIds.has(x)))
          throw new ApiError(422,'PAYMENT_SCOPE_MISMATCH','Phương thức thanh toán phải khớp đúng các Store đã chọn.');
        const purchaseGroupId=randomUUID();
        const storeOrders=calculated.storeList.map(store=>({ ...store,orderId:randomUUID(),paymentMethod:input.payment_methods[store.store_id],
          status:input.payment_methods[store.store_id]==='COD'||store.payable_vnd===0?'PREPARING':'AWAITING_PAYMENT',
          paymentExpiresAt:input.payment_methods[store.store_id]==='COD'||store.payable_vnd===0?null:quote.expires_at }));
        return {userId:auth.user_id,purchaseGroupId,correlation,input:normalized,storeOrders,context:calculated.context,payable:calculated.payable,platformVoucherId:calculated.platformVoucherId,
          reserve:{operation_id:commandId('reserve:'+purchaseGroupId),purchase_group_id:purchaseGroupId,expires_at:quote.expires_at,
            items:storeOrders.flatMap(store=>store.items.map(item=>({variant_id:item.variant_id,store_id:store.store_id,order_id:store.orderId,quantity:item.quantity})))}};
      });
    } catch(e) {if(e instanceof ApiError)throw e;throw recoveryPending();}
  }

  private async commitCheckout(plan:CheckoutPlan,result:any,manager:EntityManager):Promise<OperationOutputs['confirmCheckout']> {
    const repo=new OrderRepository(manager),{storeOrders,purchaseGroupId,userId}=plan;
    // A second key must not purchase a Cart snapshot already removed or edited by another checkout.
    if(plan.input.source!=='BUY_NOW'){
      await manager.query(`SELECT ci.id FROM cart_item ci JOIN cart c ON c.id=ci.cart_id
        WHERE ci.id=ANY($1::uuid[]) AND c.customer_user_id=$2 ORDER BY ci.id FOR UPDATE OF ci`,[plan.input.cart_item_ids,userId]);
      const current=await repo.findCartItemsWithOwnership(plan.input.cart_item_ids,userId);
      if(current.length!==plan.input.cart_item_ids.length || current.some(ci=>!plan.reserve.items.some(line=>line.variant_id===ci.variant_id && line.store_id===ci.store_id && line.quantity===ci.quantity)))
        throw new ApiError(409,'CART_CHANGED','Giỏ hàng đã thay đổi trong lúc xác nhận.');
    }
    const voucherRepo=this.vouchers(manager),holds:any[]=[],redemptions:any[]=[];
    for(const store of storeOrders){
      if(store.voucher_id && store.store_discount_vnd>0){
        holds.push({voucher_id:store.voucher_id,purchase_group_id:purchaseGroupId,customer_user_id:userId,store_id:store.store_id,discount_vnd:store.store_discount_vnd,expires_at:new Date(plan.reserve.expires_at)});
        redemptions.push({voucher_id:store.voucher_id,order_id:store.orderId,customer_user_id:userId,discount_vnd:store.store_discount_vnd});
      }
      if(plan.platformVoucherId && store.platform_discount_vnd>0)redemptions.push({voucher_id:plan.platformVoucherId,order_id:store.orderId,customer_user_id:userId,discount_vnd:store.platform_discount_vnd});
    }
    const platformTotal=storeOrders.reduce((sum,x)=>sum+x.platform_discount_vnd,0);
    if(plan.platformVoucherId && platformTotal>0)holds.push({voucher_id:plan.platformVoucherId,purchase_group_id:purchaseGroupId,customer_user_id:userId,store_id:null,discount_vnd:platformTotal,expires_at:new Date(plan.reserve.expires_at)});
    holds.sort((a,b)=>a.voucher_id.localeCompare(b.voucher_id));
    for(const hold of holds)await voucherRepo.reserveVoucher(hold);
    for(const store of storeOrders){
      await repo.createOrder({id:store.orderId,purchase_group_id:purchaseGroupId,customer_user_id:userId,store_id:store.store_id,address_snapshot:plan.context.address_snapshot,
        status:store.status,payment_method:store.paymentMethod,payment_expires_at:store.paymentExpiresAt?new Date(store.paymentExpiresAt):null,
        goods_vnd:store.goods_vnd,store_discount_vnd:store.store_discount_vnd,platform_discount_vnd:store.platform_discount_vnd,shipping_vnd:store.shipping_vnd,payable_vnd:store.payable_vnd,version:0});
      const returnAddress=plan.context.stores.find((row:any)=>row.id===store.store_id)?.return_address;
      // Existing durable attempts prepared by the old writer remain legacy/case-by-case.
      if(returnAddress)await manager.query('UPDATE "order" SET return_policy_snapshot=$2 WHERE id=$1',[store.orderId,{version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:returnAddress}]);
      for(const item of store.items)await repo.createOrderItem({order_id:store.orderId,product_id:item.product_id,variant_id:item.variant_id,product_snapshot:{title:item.product_title,variant_values:item.variant_values,variant_title:item.variant_title},sku_snapshot:item.sku,
        unit_price_vnd:item.unit_price_vnd,quantity:item.quantity,line_total_vnd:item.line_total_vnd});
      await manager.query(`INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,reason,operation_id)
        VALUES($1,NULL,$2,$3,'ORDER_CREATED',$4)`,[store.orderId,store.status,userId,commandId('created:'+store.orderId)]);
      await this.payments(manager).createForOrder({order_id:store.orderId,method:store.paymentMethod,payable_vnd:BigInt(store.payable_vnd),operation_id:commandId('payment:'+store.orderId),correlation_id:plan.correlation});
      const ids=[...new Set<string>(result.reservations.filter((r:any)=>r.order_id===store.orderId).map((r:any)=>r.id))].sort();
      const items=store.items.map((x:any)=>({variant_id:x.variant_id,store_id:store.store_id,quantity:x.quantity}));
      await manager.query(`INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id)
        VALUES($1,$2,$3,'RESERVED',$4)`,[store.orderId,ids,JSON.stringify(items),plan.correlation]);
      if(store.paymentMethod==='COD'||store.payable_vnd===0)await queueInventoryCommand(manager,store.orderId,'CONSUME',plan.correlation);
      await audit(manager,'M2',userId,'Order',store.orderId,'CONFIRM_CHECKOUT',plan.correlation,{}, {status:store.status,payable_vnd:store.payable_vnd});
    }
    await voucherRepo.commitVoucherRedemptions(purchaseGroupId,redemptions);
    if(plan.input.source!=='BUY_NOW')await repo.removeCartItems(plan.input.cart_item_ids,userId);
    const orders=await repo.findOrdersByPurchaseGroupId(purchaseGroupId,userId);
    return {purchase_group_id:purchaseGroupId,order_ids:storeOrders.map(x=>x.orderId),orders:orders.map(o=>this.mapOrderRowToDto(o)),payable_total_vnd:plan.payable};
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

    const repo = new OrderRepository(this.source.manager);
    const ordersWithItems = await repo.findOrdersByPurchaseGroupId(purchaseGroupId, userId);

    if (!ordersWithItems.length) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Không tìm thấy nhóm đơn hàng hoặc nhóm đơn hàng không thuộc quyền sở hữu của bạn.'
      );
    }

    const orders: OperationOutputs['getPurchaseGroupOrders']['orders'] = ordersWithItems.map(this.mapOrderRowToDto);

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
    query: { page?: number; size?: number } & OrderSearch,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listOwnOrders']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new OrderRepository(this.source.manager);
    const { items, total } = await repo.pageCustomerOrders(userId, page, size, query);

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

    const repo = new OrderRepository(this.source.manager);
    const order = await repo.findCustomerOrderById(id, userId);
    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng hoặc đơn hàng không thuộc quyền sở hữu của bạn.');
    }

    return this.mapOrderRowToDto(order);
  }

  async listStoreOrders(
    query: { page?: number; size?: number } & OrderSearch,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listStoreOrders']> {
    const storeId = requireStorePermission(auth,'order.store.read_status_cancel');
    if (!storeId) {
      throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập đơn hàng của cửa hàng.');
    }

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new OrderRepository(this.source.manager);
    const { items, total } = await repo.pageStoreOrders(storeId, page, size, query);

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

    const repo = new OrderRepository(this.source.manager);
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

    return this.source.transaction(async manager => {
      const repo = new OrderRepository(manager);
      const order = await repo.lockStoreOrderById(id, storeId);
      if (!order) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong cửa hàng của bạn.');
      }

      if (order.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản đơn hàng không khớp (xung đột dữ liệu).');
      }

      await assertDeliveryNotReturning(manager,id);
      if(['GHN','PLATFORM'].includes(order.shipping_mode??'')&&['SHIPPED','COMPLETED'].includes(toStatus))throw new ApiError(409,'CARRIER_MANAGED_ORDER','Trạng thái giao hàng được xác nhận bởi hãng vận chuyển.');
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

      const current=await repo.findStoreOrderById(id,storeId);
      if(!current)throw new ApiError(409,'ORDER_STATE_CONFLICT','Không đọc được Order sau khi cập nhật.');
      return this.mapOrderRowToDto(current);
    });
  }

  async cancelOwnOrder(id:string,input:OperationInputs['cancelOwnOrder']['body'],auth:any,correlation:string):Promise<OperationOutputs['cancelOwnOrder']> {
    if(!auth?.user_id) throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    return this.cancelOrder(id,input,auth,correlation);
  }

  async cancelStoreOrder(id:string,input:OperationInputs['cancelStoreOrder']['body'],auth:any,correlation:string):Promise<OperationOutputs['cancelStoreOrder']> {
    const storeId=requireStorePermission(auth,'order.store.read_status_cancel');
    return this.cancelOrder(id,input,auth,correlation,storeId);
  }
  private async cancelOrder(id:string,input:OperationInputs['cancelOwnOrder']['body'],auth:any,correlation:string,storeId?:string):Promise<OperationOutputs['cancelOwnOrder']> {
    if(!UUID_REGEX.test(id) || !Number.isInteger(input?.expected_version) || input.expected_version<0 ||
      input.reason!==undefined && (typeof input.reason!=='string' || input.reason.length>200))
      throw new ApiError(422,'VALIDATION_FAILED','Yêu cầu hủy không hợp lệ.');
    return this.source.transaction(async manager=>{
      const repo=new OrderRepository(manager);
      const order=storeId?await repo.lockStoreOrderById(id,storeId):await repo.lockCustomerOrderById(id,auth.user_id);
      if(!order) throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
      this.checkCancellation(order,input.expected_version);
      const payment=await repo.lockPaymentByOrderId(id);
      if(!payment)throw new ApiError(409,'PAYMENT_CONTEXT_MISSING','Order thiếu Payment; cần đối soát.');
      const uncertain=await manager.query("SELECT id FROM payment_attempt WHERE payment_id=$1 AND status='UNKNOWN'",[payment.id]);
      if(uncertain.length)throw new ApiError(409,'PAYMENT_RECONCILIATION_REQUIRED','Giao dịch chưa rõ kết quả; cần đối soát trước khi hủy.');
      if(payment.method==='COD' && (payment.status==='SUCCEEDED' || BigInt(payment.collected_vnd)>0n))
        throw new ApiError(409,'COD_ALREADY_COLLECTED','Đơn đã thu COD cần đối soát hoàn tiền.');
      const [stock]=await manager.query('SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE',[id]);
      if(!stock)throw new ApiError(409,'INVENTORY_CONTEXT_MISSING','Order thiếu reservation thực; cần đối soát.');
      const reason=input.reason?.trim() || (storeId?'STORE_CANCELLED':'CUSTOMER_CANCELLED');
      const updated=await changeOrderStatus(manager,order,'CANCELLED',reason,correlation,auth.user_id);
      await requestClosedRefund(manager,updated,payment,correlation);
      // Never overwrite an uncertain Consume: first replay it, then Restock if it applied.
      if(!stock.command_kind){
        if(stock.state==='RESERVED')await queueInventoryCommand(manager,id,'RELEASE',correlation);
        else if(stock.state==='CONSUMED')await queueInventoryCommand(manager,id,'RESTOCK',correlation);
      }
      await this.vouchers(manager).releaseVoucherReservations(order.purchase_group_id);
      const current=storeId?await repo.findStoreOrderById(id,storeId):await repo.findCustomerOrderById(id,auth.user_id);
      if(!current)throw new ApiError(409,'ORDER_STATE_CONFLICT','Không đọc được Order sau khi hủy.');
      return this.mapOrderRowToDto(current);
    });
  }
  private checkCancellation(order:OrderRow,version:number):void {
    if(order.version!==version) throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
    if(!['AWAITING_PAYMENT','PENDING','CONFIRMED'].includes(order.status)) throw new ApiError(409,'ORDER_CANNOT_BE_CANCELLED','Không thể hủy ở trạng thái này.');
  }

  async collectCod(id:string,input:OperationInputs['collectCod']['body'],auth:any,_correlation:string):Promise<OperationOutputs['collectCod']> {
    const storeId=requireStorePermission(auth,'cod.store.collect');
    return this.source.transaction(async manager=>{
      const repo=new OrderRepository(manager),order=await repo.lockStoreOrderById(id,storeId);
      if(!order) throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
      if(order.version!==input.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
      if(['GHN','PLATFORM'].includes(order.shipping_mode??''))throw new ApiError(409,'CARRIER_MANAGED_COD','Nền tảng đối soát COD từ hãng vận chuyển.');
      if(BigInt(order.payable_vnd)===0n)throw new ApiError(409,'PAYMENT_NOT_REQUIRED','Đơn 0đ không cần thu tiền.');
      if(order.status!=='SHIPPED' || order.payment_method!=='COD') throw new ApiError(409,'INVALID_STATE_TRANSITION','Chỉ thu COD cho đơn đang giao.');
      const payment=await repo.lockPaymentByOrderId(id);
      if(!payment || ['SUCCEEDED','CANCELLED'].includes(payment.status)) throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment không cho phép thu COD.');
      if(input.amount_collected_vnd!==moneyNumber(payment.collectible_vnd)) throw new ApiError(422,'COD_AMOUNT_MISMATCH','Phải thu đủ số tiền phải thu.');
      const result=await this.payments(manager).recordCodCollection({order_id:id,amount_vnd:BigInt(input.amount_collected_vnd),operation_id:randomUUID(),actor_user_id:auth.user_id,correlation_id:_correlation});
      if(result.status!=='SUCCEEDED' || result.order_id!==id || result.collected_vnd!==moneyNumber(payment.collectible_vnd)) throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment chưa xác nhận thu đủ COD.');
      const updated=await repo.incrementOrderVersion(id,input.expected_version);
      if(!updated) throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
      const current=await repo.findStoreOrderById(id,storeId);
      if(!current)throw new ApiError(409,'ORDER_STATE_CONFLICT','Không đọc được Order sau khi xác nhận COD.');
      return this.mapOrderRowToDto(current);
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
    if (productId !== undefined && !UUID_REGEX.test(productId)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'product_id không hợp lệ.');
    }

    const repo = new OrderRepository(this.source.manager);
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

    if (productId !== undefined && item.product_id !== productId) {
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
      ...(productId === undefined ? {product_id:item.product_id} : {}),
    };
  }
}
