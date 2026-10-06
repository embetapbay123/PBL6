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
import { ReviewEligibilityInternalController } from '../../commerce-service/src/order/review-eligibility.internal.controller';


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

  test('cancelOwnOrder accepts valid payload and path', () => {
    expect(() =>
      validateOperation('cancelOwnOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        body: { expected_version: 1, reason: 'Không còn nhu cầu' },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('transitionStoreOrder accepts valid payload and path', () => {
    expect(() =>
      validateOperation('transitionStoreOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        body: { to_status: 'CONFIRMED', expected_version: 1 },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('transitionStoreOrder rejects invalid to_status', () => {
    expect(() =>
      validateOperation('transitionStoreOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        body: { to_status: 'INVALID_STATUS' as any, expected_version: 1 },
        query: {},
        headers: {},
      })
    ).toThrow();
  });

  test('cancelStoreOrder accepts valid payload and path', () => {
    expect(() =>
      validateOperation('cancelStoreOrder', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        body: { expected_version: 2, reason: 'Hết hàng' },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('collectCod accepts valid payload and path', () => {
    expect(() =>
      validateOperation('collectCod', {
        path: { id: '44444444-4444-4444-8444-444444444444' },
        body: { expected_version: 3, amount_collected_vnd: 150000 },
        query: {},
        headers: {},
      })
    ).not.toThrow();
  });

  test('collectCod rejects invalid UUID path', () => {
    expect(() =>
      validateOperation('collectCod', {
        path: { id: 'invalid-uuid' },
        body: { expected_version: 3, amount_collected_vnd: 150000 },
        query: {},
        headers: {},
      })
    ).toThrow();
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
    store_membership: { permissions:['order.store.read_status_cancel'], store_id: storeId, role: 'SELLER' },
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


describe('OrderService.verifyReviewEligibility (REVIEW-ELIG-01 & BR-37)', () => {
  let service: OrderService;
  let controller: ReviewEligibilityInternalController;

  const validOrderItemId = '11111111-1111-4111-8111-111111111111';
  const validCustomerId = '22222222-2222-4222-8222-222222222222';
  const validProductId = '33333333-3333-4333-8333-333333333333';
  const validOrderId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
    controller = new ReviewEligibilityInternalController();
  });

  test('throws 422 VALIDATION_FAILED when order_item_id is missing or not a valid UUID', async () => {
    await expect(
      service.verifyReviewEligibility({
        order_item_id: 'invalid-uuid',
        customer_user_id: validCustomerId,
        product_id: validProductId,
      })
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('throws 422 VALIDATION_FAILED when customer_user_id is missing or not a valid UUID', async () => {
    await expect(
      service.verifyReviewEligibility({
        order_item_id: validOrderItemId,
        customer_user_id: 'not-a-uuid',
        product_id: validProductId,
      })
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('throws 422 VALIDATION_FAILED when product_id is missing or not a valid UUID', async () => {
    await expect(
      service.verifyReviewEligibility({
        order_item_id: validOrderItemId,
        customer_user_id: validCustomerId,
        product_id: 'bad-uuid',
      })
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('returns eligible: false when order item is not found in database', async () => {
    mockQuery.mockResolvedValueOnce([]); // No row found

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'Không tìm thấy mục đơn hàng tương ứng.',
    });
  });

  test('returns eligible: false when customer_user_id does not match the order owner', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: validProductId,
        customer_user_id: '99999999-9999-4999-8999-999999999999', // Different customer
        order_status: 'COMPLETED',
      },
    ]);

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'Mục đơn hàng không thuộc về khách hàng này.',
    });
  });

  test('returns eligible: false when product_id does not match the order item product', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: '88888888-8888-4888-8888-888888888888', // Different product
        customer_user_id: validCustomerId,
        order_status: 'COMPLETED',
      },
    ]);

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'Sản phẩm không khớp với mục đơn hàng.',
    });
  });

  test('returns eligible: false when order status is not COMPLETED (e.g. SHIPPED)', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: validProductId,
        customer_user_id: validCustomerId,
        order_status: 'SHIPPED',
      },
    ]);

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'Đơn hàng chưa hoàn thành (trạng thái: SHIPPED).',
    });
  });

  test('returns eligible: false when order status is CANCELLED or PROCESSING', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: validProductId,
        customer_user_id: validCustomerId,
        order_status: 'CANCELLED',
      },
    ]);

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'Đơn hàng chưa hoàn thành (trạng thái: CANCELLED).',
    });
  });

  test('returns eligible: true when order is COMPLETED and ownership and product match', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: validProductId,
        customer_user_id: validCustomerId,
        order_status: 'COMPLETED',
      },
    ]);

    const result = await service.verifyReviewEligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: true,
    });
  });

  test('ReviewEligibilityInternalController delegates to verifyReviewEligibility', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        order_item_id: validOrderItemId,
        order_id: validOrderId,
        product_id: validProductId,
        customer_user_id: validCustomerId,
        order_status: 'COMPLETED',
      },
    ]);

    const result = await controller.eligibility({
      order_item_id: validOrderItemId,
      customer_user_id: validCustomerId,
      product_id: validProductId,
    });

    expect(result).toEqual({
      eligible: true,
    });
  });
});




