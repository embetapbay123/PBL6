import { attributeErrors, defaultVariantCount, variantSignature } from '../../catalog-service/src/catalog/catalog.validation';

describe('attribute validation against the Product type taxonomy', () => {
  const definitions = [{ code: 'color', required: true }, { code: 'size', required: false }];

  test('accepts defined keys and satisfies required ones', () => {
    expect(attributeErrors({ color: 'red' }, definitions)).toEqual([]);
    expect(attributeErrors({ color: 'red', size: 'M' }, definitions)).toEqual([]);
  });

  test('rejects keys the taxonomy does not define', () => {
    expect(attributeErrors({ color: 'red', weight: 1 }, definitions)).toEqual(['unknown:weight']);
  });

  test('rejects a missing required attribute', () => {
    expect(attributeErrors({ size: 'M' }, definitions)).toEqual(['missing:color']);
    expect(attributeErrors({}, definitions)).toEqual(['missing:color']);
  });

  test('an empty taxonomy only allows an empty attribute map', () => {
    expect(attributeErrors({}, [])).toEqual([]);
    expect(attributeErrors({ anything: 1 }, [])).toEqual(['unknown:anything']);
  });
});

describe('variant signature', () => {
  test('is stable across key order and differs for different values', () => {
    expect(variantSignature({ color: 'red', size: 'M' })).toBe(variantSignature({ size: 'M', color: 'red' }));
    expect(variantSignature({ color: 'red' })).not.toBe(variantSignature({ color: 'blue' }));
    expect(variantSignature({})).toHaveLength(64);
  });
});

test('at most one Variant may be the default', () => {
  expect(defaultVariantCount([{ is_default: true }, { is_default: false }])).toBe(1);
  expect(defaultVariantCount([{ is_default: true }, { is_default: true }])).toBe(2);
  expect(defaultVariantCount([{}, { is_default: undefined }])).toBe(0);
});
