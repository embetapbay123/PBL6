import { createHash } from 'node:crypto';

export interface AttributeDefinitionRow {
  code: string;
  required: boolean;
  data_type?:string;
  allowed_values?:unknown[];
  variant_factor?:boolean;
}

/**
 * Attribute keys must belong to the Product type's taxonomy, and every attribute declared as
 * required must be present. Without this a Seller could store arbitrary JSON that no form, filter
 * or Variant axis could ever interpret.
 */
export function attributeErrors(attributes: Record<string, unknown>, definitions: AttributeDefinitionRow[]): string[] {
  const known = new Set(definitions.map(definition => definition.code));
  const errors = Object.keys(attributes).filter(key => !known.has(key)).map(key => 'unknown:' + key);
  for (const definition of definitions) {
    if (definition.required && attributes[definition.code] === undefined) errors.push('missing:' + definition.code);
    const value=attributes[definition.code];
    if(value!==undefined){
      if(definition.data_type==='STRING' && typeof value!=='string' || definition.data_type==='NUMBER' && (typeof value!=='number'||!Number.isFinite(value)) || definition.data_type==='BOOLEAN' && typeof value!=='boolean')errors.push('type:'+definition.code);
      if(Array.isArray(definition.allowed_values)&&definition.allowed_values.length&&!definition.allowed_values.includes(value))errors.push('value:'+definition.code);
    }
  }
  return errors;
}

/**
 * `product_variant.variant_signature` is NOT NULL and unique per Product, so the same combination of
 * attribute values cannot appear twice. Keys are sorted first so `{a,b}` and `{b,a}` hash equally.
 */
export function variantSignature(values: Record<string, unknown>): string {
  const canonical = Object.keys(values).sort().map(key => [key, values[key] as unknown]);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** At most one Variant of a Product may be the default (`variant_default_unique`). */
export function defaultVariantCount(variants: { is_default?: boolean }[]): number {
  return variants.filter(variant => variant.is_default === true).length;
}
