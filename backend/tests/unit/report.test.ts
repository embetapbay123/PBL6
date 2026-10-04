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

import { ReportService } from '../../commerce-service/src/report/report.service';

describe('Report Contract and DTO Validation', () => {
  test('listAllOrders accepts valid query and supplies defaults', () => {
    const validated = validateOperation('listAllOrders', {
      query: {},
      path: {},
      headers: {},
    });
    expect(validated.query).toEqual({ page: 1, size: 20 });
  });

  test('listAllOrders rejects size > 100', () => {
    expect(() =>
      validateOperation('listAllOrders', {
        query: { size: 101 },
        path: {},
        headers: {},
      })
    ).toThrow();
  });

  test('getStoreReport validates required from and to date-time strings', () => {
    const valid = {
      query: {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.000Z',
        granularity: 'DAY' as const,
      },
      path: {},
      headers: {},
    };
    expect(() => validateOperation('getStoreReport', valid)).not.toThrow();

    // missing from
    expect(() =>
      validateOperation('getStoreReport', {
        query: { to: '2026-10-31T23:59:59.000Z' } as any,
        path: {},
        headers: {},
      })
    ).toThrow();

    // invalid granularity
    expect(() =>
      validateOperation('getStoreReport', {
        query: {
          from: '2026-10-01T00:00:00.000Z',
          to: '2026-10-31T23:59:59.000Z',
          granularity: 'YEAR' as any,
        },
        path: {},
        headers: {},
      })
    ).toThrow();
  });
});

