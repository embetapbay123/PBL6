export function parseVariantPrice(input: string): number | undefined {
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : undefined;
}
