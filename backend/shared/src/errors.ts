import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
export class ApiError extends HttpException {
  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super({ code, message, details }, status);
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
    res.status(status).json({ code: data.code ?? codes[status] ?? 'INTERNAL_ERROR',
      message: data.message ?? (status === 500 ? 'Hệ thống gặp lỗi. Vui lòng thử lại.' : 'Yêu cầu không hợp lệ.'),
      correlation_id: (req as any).correlationId, details: data.details ?? [] });
  }
}
