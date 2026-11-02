jest.mock('../../shared/src/database',()=>({database:{transaction:jest.fn()}}));
jest.mock('../../shared/src/config',()=>({config:jest.fn()}));
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {database} from '../../shared/src/database';
import {config} from '../../shared/src/config';
import {verifyToken} from '../../shared/src/auth';
import {AuthService,digest} from '../../identity-store-service/src/auth/auth.service';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}),user=randomUUID(),sid=randomUUID(),family=randomUUID();
const token=(expiresIn=60)=>jwt.sign({sid},keys.privateKey,{algorithm:'RS256',subject:user,issuer:'pbl6-identity',audience:'pbl6-clients',expiresIn});
let query:jest.Mock;
beforeEach(()=>{jest.clearAllMocks();(config as jest.Mock).mockReturnValue({publicKey:keys.publicKey});query=jest.fn();(database.transaction as jest.Mock).mockImplementation(async cb=>cb({query}));});
test('queued logout revokes its signed family and preserves another account cookie',async()=>{
 query.mockResolvedValueOnce([{family_id:family}]).mockResolvedValueOnce([{family_id:randomUUID()}]).mockResolvedValueOnce([]);expect(await new AuthService().logoutAccess(token(),'cookie-B')).toMatchObject({status:'OK',cookie_session_changed:true});expect(query.mock.calls[0][1]).toEqual([sid,user]);expect(query.mock.calls[1][1]).toEqual([digest('cookie-B')]);expect(query.mock.calls[2][1]).toEqual([family]);
});
test('same family cookie is cleared, including when the requested session was already revoked',async()=>{
 query.mockResolvedValueOnce([{family_id:family}]).mockResolvedValueOnce([{family_id:family}]).mockResolvedValueOnce([]);expect(await new AuthService().logoutAccess(token(),'cookie-A')).toMatchObject({status:'OK',cookie_session_changed:false});
});
test('signed expired access can only revoke its own family; it remains rejected for normal access',async()=>{
 const expired=token(-1);expect(()=>verifyToken(expired,keys.publicKey)).toThrow();query.mockResolvedValueOnce([{family_id:family}]).mockResolvedValueOnce([]);expect(await new AuthService().logoutAccess(expired)).toMatchObject({status:'OK',cookie_session_changed:false});expect(query.mock.calls[1][1]).toEqual([family]);
});
test('invalid signature cannot select or revoke any session',async()=>{
 const value=token(),parts=value.split('.');parts[2]=parts[2].slice(0,-4)+'AAAA';await expect(new AuthService().logoutAccess(parts.join('.'),'cookie-B')).rejects.toMatchObject({status:401});expect(query).not.toHaveBeenCalled();
});
test('a valid signature does not authorize a session absent from its user scope',async()=>{
 query.mockResolvedValueOnce([]);await expect(new AuthService().logoutAccess(token(),'cookie-B')).rejects.toMatchObject({status:401});expect(query).toHaveBeenCalledTimes(1);
});
