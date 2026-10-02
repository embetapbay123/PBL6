import { ApiError } from './errors';
export async function internalRequest<T>(url: string, caller: string, key: string, correlationId: string, body?: unknown, timeout = 1000): Promise<T> {
  try {
    const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Id': caller, 'X-Service-Key': key, 'X-Correlation-Id': correlationId },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      if (response.status === 401 && url.endsWith('/internal/context')) {
        const error = await response.json() as {code?:string};
        if (error.code === 'SESSION_REVOKED' || error.code === 'UNAUTHENTICATED') throw new ApiError(401,error.code,'Phiên đăng nhập đã bị thu hồi.');
      }
      if (response.status === 401 || response.status === 403) throw new ApiError(503, 'SERVICE_AUTH_FAILED', 'Không xác minh được kết nối nội bộ.');
      throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Dịch vụ liên quan chưa sẵn sàng.');
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Dịch vụ liên quan không phản hồi.');
  }
}
