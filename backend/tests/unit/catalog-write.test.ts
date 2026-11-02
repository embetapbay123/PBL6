import { attributeErrors, defaultVariantCount, variantSignature,variantAttributeErrors } from '../../catalog-service/src/catalog/catalog.validation';

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
  test('validates numeric and boolean types without treating zero or false as missing',()=>{
    const typed=[{code:'weight',required:true,data_type:'NUMBER'},{code:'fragile',required:true,data_type:'BOOLEAN'}];
    expect(attributeErrors({weight:0,fragile:false},typed)).toEqual([]);
    expect(attributeErrors({weight:'2',fragile:'false'},typed)).toEqual(['type:weight','type:fragile']);
    expect(attributeErrors({weight:Infinity,fragile:null},typed)).toEqual(['type:weight','missing:fragile']);
  });
  test('rejects blank required values and values outside the defined choices',()=>{
    const choices=[{code:'color',required:true,data_type:'STRING',allowed_values:['red','blue']}];
    expect(attributeErrors({color:''},choices)).toEqual(['missing:color']);
    expect(attributeErrors({color:'green'},choices)).toEqual(['allowed_values:color']);
    expect(attributeErrors({color:'red'},choices)).toEqual([]);
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

describe('Variant axes are a typed subset of the Product taxonomy',()=>{
 const defs=[{code:'color',required:true,variant_factor:true,data_type:'STRING',allowed_values:['red','blue']},{code:'width',required:false,variant_factor:true,data_type:'NUMBER'},{code:'coated',required:false,variant_factor:true,data_type:'BOOLEAN'},{code:'material',required:true,variant_factor:false,data_type:'STRING'}];
 test('zero and false remain valid typed values; a Product descriptor is not required on each Variant',()=>{expect(variantAttributeErrors({color:'red',width:0,coated:false},defs)).toEqual([]);});
 test.each([{}, {color:' '}, {color:null}])('missing required color is rejected (%j)',values=>{expect(variantAttributeErrors(values,defs)).toContain('missing:color');});
 test('undeclared and non-axis descriptors are rejected',()=>{expect(variantAttributeErrors({color:'red',material:'Cotton',serial:'x'},defs)).toEqual(['unknown:material','unknown:serial']);});
 test.each([{color:4},{color:'red',width:'0'},{color:'red',coated:'false'}])('does not coerce incorrectly typed axis input (%j)',values=>{expect(variantAttributeErrors(values,defs).some(e=>e.startsWith('type:'))).toBe(true);});
 test('choice must be configured and optional blank strings must be omitted',()=>{expect(variantAttributeErrors({color:'green'},defs)).toEqual(['allowed_values:color']);expect(variantAttributeErrors({color:'red',note:' '},[...defs,{code:'note',required:false,variant_factor:true,data_type:'STRING'}])).toEqual(['empty:note']);});
 test('a type with no axes accepts only its standard empty combination',()=>{expect(variantAttributeErrors({},[])).toEqual([]);expect(variantAttributeErrors({color:'red'},[])).toEqual(['unknown:color']);});
 test.each([null,[],42])('invalid historical JSON receives a field error (%j)',values=>{expect(variantAttributeErrors(values as any,defs)).toEqual(['type:']);});
});
