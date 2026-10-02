import { ApiError } from './errors';
// Boundary mapper only; arithmetic in business code must stay integral/BigInt.
export function moneyNumber(value: string | number | bigint): number {
  if (typeof value === 'string' && !/^-?\d+$/.test(value)) throw new ApiError(500,'INVALID_MONEY','Dữ liệu tiền không hợp lệ.');
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new ApiError(500,'INVALID_MONEY','Dữ liệu tiền vượt giới hạn API.');
  return result;
}