describe('ReportService RBAC and Business Logic', () => {
  const adminUser = {
    user_id: 'admin-user-id',
    roles: ['ADMIN'],
  };

  const storeAOwner = {
    user_id: 'owner-a-user-id',
    roles: ['STORE_OWNER'],
    store_membership: {
      store_id: '11111111-1111-4111-8111-111111111111',
      role: 'OWNER',
      permissions: ['report.store.view'],
    },
  };

  const regularCustomer = {
    user_id: 'customer-user-id',
    roles: ['CUSTOMER'],
  };

  const correlation = 'test-report-correlation-id';

  beforeEach(() => {
    mockQuery.mockReset();
  });

  // --- listAllOrders Tests ---
  test('listAllOrders rejects non-admin caller', async () => {
    const service = new ReportService();
    await expect(service.listAllOrders({}, regularCustomer, correlation)).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  test('listAllOrders returns paginated order list with amounts and payment status', async () => {
    const service = new ReportService();

    // 1. count query
    mockQuery.mockResolvedValueOnce([{ total: 1 }]);
    // 2. select query
    mockQuery.mockResolvedValueOnce([
      {
        id: 'order-1',
        purchase_group_id: 'pg-1',
        store_id: 'store-1',
        status: 'COMPLETED',
        version: 2,
        payment_method: 'SANDBOX',
        payment_status: 'PAID',
        refunded_vnd: '0',
        payment_expires_at: new Date('2026-10-04T12:00:00.000Z'),
        goods_vnd: '500000',
        store_discount_vnd: '50000',
        platform_discount_vnd: '20000',
        shipping_vnd: '30000',
        payable_vnd: '460000',
        created_at: new Date('2026-10-04T10:00:00.000Z'),
      },
    ]);

    const result = await service.listAllOrders({ page: 1, size: 20 }, adminUser, correlation);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'order-1',
      purchase_group_id: 'pg-1',
      store_id: 'store-1',
      status: 'COMPLETED',
      version: 2,
      payment_method: 'SANDBOX',
      payment_status: 'PAID',
      refund_status: undefined,
      payment_expires_at: '2026-10-04T12:00:00.000Z',
      amounts: {
        goods_vnd: 500000,
        store_discount_vnd: 50000,
        platform_discount_vnd: 20000,
        shipping_vnd: 30000,
        payable_vnd: 460000,
      },
    });
  });

  // --- getPlatformDashboard Tests ---
  test('getPlatformDashboard rejects non-admin caller', async () => {
    const service = new ReportService();
    await expect(service.getPlatformDashboard(regularCustomer, correlation)).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  test('getPlatformDashboard returns aggregated metrics for platform admin', async () => {
    const service = new ReportService();

    // 1. orderAgg
    mockQuery.mockResolvedValueOnce([
      {
        order_value_vnd: '10000000',
        completed_goods_revenue_vnd: '8000000',
      },
    ]);
    // 2. paymentAgg
    mockQuery.mockResolvedValueOnce([
      {
        collected_vnd: '9500000',
        refunded_vnd: '500000',
      },
    ]);
    // 3. storeCount
    mockQuery.mockResolvedValueOnce([{ store_count: 15 }]);
    // 4. userCount
    mockQuery.mockResolvedValueOnce([{ user_count: 120 }]);

    const result = await service.getPlatformDashboard(adminUser, correlation);
    expect(result).toEqual({
      order_value_vnd: 10000000,
      completed_goods_revenue_vnd: 8000000,
      collected_vnd: 9500000,
      refunded_vnd: 500000,
      store_count: 15,
      user_count: 120,
    });
  });

  // --- getStoreReport Tests ---
  test('getStoreReport rejects caller without Store membership', async () => {
    const service = new ReportService();
    await expect(
      service.getStoreReport(
        { from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.000Z' },
        regularCustomer,
        correlation
      )
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  test('getStoreReport validates date range (to >= from)', async () => {
    const service = new ReportService();
    await expect(
      service.getStoreReport(
        {
          from: '2026-10-31T00:00:00.000Z',
          to: '2026-10-01T00:00:00.000Z',
        },
        storeAOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('getStoreReport returns aggregated report and revenue series for store', async () => {
    const service = new ReportService();
    const storeId = storeAOwner.store_membership.store_id;

    // 1. orderAgg
    mockQuery.mockResolvedValueOnce([
      {
        order_count: 42,
        order_value_vnd: '5000000',
        completed_goods_revenue_vnd: '4200000',
        shipping_fee_vnd: '300000',
      },
    ]);
    // 2. paymentAgg
    mockQuery.mockResolvedValueOnce([
      {
        collected_vnd: '4800000',
        refunded_vnd: '200000',
      },
    ]);
    // 3. bestSellingRows
    mockQuery.mockResolvedValueOnce([
      { product_id: 'prod-uuid-1', total_qty: 25 },
      { product_id: 'prod-uuid-2', total_qty: 17 },
    ]);
    // 4. seriesRows
    mockQuery.mockResolvedValueOnce([
      {
        bucket_start: new Date('2026-10-01T00:00:00.000Z'),
        completed_goods_revenue_vnd: '2000000',
      },
      {
        bucket_start: new Date('2026-10-02T00:00:00.000Z'),
        completed_goods_revenue_vnd: '2200000',
      },
    ]);

    const result = await service.getStoreReport(
      {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.000Z',
        granularity: 'DAY',
      },
      storeAOwner,
      correlation
    );

    expect(result).toEqual({
      store_id: storeId,
      period_start: '2026-10-01T00:00:00.000Z',
      period_end: '2026-10-31T23:59:59.000Z',
      order_value_vnd: 5000000,
      completed_goods_revenue_vnd: 4200000,
      collected_vnd: 4800000,
      refunded_vnd: 200000,
      shipping_fee_vnd: 300000,
      order_count: 42,
      best_selling_product_ids: ['prod-uuid-1', 'prod-uuid-2'],
      low_stock_variant_ids: [],
      revenue_series: [
        {
          bucket_start: '2026-10-01T00:00:00.000Z',
          completed_goods_revenue_vnd: 2000000,
        },
        {
          bucket_start: '2026-10-02T00:00:00.000Z',
          completed_goods_revenue_vnd: 2200000,
        },
      ],
    });
  });
});
