import { StaffRepository } from './staff.repository';

export class StaffService {
  constructor(private readonly repository = new StaffRepository(), private readonly sendInvitationEmail?: (email: string) => Promise<void>) {}
  listStaff(userId: string, storeId: string, page?: number, size?: number) {
    return this.repository.listStaff(userId, storeId, page, size);
  }
  updateStaff(userId: string, storeId: string, membershipId: string, input: { status?: string; permissions?: string[]; expected_version: number }, correlationId: string) {
    return this.repository.updateStaff(userId, storeId, membershipId, input, correlationId);
  }
  listStoreInvitations(userId: string, storeId: string, page?: number, size?: number) {
    return this.repository.listStoreInvitations(userId, storeId, page, size);
  }
  createInvitation(userId: string, storeId: string, input: { invited_email: string; permissions: string[] }, correlationId: string) {
    return this.createAndNotifyInvitation(userId, storeId, input, correlationId);
  }
  private async createAndNotifyInvitation(userId: string, storeId: string,
    input: { invited_email: string; permissions: string[] }, correlationId: string) {
    const invitation = await this.repository.createInvitation(userId, storeId, input, correlationId);
    if (this.sendInvitationEmail) {
      try {
        await this.sendInvitationEmail(invitation.invited_email);
      } catch (error) {
        await this.repository.failInvitationDelivery(storeId, invitation.id, correlationId);
        throw error;
      }
    }
    return invitation;
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
