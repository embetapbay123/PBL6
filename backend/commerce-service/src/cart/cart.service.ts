import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { CartRepository, CartItemRow } from './cart.repository';
import type { OperationOutputs } from '../../../shared/src/operations.generated';

export class CartService {
  constructor(private readonly internalClientsFactory?: (caller: 'M2', key: string, urls: Record<'M1'|'M2'|'M3', string>) => InternalClients) {}

  private getInternalClients() {
    if (this.internalClientsFactory) {
      const c = config('M2');
      return this.internalClientsFactory('M2', c.internalKeys.M2, { M1: c.catalogUrl, M2: '', M3: c.identityUrl });
    }
    const c = config('M2');
    return new InternalClients('M2', c.internalKeys.M2, { M1: c.catalogUrl, M2: '', M3: c.identityUrl });
  }

  async quoteItems(items: Array<{ variant_id: string; store_id: string; quantity: number }>, correlation: string) {
    if (!items.length) return [];
    try {
      const result = await this.getInternalClients().call('QuoteVariants', { items }, correlation);
      return result.items;
    } catch (error) {
      if (error instanceof ApiError && error.getStatus() === 501) {
        // M1 is still stubbed; return empty or proceed without quote during stubbing
        return [];
      }
      throw error;
    }
  }

  async list(query: { page?: number; size?: number }, auth: any, correlation: string): Promise<OperationOutputs['listCartItems']> {
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

  async update(id: string, input: { quantity: number }, auth: any, correlation: string): Promise<OperationOutputs['updateCartItem']> {
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

  async remove(id: string, auth: any, correlation: string): Promise<OperationOutputs['removeCartItem']> {
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
