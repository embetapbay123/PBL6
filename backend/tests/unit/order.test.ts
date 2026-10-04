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

describe('Order Contract and DTO Validation (ORDER-01, ORDER-02 & ORDER-03)', () => {
  const validQuotePayload = {
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
    expect(() => validateOperation('quoteCheckout', validQuotePayload)).not.toThrow();
  });

  test('quoteCheckout rejects empty cart_item_ids', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validQuotePayload,
        body: {
          ...validQuotePayload.body,
          cart_item_ids: [],
        },
      })
    ).toThrow();
  });

  test('quoteCheckout rejects invalid UUID in cart_item_ids', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validQuotePayload,
        body: {
          ...validQuotePayload.body,
          cart_item_ids: ['invalid-uuid'],
        },
      })
    ).toThrow();
  });

  test('quoteCheckout rejects invalid UUID in address_id', () => {
    expect(() =>
      validateOperation('quoteCheckout', {
        ...validQuotePayload,
        body: {
          ...validQuotePayload.body,
          address_id: 'not-a-uuid',
        },
      })
    ).toThrow();
  });

  const validConfirmPayload = {
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
      quote_id: '44444444-4444-4444-8444-444444444444',
      expected_payable_total_vnd: 250000,
    },
    path: {},
    query: {},
    headers: {
      'idempotency-key': 'idem-key-12345',
    },
  };

  test('confirmCheckout accepts valid request payload and headers', () => {
    expect(() => validateOperation('confirmCheckout', validConfirmPayload)).not.toThrow();
  });

  test('confirmCheckout rejects missing idempotency-key header', () => {
    expect(() =>
      validateOperation('confirmCheckout', {
        ...validConfirmPayload,
        headers: {} as any,
      })
    ).toThrow();
  });

  test('getPurchaseGroupOrders accepts valid path UUID', () => {
    expect(() =>
      validateOperation('getPurchaseGroupOrders', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('getPurchaseGroupOrders rejects invalid UUID path', () => {
    expect(() =>
      validateOperation('getPurchaseGroupOrders', {
        path: { id: 'invalid-id' },
        query: {},
        headers: {},
      })
    ).toThrow();
  });

  test('listOwnOrders accepts valid query parameters', () => {
    expect(() =>
      validateOperation('listOwnOrders', {
        path: {},
        query: { page: 1, size: 20 },
        headers: {},
      })
    ).not.toThrow();
  });

  test('getOwnOrder accepts valid UUID path', () => {
    expect(() =>
      validateOperation('getOwnOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('getOwnOrder rejects invalid UUID path', () => {
    expect(() =>
      validateOperation('getOwnOrder', {
        path: { id: 'invalid-order-uuid' },
        query: {},
        headers: {},
      })
    ).toThrow();
  });

  test('listStoreOrders accepts valid query parameters', () => {
    expect(() =>
      validateOperation('listStoreOrders', {
        path: {},
        query: { page: 2, size: 10 },
        headers: {},
      })
    ).not.toThrow();
  });

  test('getStoreOrder accepts valid UUID path', () => {
    expect(() =>
      validateOperation('getStoreOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('getStoreOrder rejects invalid UUID path', () => {
    expect(() =>
      validateOperation('getStoreOrder', {
        path: { id: 'invalid-store-order-uuid' },
        query: {},
        headers: {},
      })
    ).toThrow();
  });
});

describe('OrderService.quoteCheckout Business Logic (ORDER-01)', () => {
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
    expect(storeQuote.amounts.goods_vnd).toBe(220000);
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
      discount_value: '20',
      max_discount_vnd: '30000',
      min_goods_vnd: '100000',
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
      discount_value: '30000',
      min_goods_vnd: '100000',
      starts_at: new Date(Date.now() - 3600000),
      ends_at: new Date(Date.now() + 3600000),
      usage_limit: 100,
      status: 'ACTIVE',
    };

    mockQuery.mockResolvedValueOnce(cartItems);
    mockQuery.mockResolvedValueOnce([storeVoucherA]);
    mockQuery.mockResolvedValueOnce([platformVoucher]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          { variant_id: 'va', store_id: storeA, quantity: 1, price_vnd: 100000, available_quantity: 10, version: 1 },
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
      min_goods_vnd: '500000',
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
      ends_at: new Date(Date.now() - 3600000),
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

describe('OrderService.confirmCheckout Business Logic (ORDER-02)', () => {
  let service: OrderService;
  const mockAuth = { user_id: 'user-customer-uuid-1' };
  const correlation = 'test-corr-order-02';
  const idempotencyKey = 'idem-key-batch-001';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  test('throws 401 when unauthenticated', async () => {
    await expect(
      service.confirmCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: {},
          quote_id: '44444444-4444-4444-8444-444444444444',
          expected_payable_total_vnd: 100000,
        },
        idempotencyKey,
        null,
        correlation
      )
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  test('throws 400 when idempotency-key header is missing', async () => {
    await expect(
      service.confirmCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: {},
          quote_id: '44444444-4444-4444-8444-444444444444',
          expected_payable_total_vnd: 100000,
        },
        '',
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'BAD_REQUEST' },
    });
  });

  test('replays saved response on exact same idempotency key and payload (BR-19)', async () => {
    const payload = {
      cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
      address_id: '33333333-3333-4333-8333-333333333333',
      payment_methods: {},
      quote_id: '44444444-4444-4444-8444-444444444444',
      expected_payable_total_vnd: 100000,
    };

    const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const cachedResponse = {
      purchase_group_id: 'pg-12345',
      order_ids: ['order-12345'],
      orders: [],
      payable_total_vnd: 100000,
    };

    mockQuery.mockResolvedValueOnce([
      {
        id: 'idem-rec-1',
        customer_user_id: mockAuth.user_id,
        key: idempotencyKey,
        payload_hash: payloadHash,
        purchase_group_id: 'pg-12345',
        response_json: cachedResponse,
        expires_at: new Date(Date.now() + 86400000),
      },
    ]);

    const result = await service.confirmCheckout(payload, idempotencyKey, mockAuth, correlation);
    expect(result).toEqual(cachedResponse);
  });

  test('throws 409 conflict when same idempotency key is used with different payload (BR-19)', async () => {
    const payload = {
      cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
      address_id: '33333333-3333-4333-8333-333333333333',
      payment_methods: {},
      quote_id: '44444444-4444-4444-8444-444444444444',
      expected_payable_total_vnd: 100000,
    };

    mockQuery.mockResolvedValueOnce([
      {
        id: 'idem-rec-1',
        customer_user_id: mockAuth.user_id,
        key: idempotencyKey,
        payload_hash: 'different-hash',
        purchase_group_id: 'pg-old',
        response_json: {},
        expires_at: new Date(Date.now() + 86400000),
      },
    ]);

    await expect(
      service.confirmCheckout(payload, idempotencyKey, mockAuth, correlation)
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'IDEMPOTENCY_CONFLICT' },
    });
  });

  test('throws 409 when expected total does not match calculated total (BR-18, BR-31)', async () => {
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

    // 1. Idempotency check -> not found
    mockQuery.mockResolvedValueOnce([]);
    // 2. cartItems query
    mockQuery.mockResolvedValueOnce(cartItems);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async () => ({
        items: [
          { variant_id: 'v1', store_id: storeId, quantity: 2, price_vnd: 50000, available_quantity: 10, version: 1 },
        ],
      })),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    // Actual total is 100,000 VND (50,000 * 2), but expected is 90,000 VND
    await expect(
      customService.confirmCheckout(
        {
          cart_item_ids: ['11111111-1111-4111-8111-111111111111'],
          address_id: '33333333-3333-4333-8333-333333333333',
          payment_methods: { [storeId]: 'COD' },
          quote_id: '44444444-4444-4444-8444-444444444444',
          expected_payable_total_vnd: 90000,
        },
        idempotencyKey,
        mockAuth,
        correlation
      )
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'PRICE_CHANGED' },
    });
  });

  test('successfully confirms multi-store checkout with independent orders and payments', async () => {
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

    // 1. Idempotency query -> not found
    mockQuery.mockResolvedValueOnce([]);
    // 2. cartItems query for quote calculation
    mockQuery.mockResolvedValueOnce(cartItems);

    // 3. inside transaction:
    // createOrder A
    mockQuery.mockResolvedValueOnce([
      {
        id: 'order-a-id',
        purchase_group_id: 'pg-id',
        customer_user_id: mockAuth.user_id,
        store_id: storeA,
        address_snapshot: {},
        status: 'AWAITING_PAYMENT',
        payment_method: 'SANDBOX',
        payment_expires_at: new Date(Date.now() + 900000),
        goods_vnd: '100000',
        store_discount_vnd: '0',
        platform_discount_vnd: '0',
        shipping_vnd: '0',
        payable_vnd: '100000',
        version: 1,
        created_at: new Date(),
      },
    ]);
    // createOrderItem A
    mockQuery.mockResolvedValueOnce([]);
    // createPayment A
    mockQuery.mockResolvedValueOnce([]);

    // createOrder B
    mockQuery.mockResolvedValueOnce([
      {
        id: 'order-b-id',
        purchase_group_id: 'pg-id',
        customer_user_id: mockAuth.user_id,
        store_id: storeB,
        address_snapshot: {},
        status: 'PREPARING',
        payment_method: 'COD',
        payment_expires_at: null,
        goods_vnd: '150000',
        store_discount_vnd: '0',
        platform_discount_vnd: '0',
        shipping_vnd: '0',
        payable_vnd: '150000',
        version: 1,
        created_at: new Date(),
      },
    ]);
    // createOrderItem B
    mockQuery.mockResolvedValueOnce([]);
    // createPayment B
    mockQuery.mockResolvedValueOnce([]);

    // removeCartItems
    mockQuery.mockResolvedValueOnce([]);
    // saveIdempotencyRecord
    mockQuery.mockResolvedValueOnce([]);

    const mockInternalFactory = jest.fn(() => ({
      call: jest.fn(async (op: string) => {
        if (op === 'QuoteVariants') {
          return {
            items: [
              { variant_id: 'va', store_id: storeA, quantity: 1, price_vnd: 100000, available_quantity: 10, version: 1 },
              { variant_id: 'vb', store_id: storeB, quantity: 1, price_vnd: 150000, available_quantity: 10, version: 1 },
            ],
          };
        }
        if (op === 'ReserveInventory') {
          return { reservations: [] };
        }
        return {};
      }),
    })) as any;

    const customService = new OrderService(mockInternalFactory);

    const result = await customService.confirmCheckout(
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
        quote_id: '44444444-4444-4444-8444-444444444444',
        expected_payable_total_vnd: 250000,
      },
      idempotencyKey,
      mockAuth,
      correlation
    );

    expect(result.purchase_group_id).toBeDefined();
    expect(result.order_ids).toHaveLength(2);
    expect(result.orders).toHaveLength(2);
    expect(result.payable_total_vnd).toBe(250000);

    const orderA = result.orders.find(o => o.store_id === storeA)!;
    const orderB = result.orders.find(o => o.store_id === storeB)!;

    expect(orderA.status).toBe('AWAITING_PAYMENT');
    expect(orderA.payment_method).toBe('SANDBOX');
    expect(orderA.amounts.payable_vnd).toBe(100000);

    expect(orderB.status).toBe('PREPARING');
    expect(orderB.payment_method).toBe('COD');
    expect(orderB.amounts.payable_vnd).toBe(150000);
  });
});

