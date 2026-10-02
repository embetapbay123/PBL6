import { ApiError } from './errors';
export async function internalRequest<T>(url: string, caller: string, key: string, correlationId: string, body?: unknown, timeout = 1000): Promise<T> {
  try {
    const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Id': caller, 'X-Service-Key': key, 'X-Correlation-Id': correlationId },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      const error = await response.json().catch(()=>({})) as {code?:string;message?:string;details?:unknown[]};
      if ((response.status === 401 || response.status === 403) && (!error.code || ['INVALID_SERVICE_IDENTITY','SERVICE_AUTH_FAILED'].includes(error.code))) throw new ApiError(503, 'SERVICE_AUTH_FAILED', 'Không xác minh được kết nối nội bộ.');
      if ([401,403,404,409,422,501].includes(response.status)) throw new ApiError(response.status,error.code ?? 'DEPENDENCY_REJECTED',error.message ?? 'Dịch vụ liên quan từ chối yêu cầu.',Array.isArray(error.details)?error.details:[]);
      throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Dịch vụ liên quan chưa sẵn sàng.');
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Dịch vụ liên quan không phản hồi.');
  }
}
