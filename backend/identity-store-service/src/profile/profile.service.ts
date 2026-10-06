import type { CreateAddressRequest, ProfileResponse, UpdateAddressRequest, UpdateProfileRequest } from './dtos';
import { ApiError } from '../../../shared/src/errors';
import { ProfileRepository } from './profile.repository';

export class ProfileService {
  private readonly repository = new ProfileRepository();

  async getProfile(userId: string): Promise<ProfileResponse> {
    const profile = await this.repository.getProfile(userId);
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ.');
    return profile;
  }

  updateProfile(userId: string, input: UpdateProfileRequest, requestId: string) {
    return this.repository.updateProfile(userId, input, requestId);
  }

  listAddresses(userId: string, page = 1, size = 20) {
    return this.repository.listAddresses(userId, page, size);
  }

  createAddress(userId: string, input: CreateAddressRequest, requestId: string) {
    return this.repository.createAddress(userId, input, requestId);
  }

  updateAddress(userId: string, addressId: string, input: UpdateAddressRequest, requestId: string) {
    return this.repository.updateAddress(userId, addressId, input, requestId);
  }

  deleteAddress(userId: string, addressId: string, requestId: string) {
    return this.repository.deleteAddress(userId, addressId, requestId);
  }
}
