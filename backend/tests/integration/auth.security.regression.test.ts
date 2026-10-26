import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Controller, Module, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthController } from '../../identity-store-service/src/auth/auth.controller';
import { AuthService, digest, IEmailAdapter } from '../../identity-store-service/src/auth/auth.service';
import { AuthGuard, ServiceGuard } from '../../shared/src/auth';
import { ErrorFilter } from '../../shared/src/errors';
import { RequestContractInterceptor } from '../../shared/src/request-contract';
import { database } from '../../shared/src/database';

const dbUrl = process.env.M3_TEST_DATABASE_URL;
const describePostgres = dbUrl ? describe : describe.skip;

describePostgres('Authentication PostgreSQL and HTTP regressions', () => {
  let source: DataSource;
  let app: any;
  let keyDirectory: string;
  const userId = randomUUID();
  const email = `auth-regression-${userId}@example.test`;
  const delivered: Array<{ kind: string; email: string; token: string }> = [];
  let failDelivery = false;
  const adapter: IEmailAdapter = {
    async sendVerificationEmail(to, token) { if (failDelivery) throw new Error('provider rejected message'); delivered.push({ kind: 'verify', email: to, token }); },
    async sendPasswordResetEmail(to, token) { if (failDelivery) throw new Error('provider rejected message'); delivered.push({ kind: 'reset', email: to, token }); },
  };

  beforeAll(async () => {
    source = new DataSource({ type: 'postgres', url: dbUrl });
    await source.initialize();
    process.env.SERVICE_ID = 'M3';
    process.env.M3_DATABASE_URL = dbUrl;
    process.env.IDENTITY_URL = 'http://127.0.0.1:1';
    process.env.CATALOG_URL = 'http://127.0.0.1:1';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.WEB_ORIGIN = 'http://localhost:8080';
    keyDirectory = mkdtempSync(join(tmpdir(), 'pbl6-auth-regression-'));
    const keys = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY_FILE = join(keyDirectory, 'jwt-private.pem');
    process.env.JWT_PUBLIC_KEY_FILE = join(keyDirectory, 'jwt-public.pem');
    writeFileSync(process.env.JWT_PRIVATE_KEY_FILE, keys.privateKey);
    writeFileSync(process.env.JWT_PUBLIC_KEY_FILE, keys.publicKey);
    for (const service of ['M1', 'M2', 'M3', 'M4']) process.env[`${service}_INTERNAL_KEY`] ??= `test-${service}-internal-key`;
    await import('../../shared/src/database').then(module => module.initializeDatabase());
    @Controller() @UseGuards(AuthGuard) class TestAuthController extends AuthController {
      constructor() { super(new AuthService(adapter)); }
    }
    @Module({ controllers: [TestAuthController], providers: [AuthGuard, ServiceGuard] }) class TestModule {}
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix('api/v1', { exclude: ['internal/context', 'internal/stores/active'] });
    app.use((req: any, _res: any, next: any) => { req.correlationId = 'auth-regression'; next(); });
    app.useGlobalFilters(new ErrorFilter());
    app.useGlobalInterceptors(new RequestContractInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const hash = await bcrypt.hash('Old-password-123', 10);
    await source.query(`INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,$3,'ACTIVE',now(),0)`, [userId, email, hash]);
    await app.listen(0, '127.0.0.1');
    process.env.IDENTITY_URL = await app.getUrl();
  });

  async function login(password: string) {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });
    if (response.status !== 200) throw new Error(`Login failed (${response.status}): ${JSON.stringify(response.body)}`);
    return response.body as { access_token: string; refresh_token: string };
  }

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query('DELETE FROM one_time_token WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM refresh_session WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM customer_profile WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM user_role WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await source.destroy();
    }
    if (app) await app.close();
    if (database?.isInitialized) await database.destroy();
    if (keyDirectory) rmSync(keyDirectory, { recursive: true, force: true });
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
    const currentSession = await login('Change-old-123');
    const otherSession = await login('Change-old-123');
    await source.query(`INSERT INTO one_time_token(id,user_id,purpose,token_hash,expires_at,created_at) VALUES($1,$2,'PASSWORD_RESET',$3,now()+interval '15 minutes',now())`, [randomUUID(), userId, digest('pre-change-reset-link')]);
    const changed = await request(app.getHttpServer()).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${currentSession.access_token}`).send({ current_password: 'Change-old-123', new_password: 'Change-new-123' });
    expect(changed.status).toBe(200);
    expect((await source.query('SELECT id FROM refresh_session WHERE user_id=$1 AND revoked_at IS NULL', [userId]))).toHaveLength(0);
    const invalidated = await request(app.getHttpServer()).get('/api/v1/me/context').set('Authorization', `Bearer ${otherSession.access_token}`);
    expect(invalidated.status).toBe(401);
    expect(invalidated.body.code).toBe('SESSION_REVOKED');
    const replay = await request(app.getHttpServer()).post('/api/v1/auth/reset-password/confirm').send({ token: 'pre-change-reset-link', new_password: 'Reset-after-change-123' });
    expect(replay.status).toBe(400);
  });

  test('two concurrent HTTP password changes using the same old password have one winner', async () => {
    const hash = await bcrypt.hash('Concurrent-old-123', 10);
    await source.query('UPDATE "user" SET password_hash=$1,status=\'ACTIVE\',version=0 WHERE id=$2', [hash, userId]);
    const session = await login('Concurrent-old-123');
    const body = (new_password: string) => request(app.getHttpServer()).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${session.access_token}`).send({ current_password: 'Concurrent-old-123', new_password });
    const results = await Promise.all([body('Concurrent-new-one-123'), body('Concurrent-new-two-123')]);
    expect(results.filter(result => result.status === 200)).toHaveLength(1);
    expect(results.filter(result => [400, 401].includes(result.status))).toHaveLength(1);
  });

  test('change-password rejects missing, invalid, and revoked sessions and wrong current password', async () => {
    await source.query('UPDATE "user" SET password_hash=$1,status=\'ACTIVE\' WHERE id=$2', [await bcrypt.hash('Guard-old-123', 10), userId]);
    const path = '/api/v1/auth/change-password';
    const body = { current_password: 'Guard-old-123', new_password: 'Guard-new-123' };
    const guest = await request(app.getHttpServer()).post(path).send(body);
    if (guest.status !== 401) throw new Error(`Guest request was not rejected (${guest.status}): ${JSON.stringify(guest.body)}`);
    const invalidToken = await request(app.getHttpServer()).post(path).set('Authorization', 'Bearer not-a-valid-token').send(body);
    expect(invalidToken.status).toBe(401);
    const wrongPasswordSession = await login('Guard-old-123');
    const wrongPassword = await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${wrongPasswordSession.access_token}`).send({ ...body, current_password: 'Incorrect-current-123' });
    expect(wrongPassword.status).toBe(400);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    await source.query('UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);
    const revoked = await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${wrongPasswordSession.access_token}`).send(body);
    expect(revoked.status).toBe(401);
    expect(revoked.body.code).toBe('SESSION_REVOKED');
  });

  test('registration fails closed without configured adapter before creating a pending account', async () => {
    const { AuthService: Service } = await import('../../identity-store-service/src/auth/auth.service');
    const missingAdapter = new Service();
    const missingEmail = `no-adapter-${randomUUID()}@example.test`;
    await expect(missingAdapter.register(missingEmail, 'Password-123')).rejects.toMatchObject({ status: 503 });
    await expect(missingAdapter.resetPassword(email)).rejects.toMatchObject({ status: 503 });
    expect(await source.query('SELECT id FROM "user" WHERE email=$1', [missingEmail])).toHaveLength(0);
  });

  test('SMTP/provider failure is returned safely and never claims email delivery', async () => {
    const email = `delivery-failure-${randomUUID()}@example.test`;
    failDelivery = true;
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password: 'Registration-123' });
    failDelivery = false;
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('EMAIL_DELIVERY_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('provider rejected');
    const [created] = await source.query('SELECT id,status FROM "user" WHERE email=$1', [email]);
    expect(created.status).toBe('PENDING');
    const [token] = await source.query(`SELECT consumed_at FROM one_time_token WHERE user_id=$1 AND purpose='EMAIL_VERIFICATION'`, [created.id]);
    expect(token.consumed_at).not.toBeNull();
    await source.query('DELETE FROM one_time_token WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM customer_profile WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM user_role WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM "user" WHERE id=$1', [created.id]);
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
    await source.query('DELETE FROM one_time_token WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM customer_profile WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM user_role WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM "user" WHERE id=$1', [created.id]);
  });

  test('email verification activates once and rejects invalid, expired, replayed, and concurrent tokens', async () => {
    const newEmail = `verify-once-${randomUUID()}@example.test`;
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: newEmail, password: 'Registration-123' });
    expect(response.status).toBe(201);
    const rawToken = delivered.find(item => item.kind === 'verify' && item.email === newEmail)!.token;
    const [created] = await source.query('SELECT id,status FROM "user" WHERE email=$1', [newEmail]);
    expect(created.status).toBe('PENDING');
    expect((await request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: 'invalid-token' })).status).toBe(400);
    const race = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: rawToken }),
      request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: rawToken }),
    ]);
    expect(race.filter(result => result.status === 200)).toHaveLength(1);
    expect(race.filter(result => result.status === 400)).toHaveLength(1);
    expect((await source.query('SELECT status,email_verified_at FROM "user" WHERE id=$1', [created.id]))[0]).toMatchObject({ status: 'ACTIVE' });
    expect((await request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: rawToken })).status).toBe(400);
    const expired = 'expired-email-token';
    await source.query(`INSERT INTO one_time_token(id,user_id,purpose,token_hash,expires_at,created_at) VALUES($1,$2,'EMAIL_VERIFICATION',$3,now()-interval '1 second',now())`, [randomUUID(), created.id, digest(expired)]);
    const expiredResponse = await request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: expired });
    expect(expiredResponse.status).toBe(400);
    expect(expiredResponse.body.code).toBe('TOKEN_EXPIRED');
    await source.query('DELETE FROM one_time_token WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM customer_profile WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM user_role WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM "user" WHERE id=$1', [created.id]);
  });

  test('duplicate registration does not reveal account identifiers and pending duplicate can be verified', async () => {
    const newEmail = `duplicate-${randomUUID()}@example.test`;
    const first = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: newEmail, password: 'Registration-123' });
    expect(first.status).toBe(201);
    const second = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: newEmail, password: 'Registration-123' });
    expect(second.status).toBe(201);
    expect(second.body).not.toHaveProperty('user_id');
    const [created] = await source.query('SELECT id FROM "user" WHERE email=$1', [newEmail]);
    const pending = await source.query(`SELECT token_hash,consumed_at FROM one_time_token WHERE user_id=$1 AND purpose='EMAIL_VERIFICATION'`, [created.id]);
    expect(pending).toHaveLength(2);
    expect(pending.filter((row: any) => row.consumed_at === null)).toHaveLength(1);
    const latest = delivered.filter(item => item.kind === 'verify' && item.email === newEmail).at(-1)!;
    expect((await request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token: latest.token })).status).toBe(200);
    await source.query('DELETE FROM one_time_token WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM customer_profile WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM user_role WHERE user_id=$1', [created.id]);
    await source.query('DELETE FROM "user" WHERE id=$1', [created.id]);
  });
});
