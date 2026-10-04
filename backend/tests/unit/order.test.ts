import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { validateOperation } from '../../shared/src/request-contract';

const mockQuery = jest.fn<any>();

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

import { OrderService } from '../../commerce-service/src/order/order.service';

describe('Order Contract and DTO Validation (ORDER-01)', () => {
  const validPayload = {
    body: {
      cart_item_ids: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
      address_id: '33333333-3333-4333-8333-333333333333',
      payment_methods: {
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': 'SANDBOX' as const,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': 'COD' as const,
      },
      platform_voucher_code: 'PLATFORM10',
      store_vouchers: {
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': 'STORE5',
      },
    },
    path: {},
    query: {},
    headers: {},
  };

  test('quoteCheckout accepts valid request payload', () => {
    expect(() => validateOperation('quoteCheckout', validPayload)).not.toThrow();
  });

  test('quoteCheckout rejects empty cart_item_ids', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validPayload,
        body: {
          ...validPayload.body,
          cart_item_ids: [],
        },
      })
    ).toThrow();
  });

  test('quoteCheckout rejects invalid UUID in cart_item_ids', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validPayload,
        body: {
          ...validPayload.body,
          cart_item_ids: ['invalid-uuid'],
        },
      })
    ).toThrow();
  });

  test('quoteCheckout rejects invalid UUID in address_id', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validPayload,
        body: {
          ...validPayload.body,
          address_id: 'not-a-uuid',
        },
      })
    ).toThrow();
  });
});

