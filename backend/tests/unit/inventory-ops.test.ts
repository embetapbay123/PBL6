import { hasInventoryPermission } from '../../catalog-service/src/inventory/inventory.service';
import { inventoryBalance, stockMovementView } from '../../catalog-service/src/inventory/inventory.mapper';

describe('store inventory permission (RBAC)', () => {
  test('an Owner always manages stock', () => {
    expect(hasInventoryPermission('OWNER', [])).toBe(true);
  });

  test('a Seller needs the inventory.store permission group', () => {
    expect(hasInventoryPermission('SELLER', ['inventory.store.*'])).toBe(true);
    expect(hasInventoryPermission('SELLER', ['inventory.store.read_adjust'])).toBe(true);
    // Revoking the group must deny access even while an old JWT is still valid.
    expect(hasInventoryPermission('SELLER', [])).toBe(false);
    expect(hasInventoryPermission('SELLER', ['product.store.*'])).toBe(false);
    expect(hasInventoryPermission(undefined, ['inventory.store.*'])).toBe(false);
  });
});

describe('inventory mappers', () => {
  test('adjustment balance derives availability and clamps it at the contract minimum', () => {
    expect(inventoryBalance({ variant_id: 'v', quantity: 12, reserved_quantity: 5, version: 3 }))
      .toEqual({ variant_id: 'v', quantity: 12, reserved_quantity: 5, available_quantity: 7, version: 3 });
    expect(inventoryBalance({ variant_id: 'v', quantity: 2, reserved_quantity: 5, version: 0 }).available_quantity).toBe(0);
  });

  test('movement view omits optional fields instead of sending null', () => {
    const view = stockMovementView({ id: 'm', variant_id: 'v', order_id: null, delta_quantity: -3,
      reason: 'Hao hụt', occurred_at: new Date('2030-01-01T00:00:00Z') });
    expect(view).toEqual({ id: 'm', variant_id: 'v', delta_quantity: -3, reason: 'Hao hụt',
      occurred_at: '2030-01-01T00:00:00.000Z' });
    expect('order_id' in view).toBe(false);
  });

  test('movement view keeps an order id when the movement belongs to one', () => {
    const view = stockMovementView({ id: 'm', variant_id: 'v', order_id: 'order-1', delta_quantity: 2,
      reason: 'RESERVE', occurred_at: '2030-01-01T00:00:00.000Z' });
    expect(view.order_id).toBe('order-1');
    expect(view.occurred_at).toBe('2030-01-01T00:00:00.000Z');
  });
});
