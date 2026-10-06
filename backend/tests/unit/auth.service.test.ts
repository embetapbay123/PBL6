jest.mock('../../shared/src/database', () => ({
  database: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../shared/src/config', () => ({
  config: jest.fn(() => ({ publicKey: 'public-key', secureCookie: true })),
  required: jest.fn(() => 'private-key-file'),
}));

jest.mock('../../shared/src/auth', () => ({
  verifyToken: jest.fn(),
}));

import { database } from '../../shared/src/database';
import { verifyToken } from '../../shared/src/auth';
import { AuthService } from '../../identity-store-service/src/auth/auth.service';

const query = database.query as jest.Mock;
const transaction = database.transaction as jest.Mock;
const verify = verifyToken as jest.Mock;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resolves permissions only from the current active membership and store', async () => {
    query
      .mockResolvedValueOnce([{ id: 'user-1', email: 'user@example.test', status: 'ACTIVE', version: 4 }])
      .mockResolvedValueOnce([{ code: 'CUSTOMER' }])
      .mockResolvedValueOnce([{ store_id: 'store-current', role: 'SELLER', status: 'ACTIVE' }])
      .mockResolvedValueOnce([{ code: 'product.store.read' }]);

    const context = await new AuthService().context('user-1');

    expect(context).toMatchObject({
      user_id: 'user-1',
      roles: ['CUSTOMER', 'SELLER'],
      store_membership: {
        store_id: 'store-current',
        permissions: ['product.store.read'],
      },
    });
    expect(query.mock.calls[3][1]).toEqual(['user-1', 'store-current']);
    expect(query.mock.calls[3][0]).toContain('mp.membership_id');
    expect(query.mock.calls[3][0]).not.toContain('m.user_id=$1 AND m.status');
  });

  test('rejects a replayed refresh token and revokes its whole family', async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: 'retired-session', user_id: 'user-1', revoked_at: new Date(), family_id: 'family-1' }])
      .mockResolvedValueOnce([]) };
    transaction.mockImplementation(async (callback: (value: { query: jest.Mock }) => unknown) => callback(manager));

    await expect(new AuthService().refresh('replayed-token')).rejects.toMatchObject({
      status: 401,
      response: expect.objectContaining({ code: 'SESSION_REVOKED' }),
    });
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE family_id=$1'),
      ['family-1'],
    );
  });

  test('does not resolve a revoked access session even when the JWT is otherwise valid', async () => {
    verify.mockReturnValue({ sub: 'user-1', sid: 'session-1' });
    query.mockResolvedValueOnce([]);

    await expect(new AuthService().resolve('access-token')).rejects.toMatchObject({
      status: 401,
      response: expect.objectContaining({ code: 'SESSION_REVOKED' }),
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('revoked_at IS NULL'),
      ['session-1', 'user-1'],
    );
  });
});
