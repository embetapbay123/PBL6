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
}
