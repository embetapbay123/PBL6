/** Match PostgreSQL marketplace_search; preserve display text and treat LIKE metacharacters literally. */
export function searchPattern(value?:string):string|undefined{
 const term=value?.trim();
 if(!term)return undefined;
 const normalized=term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 return '%'+normalized.replace(/[\\%_]/g,'\\$&')+'%';
}

export function searchNormalized(value?: string): string | undefined {
  const term = value?.trim();
  if (!term) return undefined;
  return term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

export function searchRegexPattern(value?: string): string | undefined {
  const normalized = searchNormalized(value);
  if (!normalized) return undefined;
  return normalized.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
