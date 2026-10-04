import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { validateOperation } from '../../shared/src/request-contract';
import { VoucherService } from '../../commerce-service/src/voucher/voucher.service';

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

describe('Store Voucher Contract and DTO Validation', () => {
  test('listStoreVouchers accepts valid query and supplies defaults', () => {
    const validated = validateOperation('listStoreVouchers', {
      query: {},
      path: {},
      headers: {},
    });
    expect(validated.query).toEqual({ page: 1, size: 20 });
  });

  test('listStoreVouchers rejects size > 100', () => {
    expect(() =>
      validateOperation('listStoreVouchers', {
        query: { size: 101 },
        path: {},
        headers: {},
      })
    ).toThrow();
  });

  test('createStoreVoucher validates required fields and types', () => {
    const valid = {
      body: {
        code: 'SUMMER20',
        scope: 'STORE' as const,
        discount_type: 'PERCENT' as const,
        discount_value: 20,
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-31T23:59:59.000Z',
        usage_limit: 100,
        per_customer_limit: 1,
      },
      path: {},
      query: {},
      headers: {},
    };
    expect(() => validateOperation('createStoreVoucher', valid)).not.toThrow();

    // missing code
    expect(() =>
      validateOperation('createStoreVoucher', {
        ...valid,
        body: { ...valid.body, code: undefined as any },
      })
    ).toThrow();

    // invalid discount_type
    expect(() =>
      validateOperation('createStoreVoucher', {
        ...valid,
        body: { ...valid.body, discount_type: 'INVALID' as any },
      })
    ).toThrow();
  });

  test('updateStoreVoucher requires expected_version and at least 2 properties', () => {
    const valid = {
      body: {
        expected_version: 0,
        status: 'STOPPED' as const,
      },
      path: { id: '11111111-1111-4111-8111-111111111111' },
      query: {},
      headers: {},
    };
    expect(() => validateOperation('updateStoreVoucher', valid)).not.toThrow();

    // missing expected_version
    expect(() =>
      validateOperation('updateStoreVoucher', {
        ...valid,
        body: { status: 'STOPPED' as const } as any,
      })
    ).toThrow();
  });
});

describe('Platform Voucher Contract and DTO Validation', () => {
  test('listPlatformVouchers accepts valid query and supplies defaults', () => {
    const validated = validateOperation('listPlatformVouchers', {
      query: {},
      path: {},
      headers: {},
    });
    expect(validated.query).toEqual({ page: 1, size: 20 });
  });

  test('createPlatformVoucher validates required fields and types', () => {
    const valid = {
      body: {
        code: 'ALLPLATFORM10',
        scope: 'PLATFORM' as const,
        discount_type: 'PERCENT' as const,
        discount_value: 10,
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-31T23:59:59.000Z',
        usage_limit: 1000,
        per_customer_limit: 2,
      },
      path: {},
      query: {},
      headers: {},
    };
    expect(() => validateOperation('createPlatformVoucher', valid)).not.toThrow();
  });

  test('updatePlatformVoucher requires expected_version', () => {
    const valid = {
      body: {
        expected_version: 0,
        status: 'STOPPED' as const,
      },
      path: { id: '11111111-1111-4111-8111-111111111111' },
      query: {},
      headers: {},
    };
    expect(() => validateOperation('updatePlatformVoucher', valid)).not.toThrow();
  });
});

