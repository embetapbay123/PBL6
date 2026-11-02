import { createHash } from 'node:crypto';

export interface AttributeDefinitionRow {
  code: string;
  required: boolean;
  data_type?: string;
  allowed_values?: unknown;
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
    const value=attributes[definition.code];
    if (definition.required && (value===undefined || value===null || typeof value==='string'&&value.trim()==='')) {
      errors.push('missing:' + definition.code);continue;
    }
    if(value===undefined)continue;
    const kind=definition.data_type?.toUpperCase();
    if((kind==='NUMBER' && (typeof value!=='number' || !Number.isFinite(value)))
      || (kind==='BOOLEAN' && typeof value!=='boolean')
      || ((kind==='STRING'||kind==='TEXT') && typeof value!=='string')) {
      errors.push('type:' + definition.code);continue;
    }
    if(Array.isArray(definition.allowed_values) && definition.allowed_values.length
      && !definition.allowed_values.includes(String(value))) errors.push('allowed_values:' + definition.code);
  }
  return errors;
}

/** A descriptor of the Product is not automatically a Variant axis. */
export function variantAttributeErrors(values:Record<string,unknown>,definitions:AttributeDefinitionRow[]):string[]{
  if(!values||typeof values!=='object'||Array.isArray(values))return ['type:'];
  const axes=definitions.filter(d=>d.variant_factor===true),errors=attributeErrors(values,axes);
  for(const axis of axes){const value=values[axis.code];if(!axis.required&&typeof value==='string'&&!value.trim())errors.push('empty:'+axis.code);}
  return errors;
}

export function sameVariantValues(a:Record<string,unknown>,b:Record<string,unknown>):boolean{
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return JSON.stringify(a)===JSON.stringify(b);
  return variantSignature(a)===variantSignature(b);
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
