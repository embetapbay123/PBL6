jest.mock('../../shared/src/database',()=>({database:{query:jest.fn()}}));
import {database} from '../../shared/src/database';
import {AuthService} from '../../identity-store-service/src/auth/auth.service';
import {validateOperation} from '../../shared/src/request-contract';
import {demoAccounts} from '../../identity-store-service/src/auth/demo-accounts';
const query=database.query as jest.Mock;
const saved={...process.env};
beforeEach(()=>{jest.clearAllMocks();process.env.DEMO_LOGIN_ENABLED='1';process.env.NODE_ENV='test';process.env.SEED_PASSWORD='unit-only-demo-password';});
afterEach(()=>{process.env={...saved};});
test.each([undefined,'0'])('demo login stays disabled without opt-in (%s)',async value=>{
 process.env.DEMO_LOGIN_ENABLED=value;await expect(new AuthService().demoLogin('admin')).rejects.toMatchObject({status:404});expect(query).not.toHaveBeenCalled();
});
test('production refuses demo login even with opt-in',async()=>{process.env.NODE_ENV='production';await expect(new AuthService().demoLogin('admin')).rejects.toMatchObject({status:404});expect(query).not.toHaveBeenCalled();});
test.each(['other','toString','__proto__','someone@example.test'])('cannot select an arbitrary identity: %s',async account=>{
 await expect(new AuthService().demoLogin(account)).rejects.toMatchObject({status:422});expect(query).not.toHaveBeenCalled();
 expect(()=>validateOperation('demoLogin',{body:{account} as any})).toThrow();
});
test('missing, locked or non-demo profiles never reach credential login',async()=>{query.mockResolvedValue([]);const service=new AuthService(),login=jest.spyOn(service,'login');await expect(service.demoLogin('admin')).rejects.toMatchObject({status:404});expect(login).not.toHaveBeenCalled();expect(query.mock.calls[0][0]).toContain("p.display_name LIKE '[DEMO] %'");expect(query.mock.calls[0][0]).toContain("u.status='ACTIVE'");});
test.each(Object.entries(demoAccounts))('allowlisted %s uses normal live authentication and keeps password server-side',async(account,email)=>{
 query.mockResolvedValue([{id:'synthetic'}]);const service=new AuthService(),tokens={access_token:'unit-access',refresh_token:'unit-refresh'};const login=jest.spyOn(service,'login').mockResolvedValue(tokens as any);
 await expect(service.demoLogin(account)).resolves.toBe(tokens);expect(login).toHaveBeenCalledWith(email,'unit-only-demo-password');
});
test('demo contract rejects injected email, password, role and mobile delivery',()=>{
 for(const extra of [{email:'other@test.test'},{password:'password'},{role:'ADMIN'},{client_type:'MOBILE'}])expect(()=>validateOperation('demoLogin',{body:{account:'customerA',...extra} as any})).toThrow();
});
