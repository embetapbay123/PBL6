import { productResponse, categoryResponse, productTypeResponse } from '../../catalog-service/src/catalog/catalog.mapper';

test('categoryResponse omits a null parent instead of sending null', () => {
  expect(categoryResponse({ id: 'c', name: 'Demo', status: 'ACTIVE', parent_id: null }))
    .toEqual({ id: 'c', name: 'Demo', status: 'ACTIVE' });
  expect(categoryResponse({ id: 'c', name: 'Demo', status: 'ACTIVE', parent_id: 'p' }).parent_id).toBe('p');
});

test('productTypeResponse maps variant_factor to variant_axis and skips absent optionals', () => {
  const definition = { id: 'd', product_type_id: 't', code: 'size', name: 'Size', data_type: 'STRING',
    required: true, variant_factor: true, allowed_values: ['S', 'M'], unit: null };
  expect(productTypeResponse({ id: 't', name: 'Demo type', status: 'ACTIVE', category_id: null }, [definition]))
    .toEqual({ id: 't', name: 'Demo type', status: 'ACTIVE', attribute_definitions: [
      { id: 'd', product_type_id: 't', code: 'size', name: 'Size', data_type: 'STRING', required: true,
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

test('public availability zero is real while absent or invalid legacy availability stays omitted',()=>{
 const row={id:'p',store_id:'s',product_type_id:'t',title:'A',attributes:{},status:'ACTIVE',moderation_status:'VISIBLE',version:0,variant_axes:[{code:'size',name:'Cỡ'}]};
 const variant={id:'v',product_id:'p',sku:'SKU',price_vnd:'100',variant_values:{size:'M'},status:'ACTIVE'};
 for(const available of [0,1,2147483647])expect(productResponse(row,[{...variant,available_quantity:available}]).variants?.[0].available_quantity).toBe(available);
 for(const available of [undefined,null,-1,NaN,Infinity,0.5,'4'])expect(productResponse(row,[{...variant,available_quantity:available}]).variants?.[0]).not.toHaveProperty('available_quantity');
 expect(productResponse(row,[variant]).variant_axes).toEqual([{code:'size',name:'Cỡ'}]);expect(productResponse({...row,variant_axes:undefined},[variant])).not.toHaveProperty('variant_axes');
});

test('productResponse correctly projects sold_count', () => {
  const row = { id: 'p', store_id: 's', product_type_id: 't', title: 'A', attributes: {},
    status: 'ACTIVE', moderation_status: 'VISIBLE', version: 0, sold_count: 42 };
  expect(productResponse(row, []).sold_count).toBe(42);
  expect(productResponse({ ...row, sold_count: undefined }, []).sold_count).toBe(0);
});
