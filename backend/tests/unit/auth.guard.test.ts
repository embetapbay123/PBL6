jest.mock('../../shared/src/config', () => ({ config: jest.fn(() => ({
  id: 'M1', publicKey: 'public-key', identityUrl: 'http://identity', internalKeys: { M1: 'key' },
})) }));
jest.mock('jsonwebtoken', () => ({ __esModule: true, default: { verify: jest.fn(() => ({ sub: 'u1', sid: 's1' })) } }));
jest.mock('../../shared/src/http-client', () => ({ internalRequest: jest.fn() }));

import { AuthGuard } from '../../shared/src/auth';
import { internalRequest } from '../../shared/src/http-client';

describe('AuthGuard live role permission enforcement', () => {
  const internal = internalRequest as jest.Mock;
  const reflector = { getAllAndOverride: jest.fn() };
  const request = { headers: { authorization: 'Bearer valid-token' }, correlationId: 'corr' };
  const executionContext: any = {
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    request.headers.authorization = 'Bearer valid-token';
    reflector.getAllAndOverride.mockImplementation((key: string) => key === 'roles' ? ['ADMIN'] : undefined);
  });

  test('allows an active ADMIN whose live context has platform.admin', async () => {
    internal.mockResolvedValue({ user_id: 'u1', roles: ['ADMIN'], role_permissions: ['platform.admin'] });
    await expect(new AuthGuard(reflector as any).canActivate(executionContext)).resolves.toBe(true);
  });

  test('denies an existing ADMIN session after platform.admin is revoked', async () => {
    internal.mockResolvedValue({ user_id: 'u1', roles: ['ADMIN'], role_permissions: [] });
    await expect(new AuthGuard(reflector as any).canActivate(executionContext)).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
  });

  test('rechecks an old token against current effective permissions on every request', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => key === 'roles' ? ['STAFF'] : key === 'permissions' ? ['orders.manage'] : undefined);
    const guard = new AuthGuard(reflector as any);
    internal.mockResolvedValueOnce({ user_id: 'u1', roles: ['STAFF'], role_permissions: ['orders.manage'] });
    await expect(guard.canActivate(executionContext)).resolves.toBe(true);

    // Same bearer token, same session; the live identity context now reflects a permission revoke.
    internal.mockResolvedValueOnce({ user_id: 'u1', roles: ['STAFF'], role_permissions: [] });
    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
  });
});