describe('OrderService.getPurchaseGroupOrders Business Logic (ORDER-02)', () => {
  let service: OrderService;
  const mockAuth = { user_id: 'user-customer-uuid-1' };
  const correlation = 'test-corr-order-02-get';
  const purchaseGroupId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  test('throws 401 when unauthenticated', async () => {
    await expect(
      service.getPurchaseGroupOrders(purchaseGroupId, null, correlation)
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  test('throws 404 when purchase group is not found', async () => {
    mockQuery.mockResolvedValueOnce([]); // No orders found

    await expect(
      service.getPurchaseGroupOrders(purchaseGroupId, mockAuth, correlation)
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  test('returns OrderBatch with orders and items when purchase group exists', async () => {
    const storeA = '11111111-1111-4111-8111-111111111111';
    const ordersFromDb = [
      {
        id: 'order-1',
        purchase_group_id: purchaseGroupId,
        customer_user_id: mockAuth.user_id,
        store_id: storeA,
        address_snapshot: { city: 'Đà Nẵng' },
        status: 'AWAITING_PAYMENT',
        payment_method: 'SANDBOX',
        payment_expires_at: new Date(Date.now() + 900000),
        goods_vnd: '100000',
        store_discount_vnd: '10000',
        platform_discount_vnd: '5000',
        shipping_vnd: '0',
        payable_vnd: '85000',
        version: 1,
        created_at: new Date(),
      },
    ];

    const itemsFromDb = [
      {
        id: 'item-1',
        order_id: 'order-1',
        product_id: 'prod-1',
        variant_id: 'var-1',
        product_snapshot: { title: 'Áo thun' },
        sku_snapshot: 'SKU-001',
        unit_price_vnd: '100000',
        quantity: 1,
        line_total_vnd: '100000',
      },
    ];

    // 1. orders query
    mockQuery.mockResolvedValueOnce(ordersFromDb);
    // 2. order_items query
    mockQuery.mockResolvedValueOnce(itemsFromDb);

    const result = await service.getPurchaseGroupOrders(purchaseGroupId, mockAuth, correlation);

    expect(result.purchase_group_id).toBe(purchaseGroupId);
    expect(result.order_ids).toEqual(['order-1']);
    expect(result.orders).toHaveLength(1);
    expect(result.payable_total_vnd).toBe(85000);

    const order = result.orders[0];
    expect(order.id).toBe('order-1');
    expect(order.amounts.payable_vnd).toBe(85000);
    expect(order.items).toHaveLength(1);
  });
});

describe('OrderService.listOwnOrders & getOwnOrder Business Logic (ORDER-03)', () => {
  let service: OrderService;
  const mockAuth = { user_id: 'user-customer-uuid-1' };
  const correlation = 'test-corr-order-03-customer';
  const orderId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  describe('listOwnOrders', () => {
    test('throws 401 when unauthenticated', async () => {
      await expect(service.listOwnOrders({}, null, correlation)).rejects.toMatchObject({
        status: 401,
        response: { code: 'UNAUTHENTICATED' },
      });
    });

    test('returns paginated orders with items and correct mapped types', async () => {
      const ordersFromDb = [
        {
          id: orderId,
          purchase_group_id: 'pg-1',
          customer_user_id: mockAuth.user_id,
          store_id: 'store-1',
          address_snapshot: { city: 'Hà Nội' },
          status: 'COMPLETED',
          payment_method: 'SANDBOX',
          payment_expires_at: null,
          goods_vnd: '200000',
          store_discount_vnd: '20000',
          platform_discount_vnd: '10000',
          shipping_vnd: '15000',
          payable_vnd: '185000',
          version: 2,
          created_at: new Date('2026-03-01T00:00:00Z'),
          payment_status: 'PAID',
          refund_status: null,
        },
      ];

      const itemsFromDb = [
        {
          id: 'item-101',
          order_id: orderId,
          product_id: 'prod-101',
          variant_id: 'var-101',
          product_snapshot: { title: 'Quần Jeans' },
          sku_snapshot: 'SKU-JEANS-01',
          unit_price_vnd: '100000',
          quantity: 2,
          line_total_vnd: '200000',
        },
      ];

      // 1. count query
      mockQuery.mockResolvedValueOnce([{ total: 1 }]);
      // 2. orders query
      mockQuery.mockResolvedValueOnce(ordersFromDb);
      // 3. items query
      mockQuery.mockResolvedValueOnce(itemsFromDb);

      const result = await service.listOwnOrders({ page: 1, size: 10 }, mockAuth, correlation);

      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);

      const item = result.items[0];
      expect(item.id).toBe(orderId);
      expect(item.status).toBe('COMPLETED');
      expect(item.payment_status).toBe('PAID');
      expect(item.amounts.goods_vnd).toBe(200000);
      expect(item.amounts.store_discount_vnd).toBe(20000);
      expect(item.amounts.platform_discount_vnd).toBe(10000);
      expect(item.amounts.payable_vnd).toBe(185000);
      expect(item.items).toHaveLength(1);
      expect(item.items![0].product_snapshot).toEqual({ title: 'Quần Jeans' });
      expect(item.items![0].unit_price_vnd).toBe(100000);
    });

    test('returns empty page when customer has no orders', async () => {
      mockQuery.mockResolvedValueOnce([{ total: 0 }]);
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.listOwnOrders({ page: 1, size: 20 }, mockAuth, correlation);

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('getOwnOrder', () => {
    test('throws 401 when unauthenticated', async () => {
      await expect(service.getOwnOrder(orderId, null, correlation)).rejects.toMatchObject({
        status: 401,
        response: { code: 'UNAUTHENTICATED' },
      });
    });

    test('throws 422 when id is not a valid UUID', async () => {
      await expect(service.getOwnOrder('invalid-id', mockAuth, correlation)).rejects.toMatchObject({
        status: 422,
        response: { code: 'VALIDATION_FAILED' },
      });
    });

    test('throws 404 when order does not exist or belongs to another customer', async () => {
      mockQuery.mockResolvedValueOnce([]); // Order not found for this customer

      await expect(service.getOwnOrder(orderId, mockAuth, correlation)).rejects.toMatchObject({
        status: 404,
        response: { code: 'NOT_FOUND' },
      });
    });

    test('returns order details with items and snapshots when owned by customer', async () => {
      const orderFromDb = {
        id: orderId,
        purchase_group_id: 'pg-1',
        customer_user_id: mockAuth.user_id,
        store_id: 'store-1',
        address_snapshot: { line1: '123 Đường ABC', city: 'Hồ Chí Minh' },
        status: 'SHIPPED',
        payment_method: 'COD',
        payment_expires_at: null,
        goods_vnd: '300000',
        store_discount_vnd: '0',
        platform_discount_vnd: '0',
        shipping_vnd: '20000',
        payable_vnd: '320000',
        version: 3,
        created_at: new Date('2026-03-02T00:00:00Z'),
        payment_status: 'PENDING',
        refund_status: null,
      };

      const itemsFromDb = [
        {
          id: 'item-201',
          order_id: orderId,
          product_id: 'prod-201',
          variant_id: 'var-201',
          product_snapshot: { title: 'Giày Thể Thao' },
          sku_snapshot: 'SKU-SHOE-01',
          unit_price_vnd: '300000',
          quantity: 1,
          line_total_vnd: '300000',
        },
      ];

      mockQuery.mockResolvedValueOnce([orderFromDb]);
      mockQuery.mockResolvedValueOnce(itemsFromDb);

      const result = await service.getOwnOrder(orderId, mockAuth, correlation);

      expect(result.id).toBe(orderId);
      expect(result.status).toBe('SHIPPED');
      expect(result.payment_method).toBe('COD');
      expect(result.payment_status).toBe('PENDING');
      expect(result.amounts.goods_vnd).toBe(300000);
      expect(result.amounts.payable_vnd).toBe(320000);
      expect(result.items).toHaveLength(1);
      expect(result.items![0].sku_snapshot).toBe('SKU-SHOE-01');
    });
  });
});

describe('OrderService.listStoreOrders & getStoreOrder Business Logic (ORDER-03)', () => {
  let service: OrderService;
  const storeId = '22222222-2222-4222-8222-222222222222';
  const mockSellerAuth = {
    user_id: 'user-seller-uuid-1',
    roles: ['SELLER'],
    store_membership: { store_id: storeId, role: 'SELLER' },
  };
  const correlation = 'test-corr-order-03-store';
  const orderId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  describe('listStoreOrders', () => {
    test('throws 403 when user has no store membership', async () => {
      const authWithoutStore = { user_id: 'user-without-store', roles: ['CUSTOMER'] };
      await expect(service.listStoreOrders({}, authWithoutStore, correlation)).rejects.toMatchObject({
        status: 403,
        response: { code: 'FORBIDDEN' },
      });
    });

    test('returns paginated orders for seller store', async () => {
      const ordersFromDb = [
        {
          id: orderId,
          purchase_group_id: 'pg-store-1',
          customer_user_id: 'cust-1',
          store_id: storeId,
          address_snapshot: { city: 'Đà Nẵng' },
          status: 'PROCESSING',
          payment_method: 'SANDBOX',
          payment_expires_at: null,
          goods_vnd: '500000',
          store_discount_vnd: '50000',
          platform_discount_vnd: '0',
          shipping_vnd: '0',
          payable_vnd: '450000',
          version: 1,
          created_at: new Date('2026-03-03T00:00:00Z'),
          payment_status: 'PAID',
          refund_status: null,
        },
      ];

      const itemsFromDb = [
        {
          id: 'item-301',
          order_id: orderId,
          product_id: 'prod-301',
          variant_id: 'var-301',
          product_snapshot: { title: 'Tai nghe Bluetooth' },
          sku_snapshot: 'SKU-HEADPHONE-01',
          unit_price_vnd: '500000',
          quantity: 1,
          line_total_vnd: '500000',
        },
      ];

      // 1. count query
      mockQuery.mockResolvedValueOnce([{ total: 1 }]);
      // 2. orders query
      mockQuery.mockResolvedValueOnce(ordersFromDb);
      // 3. items query
      mockQuery.mockResolvedValueOnce(itemsFromDb);

      const result = await service.listStoreOrders({ page: 1, size: 20 }, mockSellerAuth, correlation);

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);

      const order = result.items[0];
      expect(order.id).toBe(orderId);
      expect(order.store_id).toBe(storeId);
      expect(order.status).toBe('PROCESSING');
      expect(order.amounts.goods_vnd).toBe(500000);
      expect(order.amounts.store_discount_vnd).toBe(50000);
      expect(order.amounts.payable_vnd).toBe(450000);
      expect(order.items).toHaveLength(1);
    });

    test('returns empty page when store has no orders', async () => {
      mockQuery.mockResolvedValueOnce([{ total: 0 }]);
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.listStoreOrders({ page: 1, size: 20 }, mockSellerAuth, correlation);

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('getStoreOrder', () => {
    test('throws 403 when user has no store membership', async () => {
      const authWithoutStore = { user_id: 'user-without-store', roles: ['CUSTOMER'] };
      await expect(service.getStoreOrder(orderId, authWithoutStore, correlation)).rejects.toMatchObject({
        status: 403,
        response: { code: 'FORBIDDEN' },
      });
    });

    test('throws 422 when id is not a valid UUID', async () => {
      await expect(service.getStoreOrder('not-a-uuid', mockSellerAuth, correlation)).rejects.toMatchObject({
        status: 422,
        response: { code: 'VALIDATION_FAILED' },
      });
    });

    test('throws 404 when order does not exist or belongs to another store', async () => {
      mockQuery.mockResolvedValueOnce([]); // Order not found for this store

      await expect(service.getStoreOrder(orderId, mockSellerAuth, correlation)).rejects.toMatchObject({
        status: 404,
        response: { code: 'NOT_FOUND' },
      });
    });

    test('returns store order details when owned by store', async () => {
      const orderFromDb = {
        id: orderId,
        purchase_group_id: 'pg-store-1',
        customer_user_id: 'cust-1',
        store_id: storeId,
        address_snapshot: { city: 'Cần Thơ' },
        status: 'CONFIRMED',
        payment_method: 'SANDBOX',
        payment_expires_at: null,
        goods_vnd: '150000',
        store_discount_vnd: '0',
        platform_discount_vnd: '0',
        shipping_vnd: '0',
        payable_vnd: '150000',
        version: 1,
        created_at: new Date('2026-03-04T00:00:00Z'),
        payment_status: 'PAID',
        refund_status: null,
      };

      const itemsFromDb = [
        {
          id: 'item-401',
          order_id: orderId,
          product_id: 'prod-401',
          variant_id: 'var-401',
          product_snapshot: { title: 'Bàn phím cơ' },
          sku_snapshot: 'SKU-KB-01',
          unit_price_vnd: '150000',
          quantity: 1,
          line_total_vnd: '150000',
        },
      ];

      mockQuery.mockResolvedValueOnce([orderFromDb]);
      mockQuery.mockResolvedValueOnce(itemsFromDb);

      const result = await service.getStoreOrder(orderId, mockSellerAuth, correlation);

      expect(result.id).toBe(orderId);
      expect(result.store_id).toBe(storeId);
      expect(result.status).toBe('CONFIRMED');
      expect(result.amounts.goods_vnd).toBe(150000);
      expect(result.items).toHaveLength(1);
      expect(result.items![0].sku_snapshot).toBe('SKU-KB-01');
    });
  });
});

