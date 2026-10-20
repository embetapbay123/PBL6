import { hasProductPermission } from '../../catalog-service/src/catalog/catalog.service';

test('an Owner always manages the Store catalogue', () => {
  expect(hasProductPermission('OWNER', [])).toBe(true);
});

test('a Seller needs the product.store permission group', () => {
  expect(hasProductPermission('SELLER', ['product.store.*'])).toBe(true);
  expect(hasProductPermission('SELLER', ['product.store.write'])).toBe(true);
  // Revoking the group must deny access even while an old JWT is still valid.
  expect(hasProductPermission('SELLER', [])).toBe(false);
  expect(hasProductPermission('SELLER', ['inventory.store.*'])).toBe(false);
  // A role-less member of nothing can never manage products.
  expect(hasProductPermission(undefined, ['product.store.*'])).toBe(false);
});
