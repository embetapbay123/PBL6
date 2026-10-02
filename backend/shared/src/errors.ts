import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
export class ApiError extends HttpException {
  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super({ code, message, details:details.slice(0,100) }, status);
  }
}
export function notImplemented(operation: string): never {
  throw new ApiError(501, 'FEATURE_NOT_IMPLEMENTED', `Chức năng ${operation} đang chờ triển khai.`);
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const raw = error instanceof HttpException ? error.getResponse() : {};
    const data = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
    const codes: Record<number, string> = {400:'BAD_REQUEST',401:'UNAUTHENTICATED',403:'FORBIDDEN',404:'NOT_FOUND',429:'RATE_LIMITED',503:'DEPENDENCY_UNAVAILABLE'};
    const correlation=(req as any).correlationId ?? randomUUID();
    res.setHeader('X-Correlation-Id',correlation);
    res.status(status).json({ code: data.code ?? codes[status] ?? 'INTERNAL_ERROR',
      message: status===400 && !(error instanceof ApiError) ? 'JSON hoặc yêu cầu không hợp lệ.' : data.message ?? (status === 500 ? 'Hệ thống gặp lỗi. Vui lòng thử lại.' : 'Yêu cầu không hợp lệ.'),
      correlation_id: correlation, details: data.details ?? [] });
  }
}
