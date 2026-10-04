import { validateOperation } from '../../shared/src/request-contract';

const mockQuery = jest.fn();

jest.mock('../../shared/src/database', () => {
  return {
    database: {
      get manager() {
        return { query: mockQuery };
      },
      transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => {
        return cb({ query: mockQuery });
      }),
    },
  };
});

import { CartService } from '../../commerce-service/src/cart/cart.service';

describe('Cart Contract and DTO Validation', () => {
  test('listCartItems accepts valid query and supplies defaults', () => {
    const validated = validateOperation('listCartItems', {
      query: {},
      path: {},
      headers: {},
    });
    expect(validated.query).toEqual({ page: 1, size: 20 });
  });

  test('listCartItems respects custom pagination limits', () => {
    const validated = validateOperation('listCartItems', {
      query: { page: '3' as any, size: '50' as any },
      path: {},
      headers: {},
    });
    expect(validated.query).toEqual({ page: 3, size: 50 });

    // size > 100 should throw
    expect(() =>
      validateOperation('listCartItems', {
        query: { size: 101 },
        path: {},
        headers: {},
      })
    ).toThrow();
  });

  test('updateCartItem validates quantity >= 1 and rejects <= 0 or invalid formats', () => {
    const validPayload = {
      path: { id: '11111111-1111-4111-8111-111111111111' },
      body: { quantity: 5 },
      query: {},
      headers: {},
    };
    expect(() => validateOperation('updateCartItem', validPayload)).not.toThrow();

    for (const invalidQuantity of [0, -1, '5', null, 1.5]) {
      expect(() =>
        validateOperation('updateCartItem', {
          ...validPayload,
          body: { quantity: invalidQuantity as any },
        })
      ).toThrow();
    }
  });

  test('removeCartItem validates UUID in path', () => {
    expect(() =>
      validateOperation('removeCartItem', {
        path: { id: '11111111-1111-4111-8111-111111111111' },
        query: {},
        headers: {},
      })
    ).not.toThrow();

    expect(() =>
      validateOperation('removeCartItem', {
        path: { id: 'not-a-uuid' },
        query: {},
        headers: {},
      })
    ).toThrow();
  });
});

describe('CartService Business Logic & Ownership Isolation (BR-05)', () => {
  const customerA = { user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', roles: ['CUSTOMER'] };
  const customerB = { user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', roles: ['CUSTOMER'] };
  const correlation = 'test-correlation-id';

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('list rejects unauthenticated requests', async () => {
    const service = new CartService();
    await expect(service.list({}, null, correlation)).rejects.toMatchObject({
      status: 401,
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  test('list returns paginated items for customer', async () => {
    const service = new CartService();
    const cartId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    // 1. getOrCreateCart query -> existing cart
    mockQuery.mockResolvedValueOnce([{ id: cartId, customer_user_id: customerA.user_id, updated_at: new Date() }]);
    // 2. count total query
    mockQuery.mockResolvedValueOnce([{ total: 1 }]);
    // 3. page items query
    mockQuery.mockResolvedValueOnce([
      {
        id: 'item-1111-1111-4111-8111-111111111111',
        cart_id: cartId,
        variant_id: 'variant-1111-1111-4111-8111-111111111111',
        store_id: 'store-1111-1111-4111-8111-111111111111',
        quantity: 2,
        added_at: new Date(),
      },
    ]);

    const result = await service.list({ page: 1, size: 20 }, customerA, correlation);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'item-1111-1111-4111-8111-111111111111',
      variant_id: 'variant-1111-1111-4111-8111-111111111111',
      store_id: 'store-1111-1111-4111-8111-111111111111',
      quantity: 2,
    });
  });

  test('update rejects invalid quantity', async () => {
    const service = new CartService();
    await expect(service.update('item-id', { quantity: 0 }, customerA, correlation)).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('update rejects when item belongs to another customer (Customer B cannot update Customer A item)', async () => {
    const service = new CartService();
    // lockItemWithOwnership returns undefined because customer_user_id does not match
    mockQuery.mockResolvedValueOnce([]);

    await expect(
      service.update('item-a-id', { quantity: 3 }, customerB, correlation)
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  test('update successfully updates quantity when customer owns item', async () => {
    const service = new CartService();
    const itemId = 'item-a-id';
    const cartId = 'cart-a-id';

    // 1. lockItemWithOwnership returns found row
    mockQuery.mockResolvedValueOnce([
      {
        id: itemId,
        cart_id: cartId,
        variant_id: 'var-1',
        store_id: 'store-1',
        quantity: 2,
        added_at: new Date(),
      },
    ]);
    // 2. updateItemQuantity returns updated row
    mockQuery.mockResolvedValueOnce([
      {
        id: itemId,
        cart_id: cartId,
        variant_id: 'var-1',
        store_id: 'store-1',
        quantity: 5,
        added_at: new Date(),
      },
    ]);
    // 3. update cart.updated_at
    mockQuery.mockResolvedValueOnce([]);

    const result = await service.update(itemId, { quantity: 5 }, customerA, correlation);
    expect(result).toEqual({
      id: itemId,
      variant_id: 'var-1',
      store_id: 'store-1',
      quantity: 5,
    });
  });

  test('remove rejects when item does not exist or belongs to another customer', async () => {
    const service = new CartService();
    // findItemWithOwnership returns empty
    mockQuery.mockResolvedValueOnce([]);

    await expect(service.remove('item-other-id', customerA, correlation)).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  test('remove successfully deletes item and returns OperationResult', async () => {
    const service = new CartService();
    const itemId = 'item-to-remove';
    const cartId = 'cart-a-id';

    // 1. findItemWithOwnership returns row
    mockQuery.mockResolvedValueOnce([
      {
        id: itemId,
        cart_id: cartId,
        variant_id: 'var-1',
        store_id: 'store-1',
        quantity: 1,
        added_at: new Date(),
      },
    ]);
    // 2. delete query
    mockQuery.mockResolvedValueOnce([]);
    // 3. update cart query
    mockQuery.mockResolvedValueOnce([]);

    const result = await service.remove(itemId, customerA, correlation);
    expect(result).toEqual({
      status: 'SUCCESS',
      message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
      correlation_id: correlation,
    });
  });
});
