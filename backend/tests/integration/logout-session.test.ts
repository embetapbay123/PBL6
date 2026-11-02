import 'reflect-metadata';
// Bind the singleton DB port to this suite's real private schema, not the shared app schema.
jest.mock('../../shared/src/database',()=>({database:{transaction:jest.fn(),query:jest.fn()}}));
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {Controller,Module,UseGuards} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AuthController} from '../../identity-store-service/src/auth/auth.controller';
import {AuthService,digest} from '../../identity-store-service/src/auth/auth.service';
import {AuthGuard,ServiceGuard} from '../../shared/src/auth';
import {database} from '../../shared/src/database';
import * as configuration from '../../shared/src/config';
import {ErrorFilter} from '../../shared/src/errors';
import {schemaErrors} from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

const suite=process.env.M3_DATABASE_URL?describe:describe.skip;
suite('logout HTTP and SQL binds the signed family in a private M3 schema',()=>{
 let admin:DataSource,db:DataSource,schema:string,app:any;
 const a=randomUUID(),b=randomUUID(),sidA=randomUUID(),sidB=randomUUID(),origin='http://logout.test',keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const access=(user=a,sid=sidA,expiresIn=60)=>jwt.sign({sid},keys.privateKey,{algorithm:'RS256',subject:user,issuer:'pbl6-identity',audience:'pbl6-clients',expiresIn});
 const send=(cookie='B',token:string|undefined=access())=>{let call=request(app.getHttpServer()).post('/api/v1/auth/logout').set('Origin',origin).set('Cookie',`pbl6_refresh=refresh-${cookie}; pbl6_csrf=csrf-${cookie}`).set('X-CSRF-Token','csrf-'+cookie);if(token)call=call.set('Authorization','Bearer '+token);return call;};
 const active=async()=>db.query('SELECT user_id,count(*)::int AS n FROM refresh_session WHERE revoked_at IS NULL GROUP BY user_id ORDER BY user_id');
 beforeAll(async()=>{
  admin=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='logout_case_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}}).initialize();const dir=resolve(__dirname,'../../identity-store-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  for(const user of [a,b])await db.query('INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,$3,\'ACTIVE\',now(),0)',[user,'logout-'+user+'@pbl6.test','unused-hash']);
  jest.spyOn(database,'transaction').mockImplementation(((callback:any)=>db.transaction(callback)) as any);jest.spyOn(database,'query').mockImplementation(((sql:any,params:any)=>db.query(sql,params)) as any);jest.spyOn(configuration,'config').mockReturnValue({publicKey:keys.publicKey,origin,secureCookie:false} as any);
  @Controller() @UseGuards(AuthGuard) class TestController extends AuthController{constructor(){super(new AuthService());}}
  @Module({controllers:[TestController],providers:[AuthGuard,ServiceGuard]}) class TestModule{}
  app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');app.use(cookieParser());app.use((req:any,_res:any,next:any)=>{req.correlationId='logout-session-sql';next();});app.useGlobalFilters(new ErrorFilter());await app.init();
 });
 beforeEach(async()=>{
  await db.query('DELETE FROM refresh_session');for(const [sid,user,cookie] of [[sidA,a,'A'],[sidB,b,'B']])await db.query('INSERT INTO refresh_session(id,user_id,token_hash,expires_at,family_id) VALUES($1,$2,$3,now()+interval \'1 day\',$1)',[sid,user,digest('refresh-'+cookie)]);
 });
 afterAll(async()=>{jest.restoreAllMocks();if(app)await app.close();if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^logout_case_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}});
 test('A logout with current B cookie revokes only A and sends no clear-cookie header',async()=>{
  const r=await send().send({});expect(r.status).toBe(200);expect(r.body).toMatchObject({status:'OK',cookie_session_changed:true});expect(r.headers['set-cookie']).toBeUndefined();expect(await active()).toEqual([{user_id:b,n:1}]);expect(schemaErrors(r.body,bundle.operations.logout.responses['200'])).toEqual([]);
 });
 test('same family clears the browser cookies and is safe to repeat',async()=>{
  for(let i=0;i<2;i++){const r=await send('A').send({});expect(r.status).toBe(200);expect(r.body.cookie_session_changed).toBe(false);expect(r.headers['set-cookie']).toEqual(expect.arrayContaining([expect.stringContaining('pbl6_refresh=;'),expect.stringContaining('pbl6_csrf=;')]));}expect(await active()).toEqual([{user_id:b,n:1}]);
 });
 test('expired signed access may revoke its own family without touching B',async()=>{
  const r=await send('B',access(a,sidA,-1)).send({});expect(r.status).toBe(200);expect(r.body.cookie_session_changed).toBe(true);expect(await active()).toEqual([{user_id:b,n:1}]);
 });
 test('CSRF mismatch cannot revoke a family even with valid signed access',async()=>{
  const r=await send().set('X-CSRF-Token','wrong').send({});expect(r.status).toBe(403);expect(await active()).toHaveLength(2);
 });
 test('signed user A cannot select B session ID, and invalid signature has no side effect',async()=>{
  expect((await send('B',access(a,sidB)).send({})).status).toBe(401);expect((await send('B',access().slice(0,-4)+'AAAA').send({})).status).toBe(401);expect(await active()).toHaveLength(2);
 });
 test('legacy WEB cookie and MOBILE body transports still revoke only the supplied refresh family',async()=>{
  expect((await send('A',undefined).unset('Authorization').send({})).status).toBe(200);expect(await active()).toEqual([{user_id:b,n:1}]);const r=await request(app.getHttpServer()).post('/api/v1/auth/logout').send({refresh_token:'refresh-B'});expect(r.status).toBe(200);expect(await active()).toEqual([]);
 });
 test('normal refresh reuse still revokes the entire requested family',async()=>{
  await db.query('INSERT INTO refresh_session(id,user_id,token_hash,expires_at,revoked_at,family_id) VALUES($1,$2,$3,now()+interval \'1 day\',now(),$4)',[randomUUID(),a,digest('retired-A'),sidA]);await expect(new AuthService().refresh('retired-A')).rejects.toMatchObject({status:401});expect(await active()).toEqual([{user_id:b,n:1}]);
 });
});
