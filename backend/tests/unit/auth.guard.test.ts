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

describe('AuthGuard expected Store assertion',()=>{
 const a='87000000-0000-4000-8000-00000000000a',b='87000000-0000-4000-8000-00000000000b';
 const live={user_id:'u1',roles:['SELLER'],role_permissions:[],store_membership:{store_id:b,role:'SELLER',status:'ACTIVE',permissions:['product.store.read_write']}};
 function setup(path='/api/v1/store/products',expected:unknown=a){
  const request:any={path,headers:{authorization:'Bearer valid-token',...(expected===undefined?{}:{'x-store-context':expected})},correlationId:'ctx'},reflector={getAllAndOverride:jest.fn((key:string)=>key==='roles'?['SELLER']:undefined)},ctx:any={getHandler:()=>({}),getClass:()=>({}),switchToHttp:()=>({getRequest:()=>request})};
  (internalRequest as jest.Mock).mockResolvedValue(live);return {request,guard:new AuthGuard(reflector as any),ctx};
 }
 test('rejects stale Store for reads and writes before assigning request authority',async()=>{
  for(const path of ['/api/v1/store','/api/v1/store/products','/store/orders','/API/V1/STORE/staff']){const x=setup(path);await expect(x.guard.canActivate(x.ctx)).rejects.toMatchObject({status:409,response:{code:'STORE_CONTEXT_CHANGED'}});expect(x.request.auth).toBeUndefined();expect(live.store_membership.store_id).toBe(b);}
 });
 test('matching assertion preserves the live authority, including case-insensitive UUID spelling',async()=>{
  const x=setup('/api/v1/store/products',b.toUpperCase());await expect(x.guard.canActivate(x.ctx)).resolves.toBe(true);expect(x.request.auth.store_membership.store_id).toBe(b);
 });
 test('a missing or inactive live Store never accepts an old Store assertion',async()=>{
  for(const member of [undefined,{...live.store_membership,status:'LOCKED'}]){const x=setup();(internalRequest as jest.Mock).mockResolvedValue({...live,store_membership:member});await expect(x.guard.canActivate(x.ctx)).rejects.toMatchObject({status:409});}
 });
 test('rejects malformed and duplicate assertions; header never selects another Store',async()=>{
  for(const header of ['bad',[a,b],a+','+b]){const x=setup('/api/v1/store/products',header);await expect(x.guard.canActivate(x.ctx)).rejects.toMatchObject({status:400,response:{code:'INVALID_STORE_CONTEXT'}});expect(x.request.auth).toBeUndefined();}
 });
 test('legacy omission keeps current Store semantics and unrelated namespaces are not rebound',async()=>{
  const x=setup();delete x.request.headers['x-store-context'];await expect(x.guard.canActivate(x.ctx)).resolves.toBe(true);expect(x.request.auth.store_membership.store_id).toBe(b);
  for(const path of ['/api/v1/stores/'+a,'/api/v1/me/orders','/api/v1/admin/stores/'+a]){const y=setup(path);await expect(y.guard.canActivate(y.ctx)).resolves.toBe(true);expect(y.request.auth.store_membership.store_id).toBe(b);}
 });
});
