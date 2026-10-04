import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';

export interface CartRow {
  id: string;
  customer_user_id: string;
  updated_at: Date;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  variant_id: string;
  store_id: string;
  quantity: number;
  added_at: Date;
}

export class CartRepository extends OwnedRepository {
  constructor(manager: EntityManager) {
    super(manager);
  }

  async getCartByCustomerId(customerUserId: string): Promise<CartRow | undefined> {
    const [cart] = await this.manager.query(
      'SELECT id, customer_user_id, updated_at FROM cart WHERE customer_user_id = $1',
      [customerUserId]
    );
    return cart;
  }

  async getOrCreateCart(customerUserId: string): Promise<CartRow> {
    const [existing] = await this.manager.query(
      'SELECT id, customer_user_id, updated_at FROM cart WHERE customer_user_id = $1',
      [customerUserId]
    );
    if (existing) return existing;

    const [created] = await this.manager.query(
      `INSERT INTO cart (id, customer_user_id, updated_at)
       VALUES (gen_random_uuid(), $1, NOW())
       ON CONFLICT (customer_user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at
       RETURNING id, customer_user_id, updated_at`,
      [customerUserId]
    );
    return created;
  }

  async pageItems(cartId: string, page: number, size: number): Promise<{ items: CartItemRow[]; total: number }> {
    const [countRow] = await this.manager.query(
      'SELECT count(*)::int AS total FROM cart_item WHERE cart_id = $1',
      [cartId]
    );
    const offset = (page - 1) * size;
    const items = await this.manager.query(
      `SELECT id, cart_id, variant_id, store_id, quantity, added_at
       FROM cart_item
       WHERE cart_id = $1
       ORDER BY added_at DESC, id ASC
       LIMIT $2 OFFSET $3`,
      [cartId, size, offset]
    );
    return { items, total: countRow?.total ?? 0 };
  }

  async findItemWithOwnership(itemId: string, customerUserId: string): Promise<CartItemRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT ci.id, ci.cart_id, ci.variant_id, ci.store_id, ci.quantity, ci.added_at
       FROM cart_item ci
       INNER JOIN cart c ON c.id = ci.cart_id
       WHERE ci.id = $1 AND c.customer_user_id = $2`,
      [itemId, customerUserId]
    );
    return row;
  }

  async lockItemWithOwnership(itemId: string, customerUserId: string): Promise<CartItemRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT ci.id, ci.cart_id, ci.variant_id, ci.store_id, ci.quantity, ci.added_at
       FROM cart_item ci
       INNER JOIN cart c ON c.id = ci.cart_id
       WHERE ci.id = $1 AND c.customer_user_id = $2
       FOR UPDATE OF ci`,
      [itemId, customerUserId]
    );
    return row;
  }

  async findItemByVariant(cartId: string, variantId: string): Promise<CartItemRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, cart_id, variant_id, store_id, quantity, added_at
       FROM cart_item
       WHERE cart_id = $1 AND variant_id = $2`,
      [cartId, variantId]
    );
    return row;
  }

  async lockItemByVariant(cartId: string, variantId: string): Promise<CartItemRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, cart_id, variant_id, store_id, quantity, added_at
       FROM cart_item
       WHERE cart_id = $1 AND variant_id = $2
       FOR UPDATE`,
      [cartId, variantId]
    );
    return row;
  }

  async addItem(cartId: string, variantId: string, storeId: string, quantity: number): Promise<CartItemRow> {
    const [created] = await this.manager.query(
      `INSERT INTO cart_item (id, cart_id, variant_id, store_id, quantity, added_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING id, cart_id, variant_id, store_id, quantity, added_at`,
      [cartId, variantId, storeId, quantity]
    );
    await this.manager.query(
      `UPDATE cart SET updated_at = NOW() WHERE id = $1`,
      [cartId]
    );
    return created;
  }

  async updateItemQuantity(itemId: string, quantity: number, cartId: string): Promise<CartItemRow> {
    const [updated] = await this.manager.query(
      `UPDATE cart_item
       SET quantity = $1
       WHERE id = $2
       RETURNING id, cart_id, variant_id, store_id, quantity, added_at`,
      [quantity, itemId]
    );
    await this.manager.query(
      `UPDATE cart SET updated_at = NOW() WHERE id = $1`,
      [cartId]
    );
    return updated;
  }

  async removeItem(itemId: string, cartId: string): Promise<void> {
    await this.manager.query(
      `DELETE FROM cart_item WHERE id = $1`,
      [itemId]
    );
    await this.manager.query(
      `UPDATE cart SET updated_at = NOW() WHERE id = $1`,
      [cartId]
    );
  }
}