describe('VoucherService Business Logic & Store Isolation (BR-04, BR-06)', () => {
  const storeAOwner = {
    user_id: 'owner-a-user-id',
    roles: ['STORE_OWNER'],
    store_membership: {
      store_id: '11111111-1111-4111-8111-111111111111',
      role: 'OWNER',
      permissions: ['voucher.store.manage'],
    },
  };

  const storeBOwner = {
    user_id: 'owner-b-user-id',
    roles: ['STORE_OWNER'],
    store_membership: {
      store_id: '22222222-2222-4222-8222-222222222222',
      role: 'OWNER',
      permissions: ['voucher.store.manage'],
    },
  };

  const regularCustomer = {
    user_id: 'customer-user-id',
    roles: ['CUSTOMER'],
  };

  const adminUser = {
    user_id: 'admin-user-id',
    roles: ['ADMIN'],
  };

  const correlation = 'test-voucher-correlation-id';

  beforeEach(() => {
    mockQuery.mockReset();
  });

  // --- Store Voucher tests ---
  test('rejects caller without Store membership or without owner role', async () => {
    const service = new VoucherService();
    await expect(service.listStoreVouchers({}, regularCustomer, correlation)).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  test('listStoreVouchers returns paginated list for the store', async () => {
    const service = new VoucherService();
    const storeId = storeAOwner.store_membership.store_id;

    mockQuery.mockResolvedValueOnce([{ total: 1 }]);
    mockQuery.mockResolvedValueOnce([
      {
        id: 'voucher-1111-1111-4111-8111-111111111111',
        code: 'STORE10',
        scope: 'STORE',
        store_id: storeId,
        owner_user_id: storeAOwner.user_id,
        discount_type: 'PERCENT',
        discount_value: '10',
        max_discount_vnd: '50000',
        min_goods_vnd: '100000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T23:59:59.000Z'),
        usage_limit: 100,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 0,
      },
    ]);

    const result = await service.listStoreVouchers({ page: 1, size: 20 }, storeAOwner, correlation);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'voucher-1111-1111-4111-8111-111111111111',
      code: 'STORE10',
      scope: 'STORE',
      store_id: storeId,
      discount_type: 'PERCENT',
      discount_value: 10,
      max_discount_vnd: 50000,
      min_goods_vnd: 100000,
      starts_at: '2026-10-01T00:00:00.000Z',
      ends_at: '2026-10-31T23:59:59.000Z',
      usage_limit: 100,
      per_customer_limit: 1,
      status: 'ACTIVE',
      version: 0,
    });
  });

  test('createStoreVoucher validates dates (ends_at > starts_at)', async () => {
    const service = new VoucherService();
    await expect(
      service.createStoreVoucher(
        {
          code: 'INVALID_DATES',
          scope: 'STORE',
          discount_type: 'PERCENT',
          discount_value: 10,
          starts_at: '2026-10-31T00:00:00.000Z',
          ends_at: '2026-10-01T00:00:00.000Z',
          usage_limit: 10,
          per_customer_limit: 1,
        },
        storeAOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('createStoreVoucher rejects PERCENT discount > 100', async () => {
    const service = new VoucherService();
    await expect(
      service.createStoreVoucher(
        {
          code: 'OVER_100',
          scope: 'STORE',
          discount_type: 'PERCENT',
          discount_value: 105,
          starts_at: '2026-10-01T00:00:00.000Z',
          ends_at: '2026-10-31T00:00:00.000Z',
          usage_limit: 10,
          per_customer_limit: 1,
        },
        storeAOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'VALIDATION_FAILED' },
    });
  });

  test('createStoreVoucher rejects duplicate code', async () => {
    const service = new VoucherService();
    mockQuery.mockResolvedValueOnce([{ id: 'existing-id', code: 'EXISTING' }]);

    await expect(
      service.createStoreVoucher(
        {
          code: 'existing',
          scope: 'STORE',
          discount_type: 'FIXED',
          discount_value: 20000,
          starts_at: '2026-10-01T00:00:00.000Z',
          ends_at: '2026-10-31T00:00:00.000Z',
          usage_limit: 10,
          per_customer_limit: 1,
        },
        storeAOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'VOUCHER_CODE_EXISTS' },
    });
  });

  test('createStoreVoucher successfully creates voucher and logs audit', async () => {
    const service = new VoucherService();
    const storeId = storeAOwner.store_membership.store_id;

    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([
      {
        id: 'new-voucher-id',
        code: 'NEWVOUCHER',
        scope: 'STORE',
        store_id: storeId,
        owner_user_id: storeAOwner.user_id,
        discount_type: 'FIXED',
        discount_value: '20000',
        max_discount_vnd: null,
        min_goods_vnd: '50000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 50,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 0,
      },
    ]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await service.createStoreVoucher(
      {
        code: 'newvoucher',
        scope: 'STORE',
        discount_type: 'FIXED',
        discount_value: 20000,
        min_goods_vnd: 50000,
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-31T00:00:00.000Z',
        usage_limit: 50,
        per_customer_limit: 1,
      },
      storeAOwner,
      correlation
    );

    expect(result).toEqual({
      id: 'new-voucher-id',
      code: 'NEWVOUCHER',
      scope: 'STORE',
      store_id: storeId,
      discount_type: 'FIXED',
      discount_value: 20000,
      min_goods_vnd: 50000,
      starts_at: '2026-10-01T00:00:00.000Z',
      ends_at: '2026-10-31T00:00:00.000Z',
      usage_limit: 50,
      per_customer_limit: 1,
      status: 'ACTIVE',
      version: 0,
    });
  });

  test('updateStoreVoucher rejects when Store B attempts to update Store A voucher (Store isolation)', async () => {
    const service = new VoucherService();
    mockQuery.mockResolvedValueOnce([]);

    await expect(
      service.updateStoreVoucher(
        'store-a-voucher-id',
        { expected_version: 0, status: 'STOPPED' },
        storeBOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' },
    });
  });

  test('updateStoreVoucher rejects version conflict', async () => {
    const service = new VoucherService();
    const storeId = storeAOwner.store_membership.store_id;

    mockQuery.mockResolvedValueOnce([
      {
        id: 'voucher-id',
        code: 'VOUCHER1',
        scope: 'STORE',
        store_id: storeId,
        owner_user_id: storeAOwner.user_id,
        discount_type: 'PERCENT',
        discount_value: '10',
        min_goods_vnd: '0',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 10,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 1,
      },
    ]);

    await expect(
      service.updateStoreVoucher(
        'voucher-id',
        { expected_version: 0, status: 'STOPPED' },
        storeAOwner,
        correlation
      )
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'VERSION_CONFLICT' },
    });
  });

  test('updateStoreVoucher successfully updates and increments version', async () => {
    const service = new VoucherService();
    const storeId = storeAOwner.store_membership.store_id;
    const voucherId = 'voucher-to-update';

    mockQuery.mockResolvedValueOnce([
      {
        id: voucherId,
        code: 'VOUCHER1',
        scope: 'STORE',
        store_id: storeId,
        owner_user_id: storeAOwner.user_id,
        discount_type: 'PERCENT',
        discount_value: '10',
        min_goods_vnd: '0',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 10,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 0,
      },
    ]);
    mockQuery.mockResolvedValueOnce([
      {
        id: voucherId,
        code: 'VOUCHER1',
        scope: 'STORE',
        store_id: storeId,
        owner_user_id: storeAOwner.user_id,
        discount_type: 'PERCENT',
        discount_value: '10',
        min_goods_vnd: '0',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 10,
        per_customer_limit: 1,
        status: 'STOPPED',
        version: 1,
      },
    ]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await service.updateStoreVoucher(
      voucherId,
      { expected_version: 0, status: 'STOPPED' },
      storeAOwner,
      correlation
    );

    expect(result.status).toBe('STOPPED');
    expect(result.version).toBe(1);
  });

  // --- Platform Voucher tests ---
  test('rejects non-admin caller from listPlatformVouchers', async () => {
    const service = new VoucherService();
    await expect(service.listPlatformVouchers({}, regularCustomer, correlation)).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  test('listPlatformVouchers returns paginated platform vouchers for admin', async () => {
    const service = new VoucherService();
    mockQuery.mockResolvedValueOnce([{ total: 1 }]);
    mockQuery.mockResolvedValueOnce([
      {
        id: 'platform-voucher-1',
        code: 'PLATFORM10',
        scope: 'PLATFORM',
        store_id: null,
        owner_user_id: adminUser.user_id,
        discount_type: 'PERCENT',
        discount_value: '10',
        max_discount_vnd: '100000',
        min_goods_vnd: '200000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T23:59:59.000Z'),
        usage_limit: 1000,
        per_customer_limit: 2,
        status: 'ACTIVE',
        version: 0,
      },
    ]);

    const result = await service.listPlatformVouchers({ page: 1, size: 20 }, adminUser, correlation);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].scope).toBe('PLATFORM');
    expect(result.items[0].store_id).toBeUndefined();
  });

  test('createPlatformVoucher successfully creates platform voucher', async () => {
    const service = new VoucherService();
    mockQuery.mockResolvedValueOnce([]); // findByCode
    mockQuery.mockResolvedValueOnce([
      {
        id: 'new-platform-id',
        code: 'PLATFORM50K',
        scope: 'PLATFORM',
        store_id: null,
        owner_user_id: adminUser.user_id,
        discount_type: 'FIXED',
        discount_value: '50000',
        max_discount_vnd: null,
        min_goods_vnd: '100000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 500,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 0,
      },
    ]);
    mockQuery.mockResolvedValueOnce([]); // audit

    const result = await service.createPlatformVoucher(
      {
        code: 'PLATFORM50K',
        scope: 'PLATFORM',
        discount_type: 'FIXED',
        discount_value: 50000,
        min_goods_vnd: 100000,
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-31T00:00:00.000Z',
        usage_limit: 500,
        per_customer_limit: 1,
      },
      adminUser,
      correlation
    );

    expect(result.code).toBe('PLATFORM50K');
    expect(result.scope).toBe('PLATFORM');
    expect(result.discount_value).toBe(50000);
  });

  test('updatePlatformVoucher updates platform voucher and logs audit', async () => {
    const service = new VoucherService();
    const voucherId = 'platform-v-1';

    mockQuery.mockResolvedValueOnce([
      {
        id: voucherId,
        code: 'PLATFORM50K',
        scope: 'PLATFORM',
        store_id: null,
        owner_user_id: adminUser.user_id,
        discount_type: 'FIXED',
        discount_value: '50000',
        min_goods_vnd: '100000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 500,
        per_customer_limit: 1,
        status: 'ACTIVE',
        version: 0,
      },
    ]);
    mockQuery.mockResolvedValueOnce([
      {
        id: voucherId,
        code: 'PLATFORM50K',
        scope: 'PLATFORM',
        store_id: null,
        owner_user_id: adminUser.user_id,
        discount_type: 'FIXED',
        discount_value: '50000',
        min_goods_vnd: '100000',
        starts_at: new Date('2026-10-01T00:00:00.000Z'),
        ends_at: new Date('2026-10-31T00:00:00.000Z'),
        usage_limit: 500,
        per_customer_limit: 1,
        status: 'STOPPED',
        version: 1,
      },
    ]);
    mockQuery.mockResolvedValueOnce([]); // audit

    const result = await service.updatePlatformVoucher(
      voucherId,
      { expected_version: 0, status: 'STOPPED' },
      adminUser,
      correlation
    );

    expect(result.status).toBe('STOPPED');
    expect(result.version).toBe(1);
  });
});
