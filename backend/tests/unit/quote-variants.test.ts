import { InventoryService } from '../../catalog-service/src/inventory/inventory.service';
import { quoteItemResponse } from '../../catalog-service/src/inventory/inventory.mapper';
import { ApiError } from '../../shared/src/errors';

const VARIANT = '10000000-0000-4000-8000-000000000090';
const STORE = '10000000-0000-4000-8000-000000000061';
const row = {
  variant_id: VARIANT, product_id: 'p', store_id: STORE, price_vnd: '100000',
  variant_status: 'ACTIVE', product_status: 'ACTIVE', moderation_status: 'VISIBLE',
  available_quantity: 10, version: 0,
};

describe('QuoteVariants service dependency handling', () => {
  test('fails closed with 503 when the M3 Store lookup is unavailable', async () => {
    const service = new InventoryService({
      call: async () => { throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Lookup Store chưa sẵn sàng.'); },
    });
    await expect(service.quote({ items: [{ variant_id: VARIANT, store_id: STORE, quantity: 1 }] }, 'corr-quote'))
      .rejects.toMatchObject({ status: 503, response: { code: 'DEPENDENCY_UNAVAILABLE' } });
  });

  test('propagates a service-auth failure instead of returning a result', async () => {
    const service = new InventoryService({
      call: async () => { throw new ApiError(503, 'SERVICE_AUTH_FAILED', 'Caller không thuộc contract.'); },
    });
    await expect(service.quote({ items: [{ variant_id: VARIANT, store_id: STORE, quantity: 1 }] }, 'corr-quote'))
      .rejects.toMatchObject({ status: 503, response: { code: 'SERVICE_AUTH_FAILED' } });
  });
});

describe('QuoteVariants mapper', () => {
  test('converts the BIGINT price to a safe integer and echoes the requested quantity', () => {
    expect(quoteItemResponse(row, 2)).toEqual({
      variant_id: VARIANT, store_id: STORE, quantity: 2, price_vnd: 100000, available_quantity: 10, version: 0,
    });
  });

  test('rejects unsafe or fractional money rather than returning a wrong number', () => {
    expect(() => quoteItemResponse({ ...row, price_vnd: '9007199254740992' }, 1)).toThrow();
    expect(() => quoteItemResponse({ ...row, price_vnd: '1.5' }, 1)).toThrow();
  });
});
