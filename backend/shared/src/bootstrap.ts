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

const registry = new Registry();
collectDefaultMetrics({ register: registry });
const requests = new Counter({ name: 'pbl6_http_requests_total', help: 'HTTP responses', labelNames: ['service','route','status'], registers: [registry] });
const latency = new Histogram({ name: 'pbl6_http_duration_seconds', help: 'HTTP latency', labelNames: ['service','route'], registers: [registry] });
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
  await initializeDatabase();
  @Module({ controllers: [HealthController, ...controllers] }) class ApplicationModule {}
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
      const login = req.path === '/api/v1/auth/login';
      const bucket = Math.floor(Date.now()/60000);
      const key = `rate:${id}:${login ? 'login' : 'api'}:${req.ip}:${bucket}`;
      const count = Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",1,key));
      if (count > (login ? 30 : 600)) { res.setHeader('Retry-After','60'); return res.status(429).json({code:'RATE_LIMITED',message:'Vui lòng thử lại sau.',correlation_id:req.correlationId,details:[]}); }
      next();
    } catch { res.status(503).json({code:'DEPENDENCY_UNAVAILABLE',message:'Bộ giới hạn truy cập chưa sẵn sàng.',correlation_id:req.correlationId,details:[]}); }
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health/live','health/ready','metrics','internal/context','internal/stores/active','internal/variants/quote','internal/inventory/reserve','internal/inventory/consume','internal/inventory/release','internal/inventory/restock','internal/reviews/eligibility'] });
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
    exceptionFactory: errors => new ApiError(422,'VALIDATION_FAILED','Dữ liệu không hợp lệ.',errors.map(e => ({field:e.property,reason:Object.values(e.constraints ?? {}).join(', ')}))) }));
  await app.listen(c.port, '0.0.0.0');
  const close = app.close.bind(app);
  app.close = async () => { await redis.quit(); if(database.isInitialized) await database.destroy(); return close(); };
  return app;
}
