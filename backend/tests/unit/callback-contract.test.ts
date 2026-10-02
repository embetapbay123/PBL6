import { createHmac } from 'node:crypto';
import { SePayController } from '../../commerce-service/src/payment/sepay.controller';
const secret='unit-callback-key';
describe('callback authentication precedes DTO parsing',()=>{
  const original=process.env.SEPAY_WEBHOOK_SECRET;
  const sandbox=process.env.SANDBOX_WEBHOOK_SECRET;
  beforeEach(()=>{process.env.SEPAY_WEBHOOK_SECRET=secret;process.env.SANDBOX_WEBHOOK_SECRET=secret;});
  afterAll(()=>{if(original===undefined)delete process.env.SEPAY_WEBHOOK_SECRET;else process.env.SEPAY_WEBHOOK_SECRET=original;if(sandbox===undefined)delete process.env.SANDBOX_WEBHOOK_SECRET;else process.env.SANDBOX_WEBHOOK_SECRET=sandbox;});
  test('invalid SePay signature returns 401 even when DTO is invalid',()=>{
    const raw=Buffer.from('{}');
    expect(()=>new SePayController().callback({rawBody:raw,body:{},headers:{}})).toThrow(expect.objectContaining({status:401}));
  });
  test('valid raw signature reaches DTO validation and rejects malformed payload',()=>{
    const raw=Buffer.from('{ }'),timestamp=String(Math.floor(Date.now()/1000));
    const signature='sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
    expect(()=>new SePayController().callback({rawBody:raw,body:{},params:{},query:{},headers:{'x-sepay-signature':signature,'x-sepay-timestamp':timestamp}})).toThrow(expect.objectContaining({status:422}));
  });
  test('legacy sandbox also authenticates raw bytes before DTO',()=>{
    const raw=Buffer.from('{}'),signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
    const controller=new SePayController();
    expect(()=>controller.sandbox({rawBody:raw,body:{},headers:{}})).toThrow(expect.objectContaining({status:401}));
    expect(()=>controller.sandbox({rawBody:raw,body:{},params:{},query:{},headers:{'x-sandbox-signature':signature}})).toThrow(expect.objectContaining({status:422}));
  });
});
