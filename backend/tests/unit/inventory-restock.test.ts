import { restockMatches } from '../../catalog-service/src/inventory/inventory.service';

const consumed = [{ variant_id: 'a', quantity: 2 }, { variant_id: 'b', quantity: 3 }];

test('an exact restock request matches the consumed lines', () => {
  expect(restockMatches(consumed, [{ variant_id: 'a', quantity: 2 }, { variant_id: 'b', quantity: 3 }])).toBe(true);
});

test('splitting a line keeps the totals comparable', () => {
  expect(restockMatches(consumed, [{ variant_id: 'a', quantity: 1 }, { variant_id: 'a', quantity: 1 },
    { variant_id: 'b', quantity: 3 }])).toBe(true);
});

test('a wrong quantity, a missing Variant or an extra Variant does not match', () => {
  expect(restockMatches(consumed, [{ variant_id: 'a', quantity: 3 }, { variant_id: 'b', quantity: 3 }])).toBe(false);
  expect(restockMatches(consumed, [{ variant_id: 'a', quantity: 2 }])).toBe(false);
  expect(restockMatches(consumed, [{ variant_id: 'a', quantity: 2 }, { variant_id: 'b', quantity: 3 },
    { variant_id: 'c', quantity: 1 }])).toBe(false);
  expect(restockMatches(consumed, [])).toBe(false);
});
