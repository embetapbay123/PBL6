jest.mock('../../shared/src/database', () => ({ database: { transaction: jest.fn(), query: jest.fn() } }));
jest.mock('../../shared/src/audit', () => ({ audit: jest.fn() }));
jest.mock('../../shared/src/events', () => ({ emitEvent: jest.fn() }));

import { database } from '../../shared/src/database';
import { emitEvent } from '../../shared/src/events';
import { AdministrationRepository } from '../../identity-store-service/src/administration/administration.repository';
import { AdministrationService } from '../../identity-store-service/src/administration/administration.service';

describe('AdministrationRepository event contracts', () => {
  const transaction = database.transaction as jest.Mock;
  const emit = emitEvent as jest.Mock;
  beforeEach(() => { jest.clearAllMocks(); });

  test.each([
    ['UserLocked', { user_id: 'target', version: 3 }],
    ['StoreStatusChanged', { store_id: 'store-1', status: 'LOCKED', version: 3 }],
  ])('%s emits exactly its declared payload', async (kind, payload) => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: 'target', version: 2, status: 'ACTIVE' }])
      .mockResolvedValueOnce([{ id: 'target', version: 3, status: 'LOCKED' }])
      .mockResolvedValue([]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));
    const repo = new AdministrationRepository();
    if (kind === 'UserLocked') await repo.updateUserState('user-1', 'LOCKED', 'reason', 2, 'actor', 'corr');
    else await repo.updateStoreState('store-1', 'LOCKED', 'reason', 2, 'actor', 'corr');
    expect(emit).toHaveBeenCalledWith(manager, kind, payload, 'corr');
  });

  test('UserLocked emits the updated version from the persisted user row', async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: 'user-1', version: 2, status: 'ACTIVE' }])
      .mockResolvedValueOnce([{ id: 'user-1', version: 3, status: 'LOCKED' }])
      .mockResolvedValue([]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));

    await new AdministrationRepository().updateUserState('user-1', 'LOCKED', 'reason', 2, 'actor', 'corr');

    expect(emit).toHaveBeenCalledWith(manager, 'UserLocked', { user_id: 'user-1', version: 3 }, 'corr');
  });

  test('global role updates do not claim membership permissions were changed', async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: 'role-1', code: 'CUSTOMER', version: 1 }])
      .mockResolvedValueOnce([{ permission_id: 'perm-old' }])
      .mockResolvedValueOnce([{ id: 'perm-old' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));
    await new AdministrationRepository().updateRole('role-1', [], 1, 'actor', 'corr');
    expect(emit).not.toHaveBeenCalled();
  });

  test('role permission update delegates to the repository', () => {
    const repository = { updateRole: jest.fn() };
    const service = new AdministrationService(repository as any);
    service.updateRole('role-1', ['perm-1'], 3, 'actor', 'corr');
    expect(repository.updateRole).toHaveBeenCalledWith('role-1', ['perm-1'], 3, 'actor', 'corr');
  });

  test('role permission update rejects a stale version before changing permissions', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{ id: 'role-1', version: 4 }]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));

    await expect(new AdministrationRepository().updateRole('role-1', [], 3, 'actor', 'corr'))
      .rejects.toMatchObject({ status: 409, response: expect.objectContaining({ code: 'VERSION_CONFLICT' }) });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  test('role permission update validates IDs before deleting current grants', async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: 'role-1', code: 'ADMIN', version: 4 }])
      .mockResolvedValueOnce([{ permission_id: 'perm-current' }])
      .mockResolvedValueOnce([]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));

    await expect(new AdministrationRepository().updateRole('role-1', ['missing-permission'], 4, 'actor', 'corr'))
      .rejects.toMatchObject({ status: 422, response: expect.objectContaining({ code: 'VALIDATION_FAILED' }) });
    expect(manager.query).toHaveBeenCalledTimes(3);
    expect(manager.query.mock.calls[2][0]).toContain('SELECT id FROM permission');
  });
});
