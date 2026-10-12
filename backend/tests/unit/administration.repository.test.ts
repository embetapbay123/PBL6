jest.mock('../../shared/src/database', () => ({ database: { transaction: jest.fn(), query: jest.fn() } }));
jest.mock('../../shared/src/audit', () => ({ audit: jest.fn() }));
jest.mock('../../shared/src/events', () => ({ emitEvent: jest.fn() }));

import { database } from '../../shared/src/database';
import { emitEvent } from '../../shared/src/events';
import { AdministrationRepository } from '../../identity-store-service/src/administration/administration.repository';

describe('AdministrationRepository event contracts', () => {
  const transaction = database.transaction as jest.Mock;
  const emit = emitEvent as jest.Mock;
  beforeEach(() => { jest.clearAllMocks(); });

  test.each([
    ['UserLocked', { user_id: 'user-1', version: 3 }],
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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]) };
    transaction.mockImplementation(async (callback: any) => callback(manager));
    await new AdministrationRepository().updateRole('role-1', [], 1, 'actor', 'corr');
    expect(emit).not.toHaveBeenCalled();
  });
});
