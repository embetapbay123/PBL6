import { CatalogClient, CatalogDirectory } from '../catalog-client';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { emitEvent } from '../../../shared/src/events';
import { CartRepository, CartItemRow } from './cart.repository';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

export class CartService {
  constructor(
    private readonly internalClientsFactory?: (
      caller: 'M2',
      key: string,
      urls: Record<'M1' | 'M2' | 'M3', string>
    ) => InternalClients,
    private readonly catalog:CatalogDirectory=new CatalogClient(),
  ) {}

  private getInternalClients():InternalClients {
    if(this.internalClientsFactory) return this.internalClientsFactory('M2','test',{M1:'',M2:'',M3:''});
    const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});
  }
  async quoteItems(items:Array<{variant_id:string;store_id:string;quantity:number}>,correlation:string) {
    if (!items.length) return [];
    return (await this.getInternalClients().call('QuoteVariants',{items},correlation)).items;
  }

  async add(
    input: OperationInputs['addCartItem']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['addCartItem']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const variantId = input?.variant_id;
    if (!variantId || typeof variantId !== 'string') {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thiếu hoặc sai định dạng variant_id.');
    }

    const quantity = input?.quantity;
    if (quantity === undefined || quantity === null || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Số lượng sản phẩm không hợp lệ (phải là số nguyên >= 1).');
    }

    const product=await this.catalog.product(input.product_id,correlation);
    if (!product.variants.some(v=>v.id===variantId)) throw new ApiError(404,'VARIANT_NOT_FOUND','Variant không thuộc Product.');
    const quotes=await this.quoteItems([{variant_id:variantId,store_id:product.store_id,quantity}],correlation);
    const quote=quotes.find(q=>q.variant_id===variantId && q.store_id===product.store_id);
    if(!quote) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Quote không khớp Product/Store.');
    if(quote.available_quantity<quantity) throw new ApiError(409,'INSUFFICIENT_STOCK','Không đủ tồn khả dụng.');
    const storeId=product.store_id,productId=product.id;

    return database.transaction(async manager => {
      const repo = new CartRepository(manager);
      const cart = await repo.getOrCreateCart(userId);

      await repo.lockCart(cart.id);
      const existingItem = await repo.lockItemByVariant(cart.id, variantId);
      let resultItem: CartItemRow;

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (!Number.isSafeInteger(newQuantity) || newQuantity>2147483647) throw new ApiError(422,'VALIDATION_FAILED','Số lượng quá lớn.');
        if (newQuantity>quote.available_quantity) throw new ApiError(409,'INSUFFICIENT_STOCK','Tổng số lượng vượt tồn khả dụng.');
        resultItem = await repo.updateItemQuantity(existingItem.id, newQuantity, cart.id,productId,storeId);
      } else {
        resultItem = await repo.addItem(cart.id, variantId, storeId, quantity,productId);
      }

      // Emit outbox event for FLOW-01/AI-01: InteractionRecorded with event_type 'CART'
      const eventPayload={user_id:userId,product_id:productId,event_type:'CART',quantity};

      await emitEvent(manager, 'InteractionRecorded', eventPayload, correlation);

      return {
        id: resultItem.id,
        variant_id: resultItem.variant_id,
        store_id: resultItem.store_id,
        quantity: resultItem.quantity,
        ...(resultItem.product_id ? {product_id:resultItem.product_id}:{}),
      };
    });
  }

  async list(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listCartItems']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new CartRepository(database.manager);
    const cart = await repo.getOrCreateCart(userId);
    const { items, total } = await repo.pageItems(cart.id, page, size);

    return {
      items: items.map(item => ({
        id: item.id,
        variant_id: item.variant_id,
        store_id: item.store_id,
        quantity: item.quantity,
        ...(item.product_id ? {product_id:item.product_id}:{}),
      })),
      total,
      page,
      size,
    };
  }

  async update(
    id: string,
    input: { quantity: number },
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['updateCartItem']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const quantity = input?.quantity;
    if (quantity === undefined || quantity === null || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Số lượng sản phẩm không hợp lệ (phải là số nguyên >= 1).');
    }

    const source=await new CartRepository(database.manager).findItemWithOwnership(id,userId);
    if (!source) throw new ApiError(404,'NOT_FOUND','Không tìm thấy item trong giỏ.');
    const quotes=await this.quoteItems([{variant_id:source.variant_id,store_id:source.store_id,quantity}],correlation);
    const quote=quotes.find(q=>q.variant_id===source.variant_id && q.store_id===source.store_id);
    if (!quote || quote.available_quantity<quantity) throw new ApiError(409,'INSUFFICIENT_STOCK','Không đủ tồn khả dụng.');
    return database.transaction(async manager => {
      const repo = new CartRepository(manager);
      await repo.lockCart(source.cart_id);
      const item = await repo.lockItemWithOwnership(id, userId);
      if (!item) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm trong giỏ hàng.');
      }

      const updated = await repo.updateItemQuantity(id, quantity, item.cart_id);
      return {
        id: updated.id,
        variant_id: updated.variant_id,
        store_id: updated.store_id,
        quantity: updated.quantity,
        ...(updated.product_id ? {product_id:updated.product_id}:{}),
      };
    });
  }

  async remove(
    id: string,
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['removeCartItem']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    return database.transaction(async manager => {
      const repo = new CartRepository(manager);
      const item = await repo.findItemWithOwnership(id, userId);
      if (!item) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm trong giỏ hàng.');
      }

      await repo.lockCart(item.cart_id);
      await repo.removeItem(id, item.cart_id);
      return {
        status: 'SUCCESS',
        message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
        correlation_id: correlation,
      };
    });
  }
}
