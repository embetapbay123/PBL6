import {createServer,IncomingMessage,ServerResponse} from 'node:http';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {DeliveryError,DeliveryService} from './service';

function required(name:string,min=1){const value=process.env[name];if(!value||value.length<min)throw new Error('Missing delivery configuration: '+name);return value;}
export function equalSecret(a:string,b:string){const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);}
export function deliverySignature(secret:string,timestamp:string,body:string){return createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');}

export async function startDeliveryServer(){
  const merchantKey=required('DELIVERY_API_KEY',24),password=required('DELIVERY_OPERATOR_PASSWORD',12),sessionKey=required('DELIVERY_SESSION_KEY',24),webhookSecret=required('DELIVERY_WEBHOOK_SECRET',24);
  const webhookUrl=required('DELIVERY_WEBHOOK_URL');
  const pool=new Pool({connectionString:required('DELIVERY_DATABASE_URL'),max:8,statement_timeout:5000});
  await pool.query(readFileSync(resolve(process.cwd(),'delivery-service/migrations/001_delivery.sql'),'utf8'));
  const service=new DeliveryService(pool);
  const cookiePath=process.env.DELIVERY_PUBLIC_PATH??'/delivery';
  const secure=process.env.DELIVERY_COOKIE_SECURE==='1';
  const portal=readFileSync(resolve(process.cwd(),'delivery-service/public/index.html'));
  const loginAttempts=new Map<string,{count:number;expires:number}>();
  async function jsonBody(req:IncomingMessage){
    let raw='';
    for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>65536)throw new DeliveryError(413,'BODY_TOO_LARGE','Nội dung quá lớn.');}
    try{return JSON.parse(raw);}catch{throw new DeliveryError(422,'INVALID_JSON','JSON chưa hợp lệ.');}
  }
  function reply(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  function operator(req:IncomingMessage){
    const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('delivery_session='))?.slice(17)??'';
    const [expires,nonce,signature]=token.split('.');
    if(!expires||!nonce||!signature||Number(expires)<Date.now()||!equalSecret(createHmac('sha256',sessionKey).update(expires+'.'+nonce).digest('hex'),signature))throw new DeliveryError(401,'LOGIN_REQUIRED','Đăng nhập cổng giao nhận.');
  }
  function sameSite(req:IncomingMessage){
    if(req.headers['sec-fetch-site']==='cross-site')throw new DeliveryError(403,'ORIGIN_REJECTED','Yêu cầu ngoài cổng giao nhận.');
    const origin=req.headers.origin;
    const expected=process.env.DELIVERY_PUBLIC_ORIGIN;
    if(origin&&expected&&origin!==expected)throw new DeliveryError(403,'ORIGIN_REJECTED','Nguồn yêu cầu chưa hợp lệ.');
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    try{
      const url=new URL(req.url??'/', 'http://delivery');
      if(req.method==='GET'&&url.pathname==='/health'){await pool.query('SELECT 1');return reply(res,200,{status:'ready',service:'delivery'});}
      if(req.method==='GET'&&['/','/ops','/ops/'].includes(url.pathname)){
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(portal);return;
      }
      if(url.pathname==='/ops/api/login'&&req.method==='POST'){
        sameSite(req);
        const ip=req.socket.remoteAddress??'unknown',now=Date.now();
        for(const [key,value] of loginAttempts)if(value.expires<now)loginAttempts.delete(key);
        const limit=loginAttempts.get(ip)??{count:0,expires:now+60000};limit.count++;loginAttempts.set(ip,limit);
        if(limit.count>10)throw new DeliveryError(429,'TRY_LATER','Thử lại sau một phút.');
        const body=await jsonBody(req);
        if(typeof body.password!=='string'||!equalSecret(body.password,password))throw new DeliveryError(401,'INVALID_LOGIN','Mật khẩu chưa đúng.');
        const token=String(Date.now()+4*3600000)+'.'+randomUUID();
        const signed=token+'.'+createHmac('sha256',sessionKey).update(token).digest('hex');
        res.setHeader('Set-Cookie',`delivery_session=${signed}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=14400${secure?'; Secure':''}`);
        return reply(res,200,{authenticated:true});
      }
      if(url.pathname.startsWith('/ops/api/')){
        operator(req);if(req.method!=='GET')sameSite(req);
        if(url.pathname==='/ops/api/logout'&&req.method==='POST'){
          res.setHeader('Set-Cookie',`delivery_session=; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=0${secure?'; Secure':''}`);return reply(res,200,{authenticated:false});
        }
        if(url.pathname==='/ops/api/parcels'&&req.method==='GET'){
          const page=Number(url.searchParams.get('page')??1);
          if(!Number.isSafeInteger(page)||page<1||page>100000)throw new DeliveryError(422,'INVALID_PAGE','Trang chưa hợp lệ.');
          return reply(res,200,await service.list(page));
        }
        const action=url.pathname.match(/^\/ops\/api\/parcels\/([^/]+)\/actions$/);
        if(action&&req.method==='POST')return reply(res,200,await service.advance(decodeURIComponent(action[1]),await jsonBody(req),'OPERATOR'));
      }else if(url.pathname.startsWith('/api/v1/')){
        if(!equalSecret(req.headers.authorization??'','Bearer '+merchantKey))throw new DeliveryError(401,'MERCHANT_AUTH_REQUIRED','API key chưa hợp lệ.');
        if(url.pathname==='/api/v1/parcels'&&req.method==='POST')return reply(res,200,await service.create(await jsonBody(req)));
        const parcel=url.pathname.match(/^\/api\/v1\/parcels\/([^/]+)(\/commands)?$/);
        if(parcel&&req.method==='GET'&&!parcel[2])return reply(res,200,await service.lookup(decodeURIComponent(parcel[1])));
        if(parcel&&req.method==='POST'&&parcel[2])return reply(res,200,await service.advance(decodeURIComponent(parcel[1]),await jsonBody(req),'MERCHANT'));
      }
      throw new DeliveryError(404,'NOT_FOUND','Không tìm thấy chức năng.');
    }catch(error){
      const known=error instanceof DeliveryError;
      reply(res,known?error.status:503,{code:known?error.code:'DELIVERY_UNAVAILABLE',message:known?error.message:'Dịch vụ giao nhận tạm gián đoạn.'});
    }
  });
  let running=false;
  async function tick(){
    if(running)return;running=true;
    try{
      const {rows}=await pool.query(`UPDATE delivery_event SET lease_until=now()+interval '30 seconds' WHERE id IN (
        SELECT id FROM delivery_event WHERE delivered_at IS NULL AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 5) RETURNING *`);
      for(const event of rows){
        try{
          const body=JSON.stringify({event_id:event.id,parcel:event.snapshot_json}),timestamp=String(Math.floor(Date.now()/1000));
          const response=await fetch(webhookUrl,{method:'POST',headers:{'Content-Type':'application/json','X-Delivery-Timestamp':timestamp,'X-Delivery-Signature':deliverySignature(webhookSecret,timestamp,body)},body,signal:AbortSignal.timeout(5000),redirect:'error'});
          if(!response.ok)throw new Error('callback');
          await pool.query('UPDATE delivery_event SET delivered_at=now(),lease_until=NULL,last_error=NULL WHERE id=$1',[event.id]);
        }catch{await pool.query("UPDATE delivery_event SET attempts=attempts+1,next_attempt_at=now()+interval '30 seconds',lease_until=NULL,last_error='CALLBACK_RETRY' WHERE id=$1",[event.id]);}
      }
    }catch{console.error('DELIVERY_OUTBOX_RETRY');}finally{running=false;}
  }
  const timer=setInterval(tick,3000);
  server.listen(Number(process.env.PORT??3110),'0.0.0.0');
  const close=async()=>{clearInterval(timer);server.close();while(running)await new Promise(r=>setTimeout(r,20));await pool.end();};
  process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
  return {server,close};
}
if(require.main===module)startDeliveryServer().catch(()=>{console.error('DELIVERY_START_FAILED');process.exit(1);});
