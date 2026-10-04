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

describe('Order Contract and DTO Validation (ORDER-01 & ORDER-02)', () => {
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
