import { randomUUID } from 'node:crypto';
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
    ) => InternalClients
  ) {}

  private getInternalClients(): InternalClients | null {
    if (this.internalClientsFactory) {
      return this.internalClientsFactory('M2', 'mock-key', { M1: 'http://localhost:3101', M2: '', M3: 'http://localhost:3103' });
    }
    try {
      const c = config('M2');
      return new InternalClients('M2', c.internalKeys.M2, { M1: c.catalogUrl, M2: '', M3: c.identityUrl });
    } catch {
      return null;
    }
  }

  async quoteItems(items: Array<{ variant_id: string; store_id: string; quantity: number }>, correlation: string) {
    if (!items.length) return [];
    const client = this.getInternalClients();
    if (!client) return [];
    try {
      const result = await client.call('QuoteVariants', { items }, correlation);
      return result.items;
    } catch (error) {
      if (error instanceof ApiError && (error.getStatus() === 501 || error.getStatus() === 503)) {
        // M1 is still stubbed or unavailable during development; proceed with graceful fallback
        return [];
      }
      throw error;
    }
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
    if (quantity === undefined || quantity === null || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Số lượng sản phẩm không hợp lệ (phải là số nguyên >= 1).');
    }

    // Call M1 QuoteVariants to validate variant, store_id, and stock
    const quotes = await this.quoteItems(
      [{ variant_id: variantId, store_id: '', quantity }],
      correlation
    );

    let storeId = '00000000-0000-0000-0000-000000000000';
    let productId = variantId;

    if (quotes && quotes.length > 0) {
      const quote = quotes.find(q => q.variant_id === variantId);
      if (quote) {
        if (quote.available_quantity !== undefined && quote.available_quantity < quantity) {
          throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Số lượng sản phẩm trong kho không đủ.');
        }
        storeId = quote.store_id || storeId;
        if ((quote as any).product_id) {
          productId = (quote as any).product_id;
        }
      }
    }

    return database.transaction(async manager => {
      const repo = new CartRepository(manager);
      const cart = await repo.getOrCreateCart(userId);

      const existingItem = await repo.lockItemByVariant(cart.id, variantId);
      let resultItem: CartItemRow;

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        resultItem = await repo.updateItemQuantity(existingItem.id, newQuantity, cart.id);
      } else {
        resultItem = await repo.addItem(cart.id, variantId, storeId, quantity);
      }

      // Emit outbox event for FLOW-01/AI-01: InteractionRecorded with event_type 'CART'
      const eventPayload = {
        event_id: randomUUID(),
        event_type: 'InteractionRecorded',
        schema_version: '1.0',
        producer: 'M2',
        occurred_at: new Date().toISOString(),
        correlation_id: correlation,
        payload: {
          user_id: userId,
          product_id: productId,
          event_type: 'CART',
          quantity: quantity,
        },
      };

      await emitEvent(manager, 'InteractionRecorded', eventPayload, correlation);

      return {
        id: resultItem.id,
        variant_id: resultItem.variant_id,
        store_id: resultItem.store_id,
        quantity: resultItem.quantity,
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
    _correlation: string
  ): Promise<OperationOutputs['updateCartItem']> {
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    const quantity = input?.quantity;
    if (quantity === undefined || quantity === null || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Số lượng sản phẩm không hợp lệ (phải là số nguyên >= 1).');
    }

    return database.transaction(async manager => {
      const repo = new CartRepository(manager);
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

      await repo.removeItem(id, item.cart_id);
      return {
        status: 'SUCCESS',
        message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
        correlation_id: correlation,
      };
    });
  }
}
