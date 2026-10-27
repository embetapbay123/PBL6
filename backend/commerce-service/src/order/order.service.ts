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
import {returnView} from './order-return.view';
import {shipmentView} from './shipment.view';
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
      cart_item_ids: [...input.cart_item_ids].sort(),
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
      purchase_group_id: order.purchase_group_id,
      store_id: order.store_id,
      status: order.status as any,
      version: order.version,
      ...(order.inventory_state?{inventory_state:order.inventory_state}:{}),
      ...(order.shipment?{shipment:shipmentView(order.shipment)}:{}),
      ...(order.status_history?{status_history:order.status_history.map(h=>({id:h.id,to_status:h.to_status,actor_user_id:h.actor_user_id,created_at:new Date(h.created_at).toISOString(),...(h.from_status==null?{}:{from_status:h.from_status}),...(h.reason==null?{}:{reason:h.reason})}))}:{}),
      ...(order.return_case?{return_case:returnView({...order.return_case,payment_method:order.payment_method,payment_status:order.payment_status,collected_vnd:order.collected_vnd,refunded_vnd:order.refunded_vnd,stock_state:order.inventory_state})}:{}),
      ...(order.created_at?{created_at:new Date(order.created_at).toISOString()}:{}),
      ...(order.address_snapshot?{address_snapshot:order.address_snapshot}:{}),
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

  async suggestVouchers(input:OperationInputs['suggestVouchers']['body'],auth:any,correlation:string):Promise<OperationOutputs['suggestVouchers']>{
    if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    const baseline=await this.quoteCheckout({...input,platform_voucher_code:undefined},auth,correlation);
    const rows=await this.source.query("SELECT * FROM voucher WHERE status='ACTIVE' AND starts_at<=now() AND ends_at>now() AND (scope='PLATFORM' OR store_id=ANY($1::uuid[])) ORDER BY ends_at,code LIMIT 101",[baseline.stores.map(s=>s.store_id)]);
    const items:OperationOutputs['suggestVouchers']['items']=[];const repo=new OrderRepository(this.source.manager);
    for(const row of rows.slice(0,100)){
      const goods=row.scope==='STORE'?baseline.stores.find(s=>s.store_id===row.store_id)!.amounts.goods_vnd:moneyNumber(baseline.stores.reduce((sum,s)=>sum+BigInt(s.amounts.goods_vnd)-BigInt(s.amounts.store_discount_vnd),0n));
      let reason='Có thể áp dụng';let eligible=true;
      if(goods<moneyNumber(row.min_goods_vnd)){eligible=false;reason='Đơn hàng chưa đạt mức tối thiểu';}
      else if(!await repo.voucherAvailable(row,auth.user_id)){eligible=false;reason='Đã hết lượt hoặc vượt giới hạn của bạn';}
      let discount=row.discount_type==='PERCENT'?BigInt(goods)*BigInt(row.discount_value)/100n:BigInt(row.discount_value);
      if(row.discount_type==='PERCENT'&&row.max_discount_vnd!=null&&discount>BigInt(row.max_discount_vnd))discount=BigInt(row.max_discount_vnd);
      if(discount>BigInt(goods))discount=BigInt(goods);
      items.push({voucher:{id:row.id,code:row.code,scope:row.scope,discount_type:row.discount_type,discount_value:moneyNumber(row.discount_value),min_goods_vnd:moneyNumber(row.min_goods_vnd),...(row.max_discount_vnd==null?{}:{max_discount_vnd:moneyNumber(row.max_discount_vnd)}),...(row.store_id==null?{}:{store_id:row.store_id}),starts_at:new Date(row.starts_at).toISOString(),ends_at:new Date(row.ends_at).toISOString(),usage_limit:row.usage_limit,per_customer_limit:row.per_customer_limit,status:row.status,version:row.version},eligible,reason,estimated_discount_vnd:eligible?moneyNumber(discount):0});
    }
    items.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.estimated_discount_vnd-a.estimated_discount_vnd||a.voucher.code.localeCompare(b.voucher.code));
    return {items,evaluated_at:new Date().toISOString(),truncated:rows.length>100};
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
    const snapshotHash = fingerprint(canonicalSnapshot);

    return { storeList, context, payable, platformVoucherId, snapshotHash };
  }

  async quoteCheckout(
    input: OperationInputs['quoteCheckout']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['quoteCheckout']> {
    const orderRepo = new OrderRepository(this.source.manager);
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
  }

  async confirmCheckout(input:OperationInputs['confirmCheckout']['body'],key:string|undefined,auth:any,correlation:string):Promise<OperationOutputs['confirmCheckout']> {
    if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    if(!key?.trim() || key.trim().length>200)throw new ApiError(422,'VALIDATION_FAILED','Idempotency-Key không hợp lệ.');
    const normalized={...input,cart_item_ids:[...input.cart_item_ids].sort()};
    try {
      return await this.checkoutRunner().confirm(auth.user_id,key.trim(),fingerprint(normalized),correlation,async()=>{
        const quote=await this.quoteStore.get(input.quote_id);
        if(!quote || quote.user_id!==auth.user_id)throw new ApiError(404,'QUOTE_NOT_FOUND','Không tìm thấy quote của Customer.');
        if(Date.parse(quote.expires_at)<=Date.now())throw new ApiError(409,'QUOTE_EXPIRED','Quote đã hết hạn.');
        if(quote.request_hash!==fingerprint(this.quoteInput(input)))throw new ApiError(409,'QUOTE_CHANGED','Nội dung khác quote.');
        const calculated=await this.revalidateQuote(input,auth,correlation,new OrderRepository(this.source.manager));
        if(calculated.snapshotHash!==quote.snapshot_hash || calculated.payable!==input.expected_payable_total_vnd)
          throw new ApiError(409,'QUOTE_CHANGED','Giá, tồn kho hoặc địa chỉ đã thay đổi; vui lòng tạo quote mới.');
        const storeIds=new Set(calculated.storeList.map(x=>x.store_id));
        if(Object.keys(input.payment_methods).length!==storeIds.size || Object.keys(input.payment_methods).some(x=>!storeIds.has(x)))
          throw new ApiError(422,'PAYMENT_SCOPE_MISMATCH','Phương thức thanh toán phải khớp đúng các Store đã chọn.');
        const purchaseGroupId=randomUUID();
        const storeOrders=calculated.storeList.map(store=>({ ...store,orderId:randomUUID(),paymentMethod:input.payment_methods[store.store_id],
          status:input.payment_methods[store.store_id]==='COD'?'PREPARING':'AWAITING_PAYMENT',
          paymentExpiresAt:input.payment_methods[store.store_id]==='COD'?null:quote.expires_at }));
        return {userId:auth.user_id,purchaseGroupId,correlation,input:normalized,storeOrders,context:calculated.context,payable:calculated.payable,platformVoucherId:calculated.platformVoucherId,
          reserve:{operation_id:commandId('reserve:'+purchaseGroupId),purchase_group_id:purchaseGroupId,expires_at:quote.expires_at,
            items:storeOrders.flatMap(store=>store.items.map(item=>({variant_id:item.variant_id,store_id:store.store_id,order_id:store.orderId,quantity:item.quantity})))}};
      });
    } catch(e) {if(e instanceof ApiError)throw e;throw recoveryPending();}
  }

  private async commitCheckout(plan:CheckoutPlan,result:any,manager:EntityManager):Promise<OperationOutputs['confirmCheckout']> {
    const repo=new OrderRepository(manager),{storeOrders,purchaseGroupId,userId}=plan;
    // A second key must not purchase a Cart snapshot already removed or edited by another checkout.
    await manager.query(`SELECT ci.id FROM cart_item ci JOIN cart c ON c.id=ci.cart_id
      WHERE ci.id=ANY($1::uuid[]) AND c.customer_user_id=$2 ORDER BY ci.id FOR UPDATE OF ci`,[plan.input.cart_item_ids,userId]);
    const current=await repo.findCartItemsWithOwnership(plan.input.cart_item_ids,userId);
    if(current.length!==plan.input.cart_item_ids.length || current.some(ci=>!plan.reserve.items.some(line=>line.variant_id===ci.variant_id && line.store_id===ci.store_id && line.quantity===ci.quantity)))
      throw new ApiError(409,'CART_CHANGED','Giỏ hàng đã thay đổi trong lúc xác nhận.');
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
      for(const item of store.items)await repo.createOrderItem({order_id:store.orderId,product_id:item.product_id,variant_id:item.variant_id,product_snapshot:{title:item.product_title},sku_snapshot:item.sku,
        unit_price_vnd:item.unit_price_vnd,quantity:item.quantity,line_total_vnd:item.line_total_vnd});
      await manager.query(`INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,reason,operation_id)
        VALUES($1,NULL,$2,$3,'ORDER_CREATED',$4)`,[store.orderId,store.status,userId,commandId('created:'+store.orderId)]);
      await this.payments(manager).createForOrder({order_id:store.orderId,method:store.paymentMethod,payable_vnd:BigInt(store.payable_vnd),operation_id:commandId('payment:'+store.orderId),correlation_id:plan.correlation});
      const ids=[...new Set<string>(result.reservations.filter((r:any)=>r.order_id===store.orderId).map((r:any)=>r.id))].sort();
      const items=store.items.map((x:any)=>({variant_id:x.variant_id,store_id:store.store_id,quantity:x.quantity}));
      await manager.query(`INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id)
        VALUES($1,$2,$3,'RESERVED',$4)`,[store.orderId,ids,JSON.stringify(items),plan.correlation]);
      if(store.paymentMethod==='COD')await queueInventoryCommand(manager,store.orderId,'CONSUME',plan.correlation);
      await audit(manager,'M2',userId,'Order',store.orderId,'CONFIRM_CHECKOUT',plan.correlation,{}, {status:store.status,payable_vnd:store.payable_vnd});
    }
    await voucherRepo.commitVoucherRedemptions(purchaseGroupId,redemptions);
    await repo.removeCartItems(plan.input.cart_item_ids,userId);
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
    query: OperationInputs['listOwnOrders']['query'],
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listOwnOrders']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new OrderRepository(this.source.manager);
    const { items, total } = await repo.pageCustomerOrders(userId, page, size,query);

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
    query: OperationInputs['listStoreOrders']['query'],
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
    const { items, total } = await repo.pageStoreOrders(storeId, page, size,query);

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
    if(input.shipment && toStatus!=='SHIPPED' || input.delivery_confirmation && toStatus!=='COMPLETED')throw new ApiError(422,'SHIPMENT_INPUT_CONFLICT','Thông tin giao nhận không khớp bước chuyển trạng thái.');
    if(toStatus==='SHIPPED' && (!input.shipment?.carrier_name.trim()||!input.shipment.tracking_code.trim()))throw new ApiError(422,'SHIPMENT_DETAILS_REQUIRED','Cần đơn vị giao hàng và mã vận chuyển hoặc reference giao thủ công.');

    return this.source.transaction(async manager => {
      const repo = new OrderRepository(manager);
      const order = await repo.lockStoreOrderById(id, storeId);
      if (!order) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong cửa hàng của bạn.');
      }

      const activeReturns=await manager.query("SELECT id FROM order_return WHERE order_id=$1 AND status IN ('REQUESTED','APPROVED')",[id]);
      if(activeReturns.length)throw new ApiError(409,'RETURN_IN_PROGRESS','Đơn đang được xử lý trả hàng.');
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
        if(input.delivery_confirmation?.confirmed!==true||!input.delivery_confirmation.note.trim())throw new ApiError(422,'DELIVERY_CONFIRMATION_REQUIRED','Cần xác nhận đã giao thành công kèm căn cứ giao nhận; đã nhận tiền không tự chứng minh đã giao.');
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

      if(toStatus==='SHIPPED') await repo.ship(id,input.shipment!,auth.user_id);
      if(toStatus==='COMPLETED') await repo.deliver(id,input.delivery_confirmation!.note,auth.user_id);
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
      if(!current)throw new Error('ORDER_DISAPPEARED_IN_TRANSACTION');
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
      const activeReturns=await manager.query("SELECT id FROM order_return WHERE order_id=$1 AND status IN ('REQUESTED','APPROVED')",[id]);
      if(activeReturns.length)throw new ApiError(409,'RETURN_IN_PROGRESS','Đơn đang trả về; không thu COD.');
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
    if (productId!==undefined && !UUID_REGEX.test(productId)) {
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

    if (productId!==undefined && item.product_id !== productId) {
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
      ...(productId===undefined?{product_id:item.product_id}:{}),
    };
  }
}