describe('OrderService.quoteCheckout Business Logic', () => {
  let service: OrderService;
  const mockAuth = { user_id: 'user-customer-uuid-1' };
  const correlation = 'test-corr-order-01';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  test('throws 401 when unauthenticated', async () => {
    await expect(
      service.quoteCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: {},
        },
        null,
        correlation
      )
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  test('throws 404 when cart items do not belong to customer', async () => {
    mockQuery.mockResolvedValueOnce([]); // No cart items found

    await expect(
      service.quoteCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: {},
        },
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  test('calculates single-store quote without vouchers', async () => {
    const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cartItems = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'v1',
        store_id: storeId,
        quantity: 2,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        cart_id: 'c1',
        variant_id: 'v2',
        store_id: storeId,
        quantity: 1,
      },
    ];

    // Mock cart items query
    mockQuery.mockResolvedValueOnce(cartItems);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async (op: string) => {
        if (op === 'QuoteVariants') {
          return {
            items: [
              { variant_id: 'v1', store_id: storeId, quantity: 2, price_vnd: 50000, available_quantity: 10, version: 1 },
              { variant_id: 'v2', store_id: storeId, quantity: 1, price_vnd: 120000, available_quantity: 5, version: 1 },
            ],
          };
        }
        return {};
      }),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    const result = await customService.quoteCheckout(
      {
        cart_item_ids: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        address_id: '33333333-3333-4333-8333-333333333333',
        payment_methods: { [storeId]: 'SANDBOX' },
      },
      mockAuth,
      correlation
    );

    expect(result.quote_id).toBeDefined();
    expect(result.expires_at).toBeDefined();
    expect(result.stores).toHaveLength(1);

    const storeQuote = result.stores[0];
    expect(storeQuote.store_id).toBe(storeId);
    expect(storeQuote.amounts.goods_vnd).toBe(50000 * 2 + 120000 * 1); // 220,000 VND
    expect(storeQuote.amounts.store_discount_vnd).toBe(0);
    expect(storeQuote.amounts.platform_discount_vnd).toBe(0);
    expect(storeQuote.amounts.payable_vnd).toBe(220000);
    expect(result.payable_total_vnd).toBe(220000);
  });

  test('throws 409 when M1 reports insufficient stock', async () => {
    const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cartItems = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'v1',
        store_id: storeId,
        quantity: 5,
      },
    ];

    mockQuery.mockResolvedValueOnce(cartItems);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async (op: string) => {
        if (op === 'QuoteVariants') {
          return {
            items: [
              { variant_id: 'v1', store_id: storeId, quantity: 5, price_vnd: 50000, available_quantity: 2, version: 1 },
            ],
          };
        }
        return {};
      }),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    await expect(
      customService.quoteCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: { [storeId]: 'COD' },
        },
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'INSUFFICIENT_STOCK' },
    });
  });

  test('applies store voucher percentage discount with cap and min spend check', async () => {
    const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cartItems = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'v1',
        store_id: storeId,
        quantity: 2,
      },
    ];

    const storeVoucher = {
      id: 'vouch-1',
      code: 'STORE20',
      scope: 'STORE',
      store_id: storeId,
      discount_type: 'PERCENT',
      discount_value: '20', // 20%
      max_discount_vnd: '30000', // Capped at 30,000 VND
      min_goods_vnd: '100000', // Min spend 100,000 VND
      starts_at: new Date(Date.now() - 3600000),
      ends_at: new Date(Date.now() + 3600000),
      usage_limit: 100,
      status: 'ACTIVE',
    };

    // 1. cartItems query
    mockQuery.mockResolvedValueOnce(cartItems);
    // 2. store voucher lookup query
    mockQuery.mockResolvedValueOnce([storeVoucher]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          { variant_id: 'v1', store_id: storeId, quantity: 2, price_vnd: 100000, available_quantity: 10, version: 1 },
        ],
      })),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    const result = await customService.quoteCheckout(
      {
        cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
        address_id: '33333333-3333-4333-8333-333333333333',
        payment_methods: { [storeId]: 'SANDBOX' },
        store_vouchers: { [storeId]: 'STORE20' },
      },
      mockAuth,
      correlation
    );

    // goods_vnd = 200,000
    // 20% of 200,000 = 40,000, capped at max_discount_vnd 30,000
    const storeQuote = result.stores[0];
    expect(storeQuote.amounts.goods_vnd).toBe(200000);
    expect(storeQuote.amounts.store_discount_vnd).toBe(30000);
    expect(storeQuote.amounts.payable_vnd).toBe(170000);
    expect(result.payable_total_vnd).toBe(170000);
  });

  test('multi-store quoting with platform voucher distributed via Largest Remainder (BR-29)', async () => {
    const storeA = '11111111-1111-4111-8111-111111111111';
    const storeB = '22222222-2222-4222-8222-222222222222';

    const cartItems = [
      {
        id: 'aaaa1111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'va',
        store_id: storeA,
        quantity: 1,
      },
      {
        id: 'bbbb2222-2222-4222-8222-222222222222',
        cart_id: 'c1',
        variant_id: 'vb',
        store_id: storeB,
        quantity: 1,
      },
    ];

    const storeVoucherA = {
      id: 'vouch-sa',
      code: 'STOREA10',
      scope: 'STORE',
      store_id: storeA,
      discount_type: 'FIXED',
      discount_value: '10000',
      min_goods_vnd: '50000',
      starts_at: new Date(Date.now() - 3600000),
      ends_at: new Date(Date.now() + 3600000),
      usage_limit: 50,
      status: 'ACTIVE',
    };

    const platformVoucher = {
      id: 'vouch-plat',
      code: 'PBL6SALE30',
      scope: 'PLATFORM',
      store_id: null,
      discount_type: 'FIXED',
      discount_value: '30000', // Total 30,000 VND platform discount
      min_goods_vnd: '100000',
      starts_at: new Date(Date.now() - 3600000),
      ends_at: new Date(Date.now() + 3600000),
      usage_limit: 100,
      status: 'ACTIVE',
    };

    // 1. cartItems query
    mockQuery.mockResolvedValueOnce(cartItems);
    // 2. store A voucher query
    mockQuery.mockResolvedValueOnce([storeVoucherA]);
    // 3. platform voucher query
    mockQuery.mockResolvedValueOnce([platformVoucher]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          // Store A: 100,000 VND
          { variant_id: 'va', store_id: storeA, quantity: 1, price_vnd: 100000, available_quantity: 10, version: 1 },
          // Store B: 200,000 VND
          { variant_id: 'vb', store_id: storeB, quantity: 1, price_vnd: 200000, available_quantity: 10, version: 1 },
        ],
      })),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    const result = await customService.quoteCheckout(
      {
        cart_item_ids: [
          'aaaa1111-1111-4111-8111-111111111111',
          'bbbb2222-2222-4222-8222-222222222222',
        ],
        address_id: '33333333-3333-4333-8333-333333333333',
        payment_methods: {
          [storeA]: 'SANDBOX',
          [storeB]: 'COD',
        },
        store_vouchers: {
          [storeA]: 'STOREA10',
        },
        platform_voucher_code: 'PBL6SALE30',
      },
      mockAuth,
      correlation
    );

    // Calculations:
    // Store A goods = 100,000, store discount = 10,000 -> net goods A = 90,000
    // Store B goods = 200,000, store discount = 0 -> net goods B = 200,000
    // Total net goods = 290,000
    // Platform discount total = 30,000
    // Store A exact share: 30000 * (90000 / 290000) = 9310.3448... -> base 9310, remainder 0.3448
    // Store B exact share: 30000 * (200000 / 290000) = 20689.655... -> base 20689, remainder 0.655
    // Sum base = 9310 + 20689 = 29999. Remaining = 1 VND.
    // Store B has higher remainder (0.655 > 0.3448) -> Store B gets +1 -> 20690 VND
    // Store A gets 9310 VND
    // Payable A = 100000 - 10000 - 9310 = 80690
    // Payable B = 200000 - 0 - 20690 = 179310
    // Total payable = 80690 + 179310 = 260000

    expect(result.stores).toHaveLength(2);
    const quoteA = result.stores.find(s => s.store_id === storeA)!;
    const quoteB = result.stores.find(s => s.store_id === storeB)!;

    expect(quoteA.amounts.goods_vnd).toBe(100000);
    expect(quoteA.amounts.store_discount_vnd).toBe(10000);
    expect(quoteA.amounts.platform_discount_vnd).toBe(9310);
    expect(quoteA.amounts.payable_vnd).toBe(80690);

    expect(quoteB.amounts.goods_vnd).toBe(200000);
    expect(quoteB.amounts.store_discount_vnd).toBe(0);
    expect(quoteB.amounts.platform_discount_vnd).toBe(20690);
    expect(quoteB.amounts.payable_vnd).toBe(179310);

    expect(result.payable_total_vnd).toBe(260000);
  });

  test('throws 422 when store voucher min spend is not met', async () => {
    const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cartItems = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'v1',
        store_id: storeId,
        quantity: 1,
      },
    ];

    const storeVoucher = {
      id: 'vouch-1',
      code: 'STORE50',
      scope: 'STORE',
      store_id: storeId,
      discount_type: 'FIXED',
      discount_value: '50000',
      min_goods_vnd: '500000', // Requires 500,000 VND
      starts_at: new Date(Date.now() - 3600000),
      ends_at: new Date(Date.now() + 3600000),
      usage_limit: 100,
      status: 'ACTIVE',
    };

    mockQuery.mockResolvedValueOnce(cartItems);
    mockQuery.mockResolvedValueOnce([storeVoucher]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          { variant_id: 'v1', store_id: storeId, quantity: 1, price_vnd: 100000, available_quantity: 10, version: 1 },
        ],
      })),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    await expect(
      customService.quoteCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: { [storeId]: 'SANDBOX' },
          store_vouchers: { [storeId]: 'STORE50' },
        },
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VOUCHER_MIN_SPEND_NOT_MET' },
    });
  });

  test('throws 422 when voucher is expired', async () => {
    const storeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cartItems = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        cart_id: 'c1',
        variant_id: 'v1',
        store_id: storeId,
        quantity: 1,
      },
    ];

    const expiredVoucher = {
      id: 'vouch-1',
      code: 'EXPIRED10',
      scope: 'STORE',
      store_id: storeId,
      discount_type: 'PERCENT',
      discount_value: '10',
      min_goods_vnd: '10000',
      starts_at: new Date(Date.now() - 7200000),
      ends_at: new Date(Date.now() - 3600000), // Ended 1 hour ago
      usage_limit: 100,
      status: 'ACTIVE',
    };

    mockQuery.mockResolvedValueOnce(cartItems);
    mockQuery.mockResolvedValueOnce([expiredVoucher]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          { variant_id: 'v1', store_id: storeId, quantity: 1, price_vnd: 100000, available_quantity: 10, version: 1 },
        ],
      })),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    await expect(
      customService.quoteCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: { [storeId]: 'SANDBOX' },
          store_vouchers: { [storeId]: 'EXPIRED10' },
        },
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VOUCHER_EXPIRED' },
    });
  });
});
