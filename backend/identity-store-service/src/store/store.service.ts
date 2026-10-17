import { StoreRepository } from './store.repository';
import { UpdateOwnStoreBodyDto } from '../../../shared/src/dtos.generated';

export class StoreService {
  constructor(private readonly repository = new StoreRepository()) {}

  getOwnStore(userId: string) {
    return this.repository.getOwnStore(userId);
  }

  updateOwnStore(userId: string, input: UpdateOwnStoreBodyDto, correlationId: string) {
    return this.repository.updateOwnStore(userId, input, correlationId);
  }

  submitStoreApplication(userId: string, input: { proposed_name: string; contact: string }, correlationId: string) {
    return this.repository.submitStoreApplication(userId, input, correlationId);
  }

  listOwnStoreApplications(userId: string, page: number, size: number) {
    return this.repository.listStoreApplications(userId, page, size);
  }

  listStoreApplications(page: number, size: number) {
    return this.repository.listStoreApplications(null, page, size);
  }

  reviewStoreApplication(id: string, input: { status: 'APPROVED' | 'REJECTED'; decision_reason?: string; expected_version: number }, adminUserId: string, correlationId: string) {
    return this.repository.reviewStoreApplication(id, input, adminUserId, correlationId);
  }

  listActiveStoreIds() {
    return this.repository.listActiveStoreIds();
  }
}
