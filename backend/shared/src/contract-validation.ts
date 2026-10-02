import { ApiError } from './errors';
export type Schema = Record<string, any>;
export type Detail = { field: string; reason: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datetime = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/;

// Supported OpenAPI keywords are validated recursively, including open typed maps.
// class-validator DTOs use this same predicate; there is no JSON body coercion.
export function schemaErrors(value: unknown, schema: Schema, field = '', required = true): Detail[] {
  const errors: Detail[] = [];
  const fail = (reason: string) => errors.push({ field: field || '$', reason });
  if (value === undefined) { if (required) fail('required'); return errors; }
  if (value === null) { if (!schema.nullable) fail('null is not allowed'); return errors; }
  if (schema.enum && !schema.enum.includes(value)) fail('invalid enum value');
  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) { fail('expected object'); break; }
      const object = value as Record<string, unknown>;
      const properties = schema.properties ?? {};
      for (const [key, child] of Object.entries(properties)) {
        errors.push(...schemaErrors(object[key], child as Schema, field ? `${field}.${key}` : key, (schema.required ?? []).includes(key)));
      }
      for (const key of Object.keys(object)) {
        if (Object.prototype.hasOwnProperty.call(properties,key)) continue;
        if (schema['x-key-format'] === 'uuid' && !uuid.test(key)) fail('map key must be UUID');
        if (schema.additionalProperties === false || schema.additionalProperties === undefined) fail('unknown field: ' + key);
        else if (typeof schema.additionalProperties === 'object') errors.push(...schemaErrors(object[key], schema.additionalProperties, field ? `${field}.${key}` : key));
      }
      if (schema.minProperties !== undefined && Object.keys(object).length < schema.minProperties) fail('too few properties');
      if (schema.maxProperties !== undefined && Object.keys(object).length > schema.maxProperties) fail('too many properties');
      break;
    }
    case 'array':
      if (!Array.isArray(value)) { fail('expected array'); break; }
      if (schema.minItems !== undefined && value.length < schema.minItems) fail('too few items');
      if (schema.maxItems !== undefined && value.length > schema.maxItems) fail('too many items');
      if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail('duplicate items');
      value.forEach((v, i) => errors.push(...schemaErrors(v, schema.items ?? {}, `${field}[${i}]`)));
      break;
    case 'integer': case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isSafeInteger(value))) { fail('expected safe numeric value'); break; }
      if (schema.minimum !== undefined && value < schema.minimum) fail('below minimum');
      if (schema.maximum !== undefined && value > schema.maximum) fail('above maximum');
      break;
    case 'boolean': if (typeof value !== 'boolean') fail('expected boolean'); break;
    case 'string':
      if (typeof value !== 'string') { fail('expected string'); break; }
      if (schema.minLength !== undefined && [...value].length < schema.minLength) fail('too short');
      if (schema.maxLength !== undefined && [...value].length > schema.maxLength) fail('too long');
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail('invalid pattern');
      if (schema.format === 'uuid' && !uuid.test(value)) fail('invalid UUID');
      if (schema.format === 'date-time' && (!datetime.test(value) || !Number.isFinite(Date.parse(value)))) fail('invalid datetime');
      if (schema.format === 'date-time' && datetime.test(value)) {
        const [y,m,d]=value.slice(0,10).split('-').map(Number);
        const date=new Date(0);date.setUTCFullYear(y,m-1,d);
        if(date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d)fail('invalid calendar date');
        const [h,min,sec]=value.slice(11,19).split(':').map(Number);
        if(h>23 || min>59 || sec>59)fail('invalid clock time');
      }
      if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('invalid email');
      if (schema.format === 'uri') { try { new URL(value); } catch { fail('invalid URI'); } }
      break;
  }
  return errors;
}
export const valueMatches = (value: unknown, schema: Schema, required: boolean) => schemaErrors(value, schema, '', required).length === 0;
export function assertSchema(value: unknown, schema: Schema, required = true) {
  const details = schemaErrors(value, schema, '', required);
  if (details.length) throw new ApiError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', details);
}
// Only wire query/path/header scalar values are normalized. JSON remains strict.
export function normalizeParameters(input: Record<string, unknown>, schema: Schema): Record<string, unknown> {
  const result = { ...input };
  for (const [key, raw] of Object.entries(schema.properties ?? {})) {
    const spec = raw as Schema;
    if (result[key] === undefined && spec.default !== undefined) result[key] = spec.default;
    const value = result[key];
    if (typeof value === 'string' && spec.type === 'integer' && /^-?\d+$/.test(value)) result[key] = Number(value);
    if (typeof value === 'string' && spec.type === 'number' && /^-?\d+(?:\.\d+)?$/.test(value)) result[key] = Number(value);
    if (spec.type === 'boolean' && (value === 'true' || value === 'false')) result[key] = value === 'true';
  }
  return result;
}
