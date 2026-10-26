import 'reflect-metadata';
import { Module, Controller, Get, Header, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import Redis from 'ioredis';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import { config, ServiceId } from './config';
import { database, initializeDatabase } from './database';
import { ApiError, ErrorFilter } from './errors';
import { RequestContractInterceptor } from './request-contract';
import contractBundle from './contracts.runtime.generated.json';
import { AuthService } from '../../identity-store-service/src/auth/auth.service';
import { createEmailAdapter } from '../../identity-store-service/src/auth/smtp-email.adapter';
import { rateBudget } from './rate-budget';

const registry = new Registry();
collectDefaultMetrics({ register: registry });
const requests = new Counter({ name: 'pbl6_http_requests_total', help: 'HTTP responses', labelNames: ['service','route','status'], registers: [registry] });
const latency = new Histogram({ name: 'pbl6_http_duration_seconds', help: 'HTTP latency', labelNames: ['service','route'], registers: [registry] });
export function createRuntimeAuthService(id: ServiceId, env: NodeJS.ProcessEnv = process.env) {
  return id === 'M3' ? new AuthService(createEmailAdapter(env)) : new AuthService();
}
@Controller()
class HealthController {
  @Get('health/live') live() { return { status: 'alive', service: process.env.SERVICE_ID }; }
  @Get('health/ready') async ready() {
    const [row]=await database.query("SELECT version FROM schema_migration WHERE version='001_initial.sql'");
    if(!row)throw new ApiError(503,'SCHEMA_NOT_READY','Chưa chạy migration.');
    return { status: 'ready', service: process.env.SERVICE_ID };
  }
  @Get('metrics') @Header('Content-Type','text/plain; version=0.0.4; charset=utf-8')
  async metrics() { return registry.metrics(); }
}
export async function bootstrap(id: ServiceId, controllers: any[]) {
  const c = config(id);
  // M3 must have a real, explicitly configured delivery service before accepting traffic.
  const authService = createRuntimeAuthService(id);
  await initializeDatabase();
  @Module({ controllers: [HealthController, ...controllers], providers: [{ provide: AuthService, useValue: authService }] }) class ApplicationModule {}
  const app = await NestFactory.create(ApplicationModule, { rawBody: true, logger: ['error','warn'] });
  app.enableShutdownHooks();
  const redis = new Redis(c.redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  redis.on('error', () => {});
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet()); app.use(cookieParser());
  app.enableCors({ origin: c.origin, credentials: true, exposedHeaders: ['X-Correlation-Id'] });
  app.use((req: any, res: any, next: any) => {
    const input = req.headers['x-correlation-id'];
    req.correlationId = typeof input === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(input) ? input : randomUUID();
    res.setHeader('X-Correlation-Id', req.correlationId);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const route = req.route?.path ?? 'unmatched';
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      requests.inc({service:id,route,status:String(res.statusCode)}); latency.observe({service:id,route},seconds);
      process.stdout.write(JSON.stringify({ time:new Date().toISOString(), service:id, route, status:res.statusCode,
        duration_ms:Math.round(seconds*1000), correlation_id:req.correlationId })+'\n');
    }); next();
  });
  app.use(async (req: any, res: any, next: any) => {
    if (!req.path.startsWith('/api/v1')) return next();
    try {
      const budget = rateBudget(id, req.method, req.path, req.ip, req.headers, c.internalKeys);
      const emailAction = ['/api/v1/auth/register', '/api/v1/auth/reset-password'].includes(req.path);
      const tokenAction = ['/api/v1/auth/verify-email', '/api/v1/auth/reset-password/confirm'].includes(req.path);
      const windowSeconds = emailAction ? 3600 : 60;
      const bucket = Math.floor(Date.now()/(windowSeconds*1000));
      const scope = emailAction ? 'email-action:'+req.ip : tokenAction ? 'token-action:'+req.ip : budget.scope;
      const limit = emailAction ? 10 : tokenAction ? 30 : budget.limit;
      const key = `rate:${id}:${scope}:${bucket}`;
      const count = Number(await redis.eval(`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],${windowSeconds}) end; return n`,1,key));
      if (count > limit) { res.setHeader('Retry-After',String(windowSeconds)); return res.status(429).json({code:'RATE_LIMITED',message:'Please retry later.',correlation_id:req.correlationId,details:[]}); }
      next();
    } catch (error) {
      if (error instanceof ApiError) return res.status(error.getStatus()).json({...error.getResponse() as object,correlation_id:req.correlationId});
      res.status(503).json({code:'DEPENDENCY_UNAVAILABLE',message:'Bộ giới hạn truy cập chưa sẵn sàng.',correlation_id:req.correlationId,details:[]});
    }
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health/live','health/ready','metrics',...Object.values(contractBundle.operations).filter(r=>r.internal && r.service===id).map(r=>r.route.slice(1))] });
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalInterceptors(new RequestContractInterceptor());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
    exceptionFactory: errors => new ApiError(422,'VALIDATION_FAILED','Dữ liệu không hợp lệ.',errors.map(e => ({field:e.property,reason:Object.values(e.constraints ?? {}).join(', ')}))) }));
  await app.listen(c.port, '0.0.0.0');
  const close = app.close.bind(app);
  app.close = async () => { await redis.quit(); if(database.isInitialized) await database.destroy(); return close(); };
  return app;
}
