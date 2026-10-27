import { ApiError } from '../../../shared/src/errors';

/** Types an attribute definition may declare; anything else cannot be validated or rendered. */
export const ATTRIBUTE_DATA_TYPES = ['STRING', 'NUMBER', 'BOOLEAN'] as const;

/**
 * Stable URL slug for a category. Vietnamese diacritics are folded first so two names that differ
 * only by accent do not produce two categories that look identical in the storefront.
 */
export function taxonomySlug(value: string): string {
  const folded = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  // A name made only of punctuation would otherwise collapse to an empty slug.
  return folded || 'item';
}

/** Attribute codes are `snake_case` and unique per Product type. */
export function attributeCode(value: string): string {
  return (taxonomySlug(value).replace(/-/g, '_') || 'attribute').slice(0, 200);
}

export function assertDataType(value: unknown): string {
  if (typeof value !== 'string' || !ATTRIBUTE_DATA_TYPES.includes(value as typeof ATTRIBUTE_DATA_TYPES[number])) {
    throw new ApiError(422, 'INVALID_DATA_TYPE', 'data_type must be one of ' + ATTRIBUTE_DATA_TYPES.join(', ') + '.');
  }
  return value;
}

/**
 * A Category tree must stay a tree. Walking up from the proposed parent must never reach the node
 * being edited, and an already-broken chain is refused the same way so it cannot be extended.
 */
export function createsCategoryCycle(id: string, parentId: string, parents: Map<string, string | null>): boolean {
  let cursor: string | null | undefined = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === id || seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }
  return false;
}
