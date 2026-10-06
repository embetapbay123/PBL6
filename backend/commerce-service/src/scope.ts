import { ApiError } from '../../shared/src/errors';

export function requireStorePermission(auth: any, permission: string): string {
  const membership = auth?.store_membership;
  if (!auth?.user_id || !membership?.store_id ||
      (membership.role !== 'OWNER' && !membership.permissions?.includes(permission))) {
    throw new ApiError(403, 'FORBIDDEN', 'Không có quyền thực hiện thao tác trong Store.');
  }
  return membership.store_id;
}

export function accessToken(auth: any): string {
  if (!auth?.access_token) throw new ApiError(401, 'UNAUTHENTICATED', 'Thiếu phiên đăng nhập hiện hành.');
  return auth.access_token;
}
