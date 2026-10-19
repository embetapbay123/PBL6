import { StaffRepository } from './staff.repository';

export class StaffService {
  constructor(private readonly repository = new StaffRepository()) {}
  listStoreInvitations(userId: string, storeId: string, page?: number, size?: number) {
    return this.repository.listStoreInvitations(userId, storeId, page, size);
  }
  createInvitation(userId: string, storeId: string, input: { invited_email: string; permissions: string[] }, correlationId: string) {
    return this.repository.createInvitation(userId, storeId, input, correlationId);
  }
  revokeInvitation(userId: string, storeId: string, id: string, correlationId: string) {
    return this.repository.revokeInvitation(userId, storeId, id, correlationId);
  }
  listOwnInvitations(userId: string, page?: number, size?: number) {
    return this.repository.listOwnInvitations(userId, page, size);
  }
  acceptInvitation(userId: string, id: string, correlationId: string) {
    return this.repository.acceptInvitation(userId, id, correlationId);
  }
}
