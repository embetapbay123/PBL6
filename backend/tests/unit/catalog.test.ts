import { productResponse, categoryResponse, productTypeResponse } from '../../catalog-service/src/catalog/catalog.mapper';

test('categoryResponse omits a null parent instead of sending null', () => {
  expect(categoryResponse({ id: 'c', name: 'Demo', status: 'ACTIVE', parent_id: null }))
    .toEqual({ id: 'c', name: 'Demo', status: 'ACTIVE' });
  expect(categoryResponse({ id: 'c', name: 'Demo', status: 'ACTIVE', parent_id: 'p' }).parent_id).toBe('p');
});

test('productTypeResponse maps variant_factor to variant_axis and skips absent optionals', () => {
  const definition = { id: 'd', product_type_id: 't', name: 'Size', data_type: 'STRING',
    required: true, variant_factor: true, allowed_values: ['S', 'M'], unit: null };
  expect(productTypeResponse({ id: 't', name: 'Demo type', status: 'ACTIVE', category_id: null }, [definition]))
    .toEqual({ id: 't', name: 'Demo type', status: 'ACTIVE', attribute_definitions: [
      { id: 'd', product_type_id: 't', name: 'Size', data_type: 'STRING', required: true,
        variant_axis: true, allowed_values: ['S', 'M'] },
    ] });
  // A non-array allowed_values must be dropped, not forwarded as an object.
  expect(productTypeResponse({ id: 't', name: 'T', status: 'ACTIVE', category_id: 'c' },
    [{ ...definition, allowed_values: { bad: true }, unit: 'cm' }]).attribute_definitions[0])
    .toMatchObject({ unit: 'cm' });
});

test('productResponse attaches only the images and variants of the same product', () => {
  const response = productResponse(
    { id: 'p1', store_id: 's', product_type_id: 't', title: 'A', description: null, attributes: {},
      status: 'ACTIVE', moderation_status: 'VISIBLE', version: 0 },
    [{ id: 'v1', product_id: 'p1', sku: 'SKU-1', price_vnd: '100000', variant_values: {}, is_default: true, status: 'ACTIVE' },
      { id: 'v2', product_id: 'p2', sku: 'SKU-2', price_vnd: '1', variant_values: {}, is_default: false, status: 'ACTIVE' }],
    [{ id: 'i1', product_id: 'p1', image_url: 'https://example.test/a.png', position: 0 },
      { id: 'i2', product_id: 'p2', image_url: 'https://example.test/b.png', position: 0 }]);
  expect(response.variants).toHaveLength(1);
  expect(response.variants![0]).toMatchObject({ id: 'v1', price_vnd: 100000 });
  expect(response.images).toEqual([{ id: 'i1', product_id: 'p1', image_url: 'https://example.test/a.png', position: 0 }]);
});
