import { ApiError } from '../../shared/src/errors';
import { ATTRIBUTE_DATA_TYPES, assertDataType, attributeCode, createsCategoryCycle, taxonomySlug } from '../../catalog-service/src/moderation/taxonomy.validation';

describe('taxonomy slug', () => {
  test('folds Vietnamese diacritics and punctuation into a stable slug', () => {
    expect(taxonomySlug('Áo Thun Nam')).toBe('ao-thun-nam');
    expect(taxonomySlug('Điện thoại & Máy tính')).toBe('dien-thoai-may-tinh');
    expect(taxonomySlug('  Giày   thể thao  ')).toBe('giay-the-thao');
  });

  test('an empty or punctuation-only name still yields a usable slug', () => {
    expect(taxonomySlug('---')).toBe('item');
    expect(taxonomySlug('!!!')).toBe('item');
  });

  test('names that differ only by accent collapse to the same slug', () => {
    // This is exactly why the caller checks category_slug_unique before inserting.
    expect(taxonomySlug('Áo')).toBe(taxonomySlug('Ao'));
  });
});

describe('attribute code', () => {
  test('uses snake_case and stays unique per Product type', () => {
    expect(attributeCode('Kích thước')).toBe('kich_thuoc');
    expect(attributeCode('Size / Fit')).toBe('size_fit');
    expect(attributeCode('   ')).toBe('item');
  });
});

describe('data type guard', () => {
  test('accepts every declared type', () => {
    for (const type of ATTRIBUTE_DATA_TYPES) expect(assertDataType(type)).toBe(type);
  });

  test('refuses an unknown or missing type with a 422', () => {
    for (const value of ['DATE', 'string', '', undefined, 3]) {
      expect(() => assertDataType(value)).toThrow(ApiError);
      try { assertDataType(value); } catch (error) { expect((error as ApiError).getStatus()).toBe(422); }
    }
  });
});

describe('category cycle guard', () => {
  const parents = () => new Map<string, string | null>([
    ['root', null], ['child', 'root'], ['grandchild', 'child'],
  ]);

  test('accepts a parent that is not on the path to the node', () => {
    expect(createsCategoryCycle('child', 'root2', new Map([...parents(), ['root2', null]]))).toBe(false);
    expect(createsCategoryCycle('grandchild', 'root', parents())).toBe(false);
  });

  test('refuses making a node its own parent or ancestor', () => {
    expect(createsCategoryCycle('child', 'child', parents())).toBe(true);
    expect(createsCategoryCycle('root', 'grandchild', parents())).toBe(true);
  });

  test('refuses extending an already broken chain', () => {
    const broken = new Map<string, string | null>([['a', 'b'], ['b', 'a']]);
    expect(createsCategoryCycle('c', 'a', broken)).toBe(true);
  });
});
