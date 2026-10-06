import { IdLookupService } from '../../identity-store-service/src/auth/id-lookup.service';
const query = jest.fn(), resolve = jest.fn();
const service = new IdLookupService({ query }, { resolve });
const user = '11111111-1111-4111-8111-111111111111';
const store = '33333333-3333-4333-8333-333333333333';
const input = { token: 'access-token', address_id: '22222222-2222-4222-8222-222222222222', store_ids: [store] };
beforeEach(() => { query.mockReset(); resolve.mockReset().mockResolvedValue({ user_id: user, roles: ['CUSTOMER'], token_version: 4 }); });
test('checkout verifies the session and restricts address ownership to the resolved customer', async () => {
  query.mockResolvedValueOnce([]);
  await expect(service.resolveCheckoutContext(input)).rejects.toMatchObject({ status: 404 });
  expect(resolve).toHaveBeenCalledWith(input.token);
  expect(query.mock.calls[0][1]).toEqual([input.address_id, user]);
});
test('checkout rejects non-customer sessions before reading snapshots', async () => {
  resolve.mockResolvedValue({ user_id: user, roles: ['SELLER'], token_version: 4 });
  await expect(service.resolveCheckoutContext(input)).rejects.toMatchObject({ status: 403 });
  expect(query).not.toHaveBeenCalled();
});
test('checkout rejects an unavailable store', async () => {
  query.mockResolvedValueOnce([{}]).mockResolvedValueOnce([]);
  await expect(service.resolveCheckoutContext(input)).rejects.toMatchObject({ status: 409 });
});
test('checkout maps BIGINT to a safe number and retains the contract snapshot', async () => {
  const address = { id: input.address_id, recipient_name: 'A', phone: '0900000000', line1: '1 Main', ward: 'Ward', district: 'District', city: 'Hue', is_default: true };
  query.mockResolvedValueOnce([address]).mockResolvedValueOnce([{ id: store, name: 'Store', shipping_fee_vnd: '25000', version: 7 }]);
  await expect(service.resolveCheckoutContext(input)).resolves.toEqual({ customer_user_id: user, address_snapshot: address, stores: [{ id: store, name: 'Store', shipping_fee_vnd: 25000, version: 7 }] });
});
test('checkout rejects unsafe shipping fees', async () => {
  query.mockResolvedValueOnce([{}]).mockResolvedValueOnce([{ id: store, name: 'Store', shipping_fee_vnd: '9007199254740992', version: 7 }]);
  await expect(service.resolveCheckoutContext(input)).rejects.toMatchObject({ status: 500 });
});
test('only an actual Admin receives platform metrics', async () => {
  resolve.mockResolvedValue({ user_id: user, roles: ['ADMIN'], token_version: 4 });
  await expect(service.resolveAiMetricsScope({ token: 'token' })).resolves.toEqual({ user_id: user, scope: 'PLATFORM', token_version: 4 });
  expect(query).not.toHaveBeenCalled();
});
test('Seller or another Store membership cannot grant metrics scope', async () => {
  query.mockResolvedValueOnce([]);
  await expect(service.resolveAiMetricsScope({ token: 'token', store_id: store })).rejects.toMatchObject({ status: 403 });
  expect(query.mock.calls[0][0]).toContain("m.role='OWNER'");
  expect(query.mock.calls[0][0]).toContain("s.status='ACTIVE'");
});
test('Owner is limited to the resolved store', async () => {
  query.mockResolvedValueOnce([{ store_id: store }]);
  await expect(service.resolveAiMetricsScope({ token: 'token', store_id: store })).resolves.toEqual({ user_id: user, scope: 'STORE', store_id: store, token_version: 4 });
});
test('multiple Owner memberships require an explicit store selection', async () => {
  query.mockResolvedValueOnce([{ store_id: store }, { store_id: user }]);
  await expect(service.resolveAiMetricsScope({ token: 'token' })).rejects.toMatchObject({ status: 422 });
});
test('Admin requested store must exist and be active', async () => {
  resolve.mockResolvedValue({ user_id: user, roles: ['ADMIN'], token_version: 4 });
  query.mockResolvedValueOnce([]);
  await expect(service.resolveAiMetricsScope({ token: 'token', store_id: store })).rejects.toMatchObject({ status: 404 });
});
