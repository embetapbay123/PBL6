jest.mock('../../shared/src/database', () => ({
  database: { transaction: jest.fn(), query: jest.fn() },
}));
jest.mock('../../shared/src/audit', () => ({ audit: jest.fn() }));

import { database } from '../../shared/src/database';
import { audit } from '../../shared/src/audit';
import { StoreRepository } from '../../identity-store-service/src/store/store.repository';
import { StoreService } from '../../identity-store-service/src/store/store.service';
import { StoreSkeletonController } from '../../identity-store-service/src/store/store.skeleton.controller';

describe('Store API wiring', () => {
  test('forwards authenticated identity and pagination', () => {
    const controller = new StoreSkeletonController();
    const service = {
      submitStoreApplication: jest.fn(),
      listOwnStoreApplications: jest.fn(),
      listStoreApplications: jest.fn(),
      reviewStoreApplication: jest.fn(),
    };
    (controller as any).service = service;

    controller.submitStoreApplication({ auth: { user_id: 'user-a' }, correlationId: 'corr' }, {
      proposed_name: 'A', contact: 'a@example.test',
    } as any);
    controller.listOwnStoreApplications({ auth: { user_id: 'user-a' } }, { page: 2, size: 10 } as any);
    controller.reviewStoreApplication(
      { auth: { user_id: 'admin-1' }, correlationId: 'corr-review' },
      { id: 'application-1' } as any,
      { status: 'REJECTED', decision_reason: 'No', expected_version: 0 } as any,
    );

    expect(service.submitStoreApplication).toHaveBeenCalledWith('user-a', expect.anything(), 'corr');
    expect(service.listOwnStoreApplications).toHaveBeenCalledWith('user-a', 2, 10);
    expect(service.reviewStoreApplication).toHaveBeenCalledWith(
      'application-1',
      expect.objectContaining({ status: 'REJECTED' }),
      'admin-1',
      'corr-review',
    );
  });
});

describe('Store application repository rules', () => {
  const transaction = database.transaction as jest.Mock;

  beforeEach(() => transaction.mockReset());

  test('rejects a second pending application', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{ id: 'user-a' }]).mockResolvedValueOnce([{ id: 'existing' }]) };
    transaction.mockImplementation(async (callback: (value: typeof manager) => unknown) => callback(manager));
    const repository = new StoreRepository();

    await expect(repository.submitStoreApplication('user-a', {
      proposed_name: 'A', contact: 'a@example.test',
    }, 'corr')).rejects.toMatchObject({ status: 409, response: expect.objectContaining({ code: 'DUPLICATE_APPLICATION' }) });
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  test('does not review an already decided application', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{ applicant_user_id: 'user-a' }])
      .mockResolvedValueOnce([{ id: 'user-a' }]).mockResolvedValueOnce([{
        id: 'application-1', status: 'REJECTED', version: 1, applicant_user_id: 'user-a',
      }]) };
    transaction.mockImplementation(async (callback: (value: typeof manager) => unknown) => callback(manager));
    const repository = new StoreRepository();

    await expect(repository.reviewStoreApplication('application-1', {
      status: 'APPROVED', expected_version: 1,
    }, 'admin-1', 'corr')).rejects.toMatchObject({ status: 409 });
    expect(manager.query).toHaveBeenCalledTimes(3);
  });

  test('approval creates store and owner membership in the same transaction', async () => {
    const application = {
      id: 'application-1', status: 'PENDING', version: 0,
      applicant_user_id: 'user-a', proposed_name: 'Gian hàng Á', contact: 'a@example.test',
    };
    const manager = {
      query: jest.fn()
        .mockResolvedValueOnce([{ applicant_user_id: 'user-a' }])
        .mockResolvedValueOnce([{ id: 'user-a' }])
        .mockResolvedValueOnce([application])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...application, status: 'APPROVED', version: 1, decision_reason: null }])
        .mockResolvedValueOnce([{ id: 'store-1' }])
        .mockResolvedValueOnce([]),
    };
    transaction.mockImplementation(async (callback: (value: typeof manager) => unknown) => callback(manager));
    const repository = new StoreRepository();

    const result = await repository.reviewStoreApplication('application-1', {
      status: 'APPROVED', expected_version: 0,
    }, 'admin-1', 'corr');

    expect(result).toMatchObject({ id: 'application-1', status: 'APPROVED', version: 1 });
    expect(manager.query).toHaveBeenCalledTimes(7);
    expect(manager.query.mock.calls[5][0]).toContain('INSERT INTO store');
    expect(manager.query.mock.calls[6][0]).toContain('INSERT INTO store_membership');
  });

  test('normalizes wrapped UPDATE RETURNING rows and stores complete store audit state', async () => {
    const original = { id: 'store-1', name: 'Old', description: null, shipping_fee_vnd: '10', status: 'ACTIVE', version: 3 };
    const updated = { ...original, name: 'New', shipping_fee_vnd: '25', version: 4 };
    const manager = { query: jest.fn().mockResolvedValueOnce([original]).mockResolvedValueOnce([[updated], 1]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));

    const result = await new StoreRepository().updateOwnStore('user-a', {
      name: 'New', shipping_fee_vnd: 25, expected_version: 3,
    }, 'corr');

    expect(result).toEqual({ id: 'store-1', owner_user_id: 'user-a', name: 'New', status: 'ACTIVE', shipping_fee_vnd: 25, version: 4 });
    expect(Number.isNaN(result.shipping_fee_vnd)).toBe(false);
    expect(audit).toHaveBeenCalledWith(manager, 'M3', 'user-a', 'Store', 'store-1', 'STORE_UPDATED', 'corr',
      expect.objectContaining({ name: 'Old', shipping_fee_vnd: 10, version: 3 }),
      expect.objectContaining({ name: 'New', shipping_fee_vnd: 25, version: 4 }));
  });
});

describe('Store service boundaries', () => {
  test('does not add client-controlled ownership to repository calls', async () => {
    const repository = {
      getOwnStore: jest.fn().mockResolvedValue({ id: 'store-1' }),
      updateOwnStore: jest.fn().mockResolvedValue({ id: 'store-1' }),
    };
    const service = new StoreService(repository as any);
    await service.getOwnStore('user-a');
    await service.updateOwnStore('user-a', { expected_version: 0 } as any, 'corr');
    expect(repository.getOwnStore).toHaveBeenCalledWith('user-a');
    expect(repository.updateOwnStore).toHaveBeenCalledWith('user-a', { expected_version: 0 }, 'corr');
  });
});
