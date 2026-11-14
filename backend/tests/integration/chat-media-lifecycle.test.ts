import 'reflect-metadata';
jest.mock('../../shared/src/config',()=>({config:()=>({id:'M3',publicKey:mockPublicKey,identityUrl:'http://fixture.invalid',internalKeys:{M3:'fixture-only-key-at-least-32-characters'}})}));
jest.mock('../../shared/src/http-client',()=>({internalRequest:async(...args:any[])=>mockContexts.get(args[4].token)}));
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import jwt from 'jsonwebtoken';
import {generateKeyPairSync} from 'node:crypto';
import {chatAttachmentsController} from '../../identity-store-service/src/messaging/media.controller';
import {RequestContractInterceptor} from '../../shared/src/request-contract';
import {ErrorFilter} from '../../shared/src/errors';
import {DataSource} from 'typeorm';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm,utimes} from 'node:fs/promises';
import {readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {ChatMediaService} from '../../identity-store-service/src/messaging/media.service';
import {MessagingService} from '../../identity-store-service/src/messaging/messaging.service';

const enabled=process.env.CHAT_MEDIA_NATIVE_TEST==='1'&&process.env.M3_DATABASE_URL?describe:describe.skip;
const {publicKey:mockPublicKey,privateKey:mockPrivateKey}=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const mockContexts=new Map<string,any>();
enabled('private media lifecycle in an isolated PostgreSQL schema',()=>{
 let root:DataSource,db:DataSource,schema:string,directory:string,media:ChatMediaService,messages:MessagingService,png:Buffer;
 const customer=randomUUID(),other=randomUUID(),owner=randomUUID(),store=randomUUID(),thread=randomUUID(),foreign=randomUUID();
 const buyer={user_id:customer},stranger={user_id:other},seller={user_id:owner,store_membership:{store_id:store,role:'OWNER',status:'ACTIVE'}};
 const ip='192.0.2.1';
 async function create(kind:'IMAGE'|'VIDEO'='IMAGE',size=png.length,key=randomUUID()){
  return media.create(thread,{client_upload_id:key,kind,size_bytes:size,sha256:createHash('sha256').update(png).digest('hex')},buyer,'CUSTOMER',ip);
 }
 async function row(id:string){return (await db.query('SELECT * FROM chat_attachment WHERE id=$1',[id]))[0];}
 async function wait(id:string){for(let n=0;n<100;n++){await media.tick();const item=await row(id);if(item.status==='READY'||item.status==='REJECTED')return item;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Processor did not finish');}
 async function ready(){const asset=await create();await media.upload(thread,asset.id,buyer,'CUSTOMER',Readable.from([png]),'application/octet-stream',String(png.length));const result=await wait(asset.id);expect(result.status).toBe('READY');return result;}
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='chat_media_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000},poolSize:10}).initialize();
  const dir=resolve(process.cwd(),'identity-store-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  for(const id of [customer,other,owner])await db.query('INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,\'disabled-fixture\',\'ACTIVE\')',[id,id+'@example.test']);
  const application=randomUUID();await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Media fixture','fixture','APPROVED')",[application,owner]);
  await db.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,'Media fixture',$3,'fixture',0,'ACTIVE')",[store,application,'media-'+store]);
  await db.query('INSERT INTO store_conversation(id,store_id,customer_user_id) VALUES($1,$2,$3),($4,$2,$5)',[thread,store,customer,foreign,other]);
  directory=await mkdtemp(join(tmpdir(),'pbl6-chat-media-pg-'));const path=join(directory,'fixture.png');
  execFileSync('/usr/bin/ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=96x64','-frames:v','1','-threads','1',path]);png=await readFile(path);
 });
 beforeEach(async()=>{
  await db.query('DELETE FROM chat_attachment');await db.query('DELETE FROM store_message');await db.query("UPDATE store SET status='ACTIVE' WHERE id=$1",[store]);
  media=new ChatMediaService(db,{enabled:true,directory:join(directory,randomUUID()),ipKey:'fixture-only-key-at-least-32-characters'});messages=new MessagingService(db);
 });
 afterEach(async()=>{media?.stop();for(let n=0;(media as any)?.working&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));});
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^chat_media_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}if(directory&&resolve(directory).startsWith(resolve(tmpdir())+'/pbl6-chat-media-pg-'))await rm(directory,{recursive:true,force:true});});
 test('capabilities, raw upload, normalization, draft ownership, media-only send and replay',async()=>{
  expect((await media.capabilities(thread,buyer,'CUSTOMER')).enabled).toBe(true);
  const asset=await ready();expect(asset.content_type).toBe('image/webp');expect(asset.file_key).not.toContain(asset.id);
  await expect(media.metadata(thread,asset.id,stranger,'CUSTOMER')).rejects.toMatchObject({status:404});
  await expect(media.content(thread,asset.id,seller,'STORE')).rejects.toMatchObject({status:404});
  const key=randomUUID(),body={content:'',client_message_id:key,attachment_ids:[asset.id]};
  const sent=await messages.send(thread,body,buyer,'CUSTOMER');expect(sent.attachments?.[0].id).toBe(asset.id);
  expect((await messages.send(thread,body,buyer,'CUSTOMER')).id).toBe(sent.id);
  await expect(messages.send(thread,{...body,attachment_ids:[]},buyer,'CUSTOMER')).rejects.toMatchObject({status:422});
  await expect(messages.send(thread,{...body,content:'Changed'},buyer,'CUSTOMER')).rejects.toMatchObject({status:409});
  expect((await row(asset.id)).expires_at).toBeNull();
  const download=await media.content(thread,asset.id,seller,'STORE');expect(download.info.size).toBeGreaterThan(0);await download.handle.close();
  expect((await messages.history(thread,seller,'STORE')).items[0].attachments?.[0].id).toBe(asset.id);
  expect((await messages.list(buyer,'CUSTOMER')).items[0].last_message).toBe('Đã gửi tệp đính kèm');
  await expect(media.cancel(thread,asset.id,buyer,'CUSTOMER')).rejects.toMatchObject({status:409});
  await expect(messages.send(thread,{...body,client_message_id:randomUUID()},buyer,'CUSTOMER')).rejects.toMatchObject({status:409});
 });
 test('SHA mismatch, size, type and canceled uploads cannot become messages',async()=>{
  const asset=await create();await expect(media.upload(thread,asset.id,buyer,'CUSTOMER',Readable.from([Buffer.from('bad')]),'application/octet-stream')).rejects.toMatchObject({status:422});
  expect((await row(asset.id)).status).toBe('REJECTED');
  const canceled=await create();await media.cancel(thread,canceled.id,buyer,'CUSTOMER');
  await expect(media.upload(thread,canceled.id,buyer,'CUSTOMER',Readable.from([png]),'application/octet-stream')).rejects.toMatchObject({status:409});
  await expect(messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id]},buyer,'CUSTOMER')).rejects.toMatchObject({status:409});
  await expect(create('IMAGE',5242881)).rejects.toMatchObject({status:413});
  const mime=await create();await expect(media.upload(thread,mime.id,buyer,'CUSTOMER',Readable.from([png]),'image/png')).rejects.toMatchObject({status:415});
 });
 test('concurrent quota admission is bounded; cancel does not reset daily quota; create replay is idempotent',async()=>{
  const key=randomUUID(),a=await create('IMAGE',png.length,key);expect((await create('IMAGE',png.length,key)).id).toBe(a.id);
  const results=await Promise.allSettled(Array.from({length:6},()=>create()));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(2);
  expect((await db.query("SELECT count(*)::int AS total FROM chat_attachment WHERE status='UPLOADING'"))[0].total).toBe(3);
  await db.query("UPDATE chat_attachment SET status='DELETED'");
  for(let n=0;n<7;n++){const item=await create();await media.cancel(thread,item.id,buyer,'CUSTOMER');}
  await expect(create()).rejects.toMatchObject({status:429});
 });
 test('foreign, pending, expired, mixed and duplicate IDs are rejected without inserting a message',async()=>{
  const asset=await ready(),pending=await create();
  for(const ids of [[pending.id],[asset.id,asset.id]])await expect(messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:ids},buyer,'CUSTOMER')).rejects.toMatchObject({status:ids.length===2?422:409});
  await expect(messages.send(foreign,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id]},stranger,'CUSTOMER')).rejects.toMatchObject({status:409});
  await db.query("UPDATE chat_attachment SET kind='VIDEO' WHERE id=$1",[pending.id]);
  await db.query("UPDATE chat_attachment SET status='READY',file_key=$2,content_type='video/mp4',width=96,height=64,stored_bytes=100 WHERE id=$1",[pending.id,randomUUID()+'.video.mp4']);
  await expect(messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id,pending.id]},buyer,'CUSTOMER')).rejects.toMatchObject({status:422});
  await db.query("UPDATE chat_attachment SET expires_at=now()-interval '1 minute' WHERE id=$1",[asset.id]);
  await expect(messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id]},buyer,'CUSTOMER')).rejects.toMatchObject({status:409});
  expect((await db.query('SELECT count(*)::int AS total FROM store_message'))[0].total).toBe(0);
 });
 test('locked Store blocks new uploads and sends while existing participants retain historical reads',async()=>{
  const asset=await ready();await messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id]},buyer,'CUSTOMER');
  await db.query("UPDATE store SET status='LOCKED' WHERE id=$1",[store]);
  expect((await media.capabilities(thread,buyer,'CUSTOMER')).enabled).toBe(false);
  await expect(create()).rejects.toMatchObject({status:409});
  const file=await media.content(thread,asset.id,buyer,'CUSTOMER');await file.handle.close();
  await expect(media.content(thread,asset.id,{...seller,store_membership:{...seller.store_membership,status:'REVOKED'}},'STORE')).rejects.toMatchObject({status:403});
 });
 test('READY committed before a lost acknowledgement retains its normalized file',async()=>{
  const asset=await create();await db.query("UPDATE chat_attachment SET status='PROCESSING' WHERE id=$1",[asset.id]);
  const temp=await media.files.temporary();await temp.handle.writeFile(png);await temp.handle.close();await media.files.publish(temp.key,asset.id+'.upload');
  const query=db.query.bind(db);let lost=false;
  const spy=jest.spyOn(db,'query').mockImplementation((async(...args:any[])=>{const result=await (query as any)(...args);if(!lost&&String(args[0]).includes("SET status='READY'")){lost=true;throw new Error('synthetic lost acknowledgement');}return result;}) as any);
  try{await media.tick();}finally{spy.mockRestore();}
  expect(lost).toBe(true);expect((await row(asset.id)).status).toBe('READY');
  const file=await media.content(thread,asset.id,buyer,'CUSTOMER');await file.handle.close();
 });
 test('cancel during processing cannot resurrect an asset, and expiry cleanup runs with the feature disabled',async()=>{
  const asset=await create();await db.query("UPDATE chat_attachment SET status='PROCESSING' WHERE id=$1",[asset.id]);
  const normalized=randomUUID()+'.image.webp',temp=await media.files.temporary();await temp.handle.writeFile(png);await temp.handle.close();await media.files.publish(temp.key,normalized);
  (media as any).processor.process=async()=>{await media.cancel(thread,asset.id,buyer,'CUSTOMER');return {key:normalized,content_type:'image/webp',stored_bytes:png.length,width:96,height:64};};
  await media.tick();expect((await row(asset.id)).status).toBe('DELETED');await expect(media.files.openRead(normalized)).rejects.toMatchObject({code:'ENOENT'});
  const expiring=await readyWithNewService();await db.query("UPDATE chat_attachment SET expires_at=now()-interval '1 minute' WHERE id=$1",[expiring.id]);
  const disabled=new ChatMediaService(db,{enabled:false,directory:media.files.root});
  (disabled as any).sweeps=59;await disabled.tick();
  expect((await row(expiring.id)).status).toBe('EXPIRED');await expect(media.files.openRead(expiring.file_key)).rejects.toMatchObject({code:'ENOENT'});
  async function readyWithNewService(){media=new ChatMediaService(db,{enabled:true,directory:join(directory,randomUUID()),ipKey:'fixture-only-key-at-least-32-characters'});return ready();}
 });
 test('orphan files older than two hours are removed without removing live READY content',async()=>{
  const asset=await ready(),temp=await media.files.temporary();await temp.handle.writeFile('orphan');await temp.handle.close();
  const path=media.files.path(temp.key);await utimes(path,new Date(0),new Date(0));(media as any).sweeps=59;await media.tick();
  await expect(media.files.openRead(temp.key)).rejects.toMatchObject({code:'ENOENT'});const live=await media.files.openRead(asset.file_key);await live.handle.close();
 });
 test('HTTP transports raw bytes, enforces roles and current ownership, and supports private GET/HEAD/Range',async()=>{
  const beforeService=process.env.SERVICE_ID;process.env.SERVICE_ID='M3';
  const tokens=[buyer,stranger,seller].map((actor,index)=>{const token=jwt.sign({sub:actor.user_id,sid:randomUUID(),index},mockPrivateKey,{algorithm:'RS256',issuer:'pbl6-identity',audience:'pbl6-clients',expiresIn:'5m'});mockContexts.set(token,{...actor,roles:index===2?['STORE_OWNER']:['CUSTOMER']});return token;});
  @Module({controllers:[chatAttachmentsController('me','CUSTOMER',media),chatAttachmentsController('store','STORE',media)]})class HttpFixture{}
  const app=await NestFactory.create(HttpFixture,{rawBody:true,logger:false});app.setGlobalPrefix('api/v1');app.useGlobalInterceptors(new RequestContractInterceptor());app.useGlobalFilters(new ErrorFilter());await app.listen(0,'127.0.0.1');
  const base=await app.getUrl(),path='/api/v1/me/conversations/'+thread+'/attachments';
  const call=(route:string,token=tokens[0],method='GET',body?:BodyInit,headers:Record<string,string>={})=>fetch(base+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body}:{})});
  try{
   expect((await call(path+'/capabilities','')).status).toBe(401);expect((await call(path+'/capabilities',tokens[2])).status).toBe(403);
   expect((await call(path+'/capabilities',tokens[1])).status).toBe(404);
   const r=await call(path, tokens[0],'POST',JSON.stringify({client_upload_id:randomUUID(),kind:'IMAGE',size_bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')}),{'Content-Type':'application/json'});expect(r.status).toBe(201);const asset:any=await r.json();
   const uploaded=await call(path+'/'+asset.id+'/content',tokens[0],'PUT',new Uint8Array(png),{'Content-Type':'application/octet-stream'});expect(uploaded.status).toBe(200);expect((await uploaded.json() as any).status).toBe('PROCESSING');await wait(asset.id);
   const full=await call(path+'/'+asset.id+'/content');expect(full.status).toBe(200);expect(full.headers.get('Cache-Control')).toBe('private, no-store');expect(full.headers.get('X-Content-Type-Options')).toBe('nosniff');const bytes=Buffer.from(await full.arrayBuffer());expect(bytes.toString('ascii',8,12)).toBe('WEBP');
   const partial=await call(path+'/'+asset.id+'/content',tokens[0],'GET',undefined,{Range:'bytes=0-11'});expect(partial.status).toBe(206);expect(partial.headers.get('Content-Range')).toBe('bytes 0-11/'+bytes.length);expect(Buffer.from(await partial.arrayBuffer())).toEqual(bytes.subarray(0,12));
   const head=await call(path+'/'+asset.id+'/content',tokens[0],'HEAD');expect(head.status).toBe(200);expect(head.headers.get('Content-Length')).toBe(String(bytes.length));expect((await head.arrayBuffer()).byteLength).toBe(0);
   expect((await call(path+'/bad/content',tokens[0],'HEAD')).status).toBe(422);
   expect((await call(path+'/'+asset.id+'/content',tokens[0],'GET',undefined,{Range:'bytes=99999999-'})).status).toBe(416);
   expect((await call(path+'/'+asset.id+'/content',tokens[1])).status).toBe(404);
   const message=await messages.send(thread,{content:'',client_message_id:randomUUID(),attachment_ids:[asset.id]},buyer,'CUSTOMER');expect(message.attachments).toHaveLength(1);
   const sellerPath=path.replace('/me/','/store/');const read=await call(sellerPath+'/'+asset.id+'/content',tokens[2]);expect(read.status).toBe(200);await read.arrayBuffer();
   const wrongContext=await call(sellerPath+'/'+asset.id+'/content',tokens[2],'GET',undefined,{'X-Store-Context':randomUUID()});expect(wrongContext.status).toBe(409);
  }finally{await app.close();process.env.SERVICE_ID=beforeService;mockContexts.clear();}
 });
});
