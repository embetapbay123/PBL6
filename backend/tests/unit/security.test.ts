import { generateKeyPairSync,createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { verifyToken,verifyService } from '../../shared/src/auth';
import { verifySePay } from '../../commerce-service/src/payment/sepay.adapter';
import { fingerprint } from '../../shared/src/idempotency';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
test('JWT checks issuer/audience/algorithm and session identifier',()=>{
  const token=jwt.sign({sid:'session'},keys.privateKey,{algorithm:'RS256',subject:'user',issuer:'pbl6-identity',audience:'pbl6-clients',expiresIn:60});
  expect(verifyToken(token,keys.publicKey).sub).toBe('user');
  expect(()=>verifyToken(jwt.sign({sid:'session'},'weak-secret',{algorithm:'HS256'}),keys.publicKey)).toThrow();
  expect(()=>verifyToken(jwt.sign({sid:'session'},keys.privateKey,{algorithm:'RS256',issuer:'wrong',audience:'pbl6-clients'}),keys.publicKey)).toThrow();
});
test('service identity is restricted to caller allowlist',()=>{
  expect(verifyService({'x-service-id':'M2','x-service-key':'valid'},{M2:'valid'},['M2'])).toBe('M2');
  expect(()=>verifyService({'x-service-id':'M2','x-service-key':'valid'},{M2:'valid'},['M1'])).toThrow();
  expect(()=>verifyService({'x-service-id':'M2','x-service-key':'wrong'},{M2:'valid'},['M2'])).toThrow();
});
test('SePay validates timestamp and exact raw bytes, not reparsed JSON',()=>{
  const raw=Buffer.from('{ "id": 12, "content": "đơn hàng" }');const timestamp='2000000000';const secret='test-fixture-only';
  const signature='sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
  expect(()=>verifySePay(raw,signature,timestamp,secret,Number(timestamp)*1000)).not.toThrow();
  expect(()=>verifySePay(Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),signature,timestamp,secret,Number(timestamp)*1000)).toThrow();
  expect(()=>verifySePay(raw,signature,timestamp,secret,Number(timestamp)*1000+301000)).toThrow();
});
test('idempotency fingerprint normalizes object keys but preserves array order',()=>{
  expect(fingerprint({a:1,b:2})).toBe(fingerprint({b:2,a:1}));
  expect(fingerprint([1,2])).not.toBe(fingerprint([2,1]));
});
