import { IdLookupService } from '../../identity-store-service/src/auth/id-lookup.service';

const query = jest.fn();

describe('IdLookupService', () => {
  const service = new IdLookupService({ query });

  beforeEach(() => query.mockReset());

  test('rejects an address belonging to another customer with 404', async () => {
    query.mockResolvedValueOnce([]);

    await expect(service.resolveCheckoutContext({
      customerId: '11111111-1111-4111-8111-111111111111',
      addressId: '22222222-2222-4222-8222-222222222222',
      storeIds: ['33333333-3333-4333-8333-333333333333'],
    })).rejects.toMatchObject({ status: 404 });
  });

  test('rejects a locked store with 409', async () => {
    query
      .mockResolvedValueOnce([{
        recipient_name: 'A', phone: '0900000000', line1: '1 Main',
        ward: 'Ward 1', district: 'District 1', city: 'HCMC',
      }])
      .mockResolvedValueOnce([]);

    await expect(service.resolveCheckoutContext({
      customerId: '11111111-1111-4111-8111-111111111111',
      addressId: '22222222-2222-4222-8222-222222222222',
      storeIds: ['33333333-3333-4333-8333-333333333333'],
    })).rejects.toMatchObject({ status: 409 });
  });

  test('rejects metrics access to another store with 403', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.resolveAiMetricsScope({
      userId: '11111111-1111-4111-8111-111111111111',
      requestedStoreId: '33333333-3333-4333-8333-333333333333',
    })).rejects.toMatchObject({ status: 403 });
  });

  test('returns BIGINT shipping fee as a string', async () => {
    query
      .mockResolvedValueOnce([{
        recipient_name: 'A', phone: '0900000000', line1: '1 Main',
        ward: 'Ward 1', district: 'District 1', city: 'HCMC',
      }])
      .mockResolvedValueOnce([{
        id: '33333333-3333-4333-8333-333333333333',
        shipping_fee_vnd: '9007199254740992',
        version: 7,
      }]);

    await expect(service.resolveCheckoutContext({
      customerId: '11111111-1111-4111-8111-111111111111',
      addressId: '22222222-2222-4222-8222-222222222222',
      storeIds: ['33333333-3333-4333-8333-333333333333'],
    })).resolves.toMatchObject({
      stores: [{ shipping_fee_vnd: '9007199254740992', version: 7 }],
    });
  });
});
