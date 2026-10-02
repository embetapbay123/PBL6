import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { config, ServiceId } from './config';
import { ApiError } from './errors';
import { internalRequest } from './http-client';
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const ServiceCallers = (...ids: (ServiceId | 'M4')[]) => SetMetadata('service_callers', ids);
export function verifyToken(token: string, publicKey: string) {
  try {
    const claims = jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: 'pbl6-identity', audience: 'pbl6-clients' });
    if (typeof claims === 'string' || typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw new Error();
    return claims;
  } catch { throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ.'); }
}
export function verifyService(headers: Record<string, any>, keys: Record<string, string>, allowed: string[]) {
  const id = headers['x-service-id']; const value = headers['x-service-key'];
  if (typeof id !== 'string' || !allowed.includes(id) || typeof value !== 'string' || !keys[id]) throw new ApiError(401, 'INVALID_SERVICE_IDENTITY', 'Không xác thực được service.');
  const a = Buffer.from(value); const b = Buffer.from(keys[id]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiError(401, 'INVALID_SERVICE_IDENTITY', 'Không xác thực được service.');
  return id;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride('public', [ctx.getHandler(), ctx.getClass()])) return true;
    const request = ctx.switchToHttp().getRequest();
    const c = config(process.env.SERVICE_ID as ServiceId);
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');
    verifyToken(token, c.publicKey);
    const context = await internalRequest<any>(`${c.identityUrl}/internal/context`, c.id, c.internalKeys[c.id], request.correlationId, { token });
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.some(role => context.roles.includes(role))) throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
    request.auth = context;
    return true;
  }
}
@Injectable()
export class ServiceGuard implements CanActivate {
  constructor(private readonly reflector:Reflector) {}
  canActivate(ctx:ExecutionContext) {
    const request=ctx.switchToHttp().getRequest();
    const allowed=this.reflector.getAllAndOverride<string[]>('service_callers',[ctx.getHandler(),ctx.getClass()]) ?? [];
    request.caller=verifyService(request.headers,config(process.env.SERVICE_ID as ServiceId).internalKeys,allowed);
    return true;
  }
}
