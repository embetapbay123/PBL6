import { ProfileSkeletonController } from '../../identity-store-service/src/profile/profile.skeleton.controller';

describe('ProfileSkeletonController (unit)', () => {
  let controller: ProfileSkeletonController;
  beforeEach(() => { controller = new ProfileSkeletonController(); });

  test('updateProfile forwards authenticated user and correlation id', () => {
    const mock = { updateProfile: jest.fn() } as any;
    (controller as any).service = mock;
    const req = { auth: { user_id: 'user-123' }, correlationId: 'corr-profile' } as any;
    const body = { display_name: 'Updated name', phone: '0900000000' } as any;

    controller.updateProfile(req, body);

    expect(mock.updateProfile).toHaveBeenCalledWith('user-123', body, 'corr-profile');
  });

  test('listAddresses calls service with auth user and pagination', () => {
    const mock = { listAddresses: jest.fn() } as any;
    // inject mock service
    (controller as any).service = mock;
    const req = { auth: { user_id: 'user-123' } } as any;
    controller.listAddresses(req, { page: 2, size: 10 } as any as any);
    expect(mock.listAddresses).toHaveBeenCalledWith('user-123', 2, 10);
  });

  test('createAddress forwards user_id and body to service', () => {
    const mock = { createAddress: jest.fn() } as any;
    (controller as any).service = mock;
    const req = { auth: { user_id: 'owner-1' }, correlationId: 'corr-1' } as any;
    const body = { recipient_name: 'A', phone: '090' , customer_user_id: 'attacker' } as any;
    controller.createAddress(req, body);
    expect(mock.createAddress).toHaveBeenCalledWith('owner-1', body, 'corr-1');
  });

  test('updateAddress forwards user_id, id and body to service', () => {
    const mock = { updateAddress: jest.fn() } as any;
    (controller as any).service = mock;
    const req = { auth: { user_id: 'owner-2' }, correlationId: 'cid' } as any;
    controller.updateAddress(req, { id: 'addr-1' } as any, { address_line: 'x' } as any);
    expect(mock.updateAddress).toHaveBeenCalledWith('owner-2', 'addr-1', { address_line: 'x' }, 'cid');
  });

  test('deleteAddress forwards user_id and id to service', () => {
    const mock = { deleteAddress: jest.fn() } as any;
    (controller as any).service = mock;
    const req = { auth: { user_id: 'owner-3' }, correlationId: 'rid' } as any;
    controller.deleteAddress(req, { id: 'addr-9' } as any);
    expect(mock.deleteAddress).toHaveBeenCalledWith('owner-3', 'addr-9', 'rid');
  });
});
