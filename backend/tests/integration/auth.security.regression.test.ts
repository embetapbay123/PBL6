import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Controller, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthController } from '../../identity-store-service/src/auth/auth.controller';
import { AuthService, digest, IEmailAdapter } from '../../identity-store-service/src/auth/auth.service';
import { AuthGuard } from '../../shared/src/auth';
import { ErrorFilter } from '../../shared/src/errors';
import { RequestContractInterceptor } from '../../shared/src/request-contract';
import { database } from '../../shared/src/database';

const dbUrl = process.env.M3_DATABASE_URL;
const describePostgres = dbUrl ? describe : describe.skip;

describePostgres('Authentication PostgreSQL and HTTP regressions', () => {
  let source: DataSource;
  let app: any;
  const userId = randomUUID();
  const email = `auth-regression-${userId}@example.test`;
  const delivered: Array<{ kind: string; email: string; token: string }> = [];
  const adapter: IEmailAdapter = {
    async sendVerificationEmail(to, token) { delivered.push({ kind: 'verify', email: to, token }); },
    async sendPasswordResetEmail(to, token) { delivered.push({ kind: 'reset', email: to, token }); },
  };

  beforeAll(async () => {
    source = new DataSource({ type: 'postgres', url: dbUrl });
    await source.initialize();
    process.env.SERVICE_ID = 'M3';
    process.env.M3_DATABASE_URL = dbUrl;
    await import('../../shared/src/database').then(module => module.initializeDatabase());
    @Controller() class TestAuthController extends AuthController {
      constructor() { super(new AuthService(adapter)); }
    }
    @Module({ controllers: [TestAuthController] }) class TestModule {}
    app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalGuards({ canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      if (req.path.endsWith('/auth/change-password')) req.auth = { user_id: userId };
      return true;
    } } as any);
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ErrorFilter());
    app.useGlobalInterceptors(new RequestContractInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const hash = await bcrypt.hash('Old-password-123', 10);
    await source.query(`INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,$3,'ACTIVE',now(),0)`, [userId, email, hash]);
  });

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query('DELETE FROM one_time_token WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM refresh_session WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await source.destroy();
    }
    if (app) await app.close();
    if (database?.isInitialized) await database.destroy();
  });

  test('HTTP reset email is delivered through injected adapter and reset invalidates all outstanding links', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({ email });
    expect(response.status).toBe(200);
    const resetDelivery = delivered.find(item => item.kind === 'reset')!;
    expect(resetDelivery.email).toBe(email);
    const oldToken = resetDelivery.token;
    await source.query(`INSERT INTO one_time_token(id,user_id,purpose,token_hash,expires_at,created_at) VALUES($1,$2,'PASSWORD_RESET',$3,now()+interval '15 minutes',now())`, [randomUUID(), userId, digest('second-old-reset-link')]);
    const confirmed = await request(app.getHttpServer()).post('/api/v1/auth/reset-password/confirm').send({ token: oldToken, new_password: 'New-password-123' });
    expect(confirmed.status).toBe(200);
    const replay = await request(app.getHttpServer()).post('/api/v1/auth/reset-password/confirm').send({ token: 'second-old-reset-link', new_password: 'Compromised-password-123' });
    expect(replay.status).toBe(400);
  });

  test('an authenticated password change invalidates previously issued reset links', async () => {
    await source.query('UPDATE "user" SET password_hash=$1,status=\'ACTIVE\' WHERE id=$2', [await bcrypt.hash('Change-old-123', 10), userId]);
    await source.query(`INSERT INTO one_time_token(id,user_id,purpose,token_hash,expires_at,created_at) VALUES($1,$2,'PASSWORD_RESET',$3,now()+interval '15 minutes',now())`, [randomUUID(), userId, digest('pre-change-reset-link')]);
    const changed = await request(app.getHttpServer()).post('/api/v1/auth/change-password').send({ current_password: 'Change-old-123', new_password: 'Change-new-123' });
    expect(changed.status).toBe(200);
    const replay = await request(app.getHttpServer()).post('/api/v1/auth/reset-password/confirm').send({ token: 'pre-change-reset-link', new_password: 'Reset-after-change-123' });
    expect(replay.status).toBe(400);
  });

  test('two concurrent HTTP password changes using the same old password have one winner', async () => {
    const hash = await bcrypt.hash('Concurrent-old-123', 10);
    await source.query('UPDATE "user" SET password_hash=$1,status=\'ACTIVE\',version=0 WHERE id=$2', [hash, userId]);
    const body = (new_password: string) => request(app.getHttpServer()).post('/api/v1/auth/change-password').send({ current_password: 'Concurrent-old-123', new_password });
    const results = await Promise.all([body('Concurrent-new-one-123'), body('Concurrent-new-two-123')]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
  });

  test('registration fails closed without configured adapter before creating a pending account', async () => {
    const { AuthService: Service } = await import('../../identity-store-service/src/auth/auth.service');
    const missingAdapter = new Service();
    const missingEmail = `no-adapter-${randomUUID()}@example.test`;
    await expect(missingAdapter.register(missingEmail, 'Password-123')).rejects.toMatchObject({ status: 503 });
    expect(await source.query('SELECT id FROM "user" WHERE email=$1', [missingEmail])).toHaveLength(0);
  });

  test('HTTP registration sends verification through the injected adapter without returning the token', async () => {
    const newEmail = `verify-${randomUUID()}@example.test`;
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: newEmail, password: 'Registration-123' });
    expect(response.status).toBe(201);
    const deliveredToken = delivered.find(item => item.kind === 'verify' && item.email === newEmail)?.token;
    expect(deliveredToken).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain(deliveredToken!);
    const [created] = await source.query('SELECT id FROM "user" WHERE email=$1', [newEmail]);
    expect(created).toBeDefined();
    const tokenRows = await source.query("SELECT token_hash FROM one_time_token WHERE user_id=$1 AND purpose='EMAIL_VERIFICATION'", [created.id]);
    expect(tokenRows).toHaveLength(1);
    expect(tokenRows[0].token_hash).toBe(digest(deliveredToken!));
    await source.query('DELETE FROM "user" WHERE id=$1', [created.id]);
  });
});
