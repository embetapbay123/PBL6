import { AdministrationRepository } from './administration.repository';
import { notImplemented } from '../../../shared/src/errors';

export class AdministrationService {
  constructor(private readonly repository = new AdministrationRepository()) {}

  listUsers(page = 1, size = 20) {
    return this.repository.listUsers(page, size);
  }

  updateUserState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    return this.repository.updateUserState(id, status, reason, expectedVersion, actorUserId, correlationId);
  }

  listStores(page = 1, size = 20) {
    return this.repository.listStores(page, size);
  }

  updateStoreState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    return this.repository.updateStoreState(id, status, reason, expectedVersion, actorUserId, correlationId);
  }

  updateRole(id: string, permissionIds: string[], expectedVersion: number, actorUserId: string, correlationId: string) {
    return notImplemented('effective role permission updates');
  }
}
