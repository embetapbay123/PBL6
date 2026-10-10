jest.mock('../../shared/src/database', () => ({
  database: { transaction: jest.fn(), query: jest.fn() },
}));
jest.mock('../../shared/src/audit', () => ({ audit: jest.fn() }));

import { database } from '../../shared/src/database';
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
    const manager = { query: jest.fn().mockResolvedValue([{ id: 'existing' }]) };
    transaction.mockImplementation(async (callback: (value: typeof manager) => unknown) => callback(manager));
    const repository = new StoreRepository();

    await expect(repository.submitStoreApplication('user-a', {
      proposed_name: 'A', contact: 'a@example.test',
    }, 'corr')).rejects.toMatchObject({ status: 409, response: expect.objectContaining({ code: 'DUPLICATE_APPLICATION' }) });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  test('does not review an already decided application', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{
      id: 'application-1', status: 'REJECTED', version: 1, applicant_user_id: 'user-a',
    }]) };
    transaction.mockImplementation(async (callback: (value: typeof manager) => unknown) => callback(manager));
    const repository = new StoreRepository();

    await expect(repository.reviewStoreApplication('application-1', {
      status: 'APPROVED', expected_version: 1,
    }, 'admin-1', 'corr')).rejects.toMatchObject({ status: 409 });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  test('approval creates store and owner membership in the same transaction', async () => {
    const application = {
      id: 'application-1', status: 'PENDING', version: 0,
      applicant_user_id: 'user-a', proposed_name: 'Gian hàng Á', contact: 'a@example.test',
    };
    const manager = {
      query: jest.fn()
        .mockResolvedValueOnce([application])
        .mockResolvedValueOnce([{ id: 'user-a' }])
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
    expect(manager.query).toHaveBeenCalledTimes(6);
    expect(manager.query.mock.calls[4][0]).toContain('INSERT INTO store');
    expect(manager.query.mock.calls[5][0]).toContain('INSERT INTO store_membership');
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
