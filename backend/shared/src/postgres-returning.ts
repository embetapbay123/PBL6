/**
 * Normalize the result of a PostgreSQL query that uses RETURNING.
 * TypeORM's PostgreSQL QueryRunner normally returns the rows array, while
 * direct pg QueryResult values and a few wrapped adapters expose `rows` or
 * `[rows, rowCount]`. Callers should use this only for RETURNING queries.
 */
export function returnedRow<T>(result: unknown): T | undefined {
  if (result && typeof result === 'object' && !Array.isArray(result) && 'rows' in result) {
    return returnedRow<T>((result as { rows: unknown }).rows);
  }
  if (!Array.isArray(result)) return undefined;
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return rows[0] as T | undefined;
}
