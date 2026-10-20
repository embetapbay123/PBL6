import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';
import { StoreRepository } from '../../identity-store-service/src/store/store.repository';
import { StoreSkeletonController } from '../../identity-store-service/src/store/store.skeleton.controller';
import { AdministrationSkeletonController } from '../../identity-store-service/src/administration/administration.skeleton.controller';
import { database, initializeDatabase } from '../../shared/src/database';
import { ErrorFilter } from '../../shared/src/errors';

// This suite intentionally requires a separately provisioned, migrated test DB.
const testUrl = process.env.M3_TEST_DATABASE_URL;
const describePostgres = testUrl ? describe : describe.skip;

describePostgres('Store PostgreSQL regressions', () => {
  let source: DataSource;
  const userId = randomUUID();
  const storeId = randomUUID();
  const approvedApplicationId = randomUUID();
  const rejectApplicationId = randomUUID();
  const corr = `store-regression-${randomUUID()}`;
  const repository = new StoreRepository();
  let app: Awaited<ReturnType<typeof NestFactory.create>>;

  beforeAll(async () => {
    process.env.SERVICE_ID = 'M3';
    process.env.M3_DATABASE_URL = testUrl;
    source = new DataSource({ type: 'postgres', url: testUrl });
    await source.initialize();
    await initializeDatabase();
    await source.query(
      `INSERT INTO "user"(id,email,password_hash,status,created_at,version)
       VALUES ($1,$2,'unused','ACTIVE',now(),0)`, [userId, `${userId}@store-regression.test`],
    );
    await source.query(
      `INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version)
       VALUES ($1,$2,'Update regression','test','APPROVED',now(),0),
              ($3,$2,'Reject regression','test','PENDING',now(),0)`,
      [approvedApplicationId, userId, rejectApplicationId],
    );
    await source.query(
      `INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version)
       VALUES ($1,$2,'Old store','store-regression','old description','test',10,'ACTIVE',3)`,
      [storeId, approvedApplicationId],
    );
    await source.query(
      `INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version)
       VALUES ($1,$2,$3,'OWNER','ACTIVE',now(),0)`, [randomUUID(), storeId, userId],
    );
    // Replace only authentication guards in this HTTP harness; keep the real route controllers and repositories.
    Reflect.defineMetadata('__guards__', [], StoreSkeletonController);
    Reflect.defineMetadata('__guards__', [], AdministrationSkeletonController);
    class TestModule {}
    Module({
      controllers: [StoreSkeletonController, AdministrationSkeletonController],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    app.use((req: any, _res: any, next: () => void) => {
      req.auth = { user_id: userId };
      req.correlationId = req.headers['x-correlation-id'] ?? `${corr}-http`;
      next();
    });
    app.useGlobalFilters(new ErrorFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
  });

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query('DELETE FROM m3_audit WHERE request_id LIKE $1', [`${corr}%`]);
      await source.query('DELETE FROM store_membership WHERE user_id=$1', [userId]);
      await source.query('DELETE FROM store WHERE id=$1', [storeId]);
      await source.query('DELETE FROM store_application WHERE applicant_user_id=$1', [userId]);
      await source.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await source.destroy();
    }
    if (app) await app.close();
    if (database?.isInitialized) await database.destroy();
  });

  test('HTTP PATCH /store returns typed fields and commits complete audit data in PostgreSQL', async () => {
    const response = await supertest(app.getHttpServer()).patch('/api/v1/store').send({
      name: 'Updated store', shipping_fee_vnd: 250, expected_version: 3,
    }).set('X-Correlation-Id', `${corr}-update`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: storeId, owner_user_id: userId, name: 'Updated store', status: 'ACTIVE',
      shipping_fee_vnd: 250, version: 4,
    });
    expect(typeof response.body.id).toBe('string');
    expect(typeof response.body.name).toBe('string');
    expect(typeof response.body.shipping_fee_vnd).toBe('number');
    expect(Number.isNaN(response.body.shipping_fee_vnd)).toBe(false);
    expect(typeof response.body.version).toBe('number');
    const [audit] = await source.query('SELECT before_json,after_json FROM m3_audit WHERE request_id=$1', [`${corr}-update`]);
    expect(audit.before_json).toMatchObject({ name: 'Old store', shipping_fee_vnd: 10, version: 3 });
    expect(audit.after_json).toMatchObject({ name: 'Updated store', shipping_fee_vnd: 250, version: 4 });
  });

  test('HTTP REJECTED review returns the documented object and complete audit data', async () => {
    const response = await supertest(app.getHttpServer()).patch(`/api/v1/admin/store-applications/${rejectApplicationId}`).send({
      status: 'REJECTED', decision_reason: 'Incomplete documents', expected_version: 0,
    }).set('X-Correlation-Id', `${corr}-review`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      id: rejectApplicationId, proposed_name: 'Reject regression', contact: 'test',
      status: 'REJECTED', decision_reason: 'Incomplete documents', version: 1,
    }));
    expect(Array.isArray(response.body)).toBe(false);
    const [audit] = await source.query('SELECT before_json,after_json FROM m3_audit WHERE request_id=$1', [`${corr}-review`]);
    expect(audit.before_json).toMatchObject({ id: rejectApplicationId, status: 'PENDING', version: 0 });
    expect(audit.after_json).toMatchObject({ id: rejectApplicationId, status: 'REJECTED', decision_reason: 'Incomplete documents', version: 1 });
  });

  test('APPROVED review commits Store and OWNER membership together', async () => {
    const applicant = randomUUID();
    await source.query(
      `INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,'unused','ACTIVE',now(),0)`,
      [applicant, `${applicant}@store-approval-regression.test`],
    );
    try {
      const created = await repository.submitStoreApplication(applicant, { proposed_name: 'Approval regression', contact: 'test' }, `${corr}-approved-submit`);
      const reviewed = await supertest(app.getHttpServer()).patch(`/api/v1/admin/store-applications/${created.id}`)
        .set('X-Correlation-Id', `${corr}-approved-review`)
        .send({ status: 'APPROVED', expected_version: 0 });
      expect(reviewed.status).toBe(200);
      expect(reviewed.body).toEqual(expect.objectContaining({ id: created.id, status: 'APPROVED', version: 1 }));
      const [rows] = await source.query(
        `SELECT count(*)::int AS total FROM store s JOIN store_membership m ON m.store_id=s.id
         WHERE s.application_id=$1 AND s.status='ACTIVE' AND m.user_id=$2 AND m.role='OWNER' AND m.status='ACTIVE'`,
        [created.id, applicant],
      );
      expect(rows.total).toBe(1);
      const [audit] = await source.query('SELECT after_json FROM m3_audit WHERE request_id=$1', [`${corr}-approved-review`]);
      expect(audit.after_json).toMatchObject({ id: created.id, status: 'APPROVED', version: 1 });
    } finally {
      await source.query('DELETE FROM store_membership WHERE user_id=$1', [applicant]);
      await source.query('DELETE FROM store WHERE application_id IN (SELECT id FROM store_application WHERE applicant_user_id=$1)', [applicant]);
      await source.query('DELETE FROM store_application WHERE applicant_user_id=$1', [applicant]);
      await source.query('DELETE FROM m3_audit WHERE actor_user_id=$1 OR request_id LIKE $2', [applicant, `${corr}-approved-%`]);
      await source.query('DELETE FROM "user" WHERE id=$1', [applicant]);
    }
  });

  test('simultaneous submissions for one applicant produce exactly one success and one 409', async () => {
    const results = await Promise.all([1, 2].map(index => supertest(app.getHttpServer())
      .post('/api/v1/me/store-applications')
      .set('X-Correlation-Id', `${corr}-race-${index}`)
      .send({ proposed_name: `Concurrent ${index}`, contact: 'test' })));
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
    const conflict = results.find(result => result.status === 409)!;
    expect(conflict.body.code).toBe('DUPLICATE_APPLICATION');
    const [pending] = await source.query(
      `SELECT count(*)::int AS total FROM store_application WHERE applicant_user_id=$1 AND status='PENDING'`, [userId],
    );
    expect(pending.total).toBe(1);
    const [audits] = await source.query('SELECT count(*)::int AS total FROM m3_audit WHERE request_id LIKE $1', [`${corr}-race-%`]);
    expect(audits.total).toBe(1);
    const [pendingApplication] = await source.query(
      `SELECT id FROM store_application WHERE applicant_user_id=$1 AND status='PENDING'`, [userId],
    );
    const [storesBefore] = await source.query('SELECT count(*)::int AS total FROM store');
    await expect(repository.reviewStoreApplication(pendingApplication.id, {
      status: 'APPROVED', expected_version: 0,
    }, userId, `${corr}-rollback`)).rejects.toMatchObject({ status: 409 });
    const [unchangedApplication] = await source.query('SELECT status,version FROM store_application WHERE id=$1', [pendingApplication.id]);
    const [storesAfter] = await source.query('SELECT count(*)::int AS total FROM store');
    const [membershipChanges] = await source.query('SELECT count(*)::int AS total FROM store_membership WHERE user_id=$1', [userId]);
    const [rollbackAudits] = await source.query('SELECT count(*)::int AS total FROM m3_audit WHERE request_id=$1', [`${corr}-rollback`]);
    expect(unchangedApplication).toEqual({ status: 'PENDING', version: 0 });
    expect(storesAfter.total).toBe(storesBefore.total);
    expect(membershipChanges.total).toBe(1);
    expect(rollbackAudits.total).toBe(0);
  });

  test('HTTP role permission update persists permissions and audit through the real controller', async () => {
    const roleId = randomUUID();
    const permissionId = randomUUID();
    const requestId = `${corr}-rbac`;
    await source.query(`INSERT INTO role(id,code,scope,status,version) VALUES($1,$2,'PLATFORM','ACTIVE',0)`, [roleId, `REGRESSION_${roleId}`]);
    await source.query(`INSERT INTO permission(id,code,resource,action) VALUES($1,$2,'regression','read')`, [permissionId, `regression.${permissionId}`]);
    try {
      const response = await supertest(app.getHttpServer()).patch(`/api/v1/admin/roles/${roleId}`).send({
        permission_ids: [permissionId], expected_version: 0,
      }).set('X-Correlation-Id', requestId);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: roleId, permission_ids: [permissionId], version: 1 });
      const grants = await source.query('SELECT permission_id FROM role_permission WHERE role_id=$1', [roleId]);
      expect(grants).toEqual([{ permission_id: permissionId }]);
      const [audit] = await source.query('SELECT action,before_json,after_json FROM m3_audit WHERE request_id=$1', [requestId]);
      expect(audit.action).toBe('ROLE_PERMISSIONS_UPDATED');
      expect(audit.after_json).toMatchObject({ permission_ids: [permissionId], version: 1 });
    } finally {
      await source.query('DELETE FROM m3_audit WHERE request_id=$1', [requestId]);
      await source.query('DELETE FROM role_permission WHERE role_id=$1', [roleId]);
      await source.query('DELETE FROM permission WHERE id=$1', [permissionId]);
      await source.query('DELETE FROM role WHERE id=$1', [roleId]);
    }
  });
});
