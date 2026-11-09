import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {exchangeMarket} from './runtime/exchange-market';

test.skip(process.env.CORE_FIX_EXCHANGE_WRITER!=='1','Explicit isolated writer rollback acceptance only.');
test.use({viewport:{width:1440,height:900}});

test('paused writer retains readers, resumes frozen work and recovers a committed lost ACK without repeating stock',async({page},info)=>{
 test.setTimeout(300000);page.setDefaultTimeout(15000);
 const f=await exchangeMarket(),checks:any[]=[],errors:string[]=[];
 const compose=['compose','--env-file','infrastructure/.env','-p','pbl6-fe-verify',...['infrastructure/compose.yaml','artifacts/compose-fe-verify.yaml','artifacts/compose-core-fix.yaml','artifacts/compose-core-fix-store-pages28.yaml','artifacts/compose-core-fix-refund36.yaml','artifacts/compose-core-fix-exchange37.yaml','artifacts/compose-core-fix-availability41.yaml','artifacts/compose-core-fix-audit46.yaml','artifacts/compose-core-fix-store-context47.yaml','artifacts/compose-core-fix-report49.yaml','artifacts/compose-core-fix-voucher50.yaml','artifacts/compose-core-fix-moderation51.yaml','artifacts/compose-core-fix-admin-audit53.yaml','artifacts/compose-core-fix-admin-context54.yaml','artifacts/compose-core-fix-messaging56.yaml','artifacts/compose-core-fix-exchange-writer61.yaml'].flatMap(p=>['-f',p])];
 const docker=(args:string[],input?:string)=>execFileSync('docker',args,{cwd:'C:/PBL6',encoding:'utf8',input,stdio:['pipe','pipe','pipe'],timeout:60000});
 const record=(step:string,data:object)=>{checks.push({step,...data});writeFileSync(info.outputPath('exchange-writer-checkpoints.json'),JSON.stringify({tag:f.tag,runtime:'Node61c/AI56/frontend61',evidence:'REAL_UI_HTTP_DATABASE_WORKER',limits:'Private identities seeded. Lost ACK injected after a signed HTTP M1 commit in an isolated one-shot M2 consumer; not a provider or network outage claim.',checkpoints:checks},null,2));};
 let stopped=false,paused=false;
 async function gate(enabled:boolean){
  docker([...compose,...(enabled?[]:['-f','artifacts/compose-core-fix-exchange-writer61-paused.yaml']),'up','-d','--no-deps','m1']);paused=!enabled;
  await expect.poll(async()=>{try{return (await fetch('http://127.0.0.1:18080/api/v1/products?size=1')).status;}catch{return 0;}},{timeout:20000}).toBe(200);
  expect(docker(['exec','pbl6-fe-verify-m1-1','node','-e','process.stdout.write(process.env.EXCHANGE_DISPATCH_WRITES_ENABLED)']).trim()).toBe(String(enabled));
 }
 async function login(view:Page,who:'owner'|'buyer'|'admin'){
  try{await test.step('Login private actor; credentials withheld',async()=>{
   await view.goto('/login');await view.getByLabel('Email',{exact:true}).fill(who==='admin'?'admin@pbl6.test':f[who].email);await view.getByLabel('Mật khẩu',{exact:true}).fill(who==='admin'?process.env.SEED_PASSWORD!:f.password);await view.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(view.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
  },{box:true});}finally{await view.evaluate(()=>document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(e=>{e.value='';})).catch(()=>{});}
 }
 async function queue(r:any){return f.api('/store/returns/'+r.id,f.owner.access,'PATCH',{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:r.version,replacement_reference:f.tag+'-HANDOFF-'+r.id,replacements:[{order_item_id:r.items[0].order_item_id,variant_id:f.large.id}]});}
 async function stockProof(requestId:string){
  const code=`const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);const c=new Client({connectionString:process.env.M1_DATABASE_URL});await c.connect();try{const d=await c.query('SELECT operation_id,dispatch_snapshot FROM inventory_exchange_dispatch WHERE receipt_id=$1',[x.id]),m=await c.query("SELECT delta_quantity,delta_reserved FROM stock_movement WHERE receipt_id=$1 AND reason='EXCHANGE_DISPATCH'",[x.id]);console.log(JSON.stringify({dispatches:d.rows,movements:m.rows}));}finally{await c.end();}})().catch(()=>{process.exitCode=1;});`;
  return JSON.parse(docker(['exec','-i','pbl6-fe-verify-m1-1','node','-e',code],JSON.stringify({id:requestId})));
 }
 async function openReturns(view:Page,who:'owner'|'buyer'|'admin'){
  await login(view,who);await view.getByRole('button',{name:'Menu tài khoản',exact:true}).click();const menu=view.getByRole('navigation',{name:'Menu tài khoản',exact:true});
  if(who==='owner'){await menu.getByRole('link',{name:'Store Portal',exact:true}).click();await view.getByRole('complementary').getByRole('link',{name:'Đổi trả',exact:true}).click();}
  else if(who==='buyer'){await menu.getByRole('link',{name:'Đơn hàng',exact:true}).click();await view.getByRole('link',{name:'Đổi trả',exact:true}).click();}
  else{await menu.getByRole('link',{name:/Admin/}).click();await view.getByRole('button',{name:'Đổi trả',exact:true}).click();}
 }
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await gate(false);
  const a=await f.paidOrder(),request=await f.request(a.id,'EXCHANGE'),ready=await f.receive(request.id);expect((await f.quantity(f.variant.id)).quantity).toBe(10);
  await queue(ready);await expect.poll(async()=>(await f.readRequest(request.id)).last_error,{timeout:20000}).toBe('EXCHANGE_DISPATCH_PAUSED');
  const pending=await f.readRequest(request.id);expect(pending).toMatchObject({status:'RECEIVED',exchange_status:'PENDING'});expect(pending.exchange_dispatch).toBeUndefined();expect((await f.quantity(f.large.id)).quantity).toBe(3);expect(await stockProof(request.id)).toEqual({dispatches:[],movements:[]});
  await openReturns(page,'owner');await expect(page.getByText('Việc xác nhận bàn giao hàng đổi đang tạm dừng.',{exact:false})).toBeVisible();await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Chuẩn bị hàng đổi',exact:true})).toHaveCount(0);await page.screenshot({path:info.outputPath('owner-paused.png'),fullPage:true});
  record('NEW_WRITES_PAUSED_READERS_AVAILABLE',{order:a.id,request:request.id,stock:await f.quantity(f.large.id),proof:await stockProof(request.id),receipt_applied_while_paused:true});
  await gate(true);await expect.poll(async()=>(await f.readRequest(request.id)).status,{timeout:20000}).toBe('EXCHANGE_SENT');const sent=await f.readRequest(request.id);expect((await f.quantity(f.large.id)).quantity).toBe(2);record('SAME_COMMAND_RESUMED_ONCE',{request:request.id,snapshot:sent.exchange_dispatch,proof:await stockProof(request.id)});
  await f.api('/me/returns/'+request.id+'/confirm',f.buyer.access,'POST',{expected_version:sent.version});
  const b=await f.paidOrder(),second=await f.request(b.id,'EXCHANGE'),secondReady=await f.receive(second.id);
  docker([...compose,'stop','worker-m2']);stopped=true;await queue(secondReady);
  // One-shot consumer calls the real signed HTTP adapter, drops only the response after M1 commits.
  const code=`const db=require('./dist/shared/src/database'),{config}=require('./dist/shared/src/config'),{InternalClients}=require('./dist/shared/src/internal-clients'),{ReturnsRunner}=require('./dist/commerce-service/src/returns/returns.runner'),{ApiError}=require('./dist/shared/src/errors');(async()=>{let id='';for await(const b of process.stdin)id+=b;await db.initializeDatabase();try{const c=config('M2'),rpc=new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});await new ReturnsRunner(db.database,async(op,body,corr)=>{await rpc.call(op,body,corr);throw new ApiError(503,'TEST_ACK_LOST','Injected after signed HTTP commit');}).process(id.trim());console.log(JSON.stringify({injection:'after_signed_http_commit',completed:true}));}finally{await db.database.destroy();}})().catch(()=>{process.exitCode=1;});`;
  expect(JSON.parse(docker(['exec','-i','pbl6-fe-verify-m2-1','node','-e',code],second.id)).completed).toBe(true);
  expect(await f.readRequest(second.id)).toMatchObject({status:'RECEIVED',exchange_status:'PENDING',last_error:'TEST_ACK_LOST'});const committed=await stockProof(second.id);expect(committed.dispatches).toHaveLength(1);expect(committed.movements).toEqual([{delta_quantity:-1,delta_reserved:0}]);expect((await f.quantity(f.large.id)).quantity).toBe(1);
  await gate(false);let product=await f.api('/store/products/'+f.product.id,f.owner.access);await f.api('/store/products/'+product.id,f.owner.access,'PATCH',{expected_version:product.version,title:f.tag+' changed after commit',variants:product.variants.map((v:any)=>v.id===f.large.id?{...v,sku:f.tag+'-CHANGED',price_vnd:110000,variant_values:{size:'XXL'}}:v)});
  docker([...compose,'start','worker-m2']);stopped=false;await expect.poll(async()=>(await f.readRequest(second.id)).status,{timeout:25000}).toBe('EXCHANGE_SENT');const recovered=await f.readRequest(second.id);expect(recovered.exchange_dispatch).toEqual(committed.dispatches[0].dispatch_snapshot);expect(await stockProof(second.id)).toEqual(committed);expect((await f.quantity(f.large.id)).quantity).toBe(1);
  for(const [scope,token] of [['me',f.buyer.access],['store',f.owner.access],['admin',f.admin]] as const){const rows=await f.api('/'+scope+'/returns?order_id='+b.id,token);expect(rows.items[0].exchange_dispatch).toEqual(recovered.exchange_dispatch);}
  await page.getByRole('button',{name:'Làm mới',exact:true}).click();const card=page.locator('article').filter({hasText:b.id});await expect(card.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toContainText('Phân loại: L');await expect(card).toContainText(f.large.sku);await page.screenshot({path:info.outputPath('owner-recovered-reader.png'),fullPage:true});
  record('COMMITTED_ACK_RECOVERED_WHILE_WRITER_OFF',{order:b.id,request:second.id,snapshot:recovered.exchange_dispatch,proof:await stockProof(second.id),stock:await f.quantity(f.large.id),all_three_role_readers_match:true});
  await f.api('/me/returns/'+second.id+'/confirm',f.buyer.access,'POST',{expected_version:recovered.version});expect(errors).toEqual([]);
 }finally{
  if(paused)await gate(true);if(stopped)docker([...compose,'start','worker-m2']);await f.cleanup();const store=await f.api('/store',f.owner.access);await f.api('/admin/stores/'+store.id,f.admin,'PATCH',{expected_version:store.version,status:'LOCKED',reason:f.tag+' withdraw rollback fixture'});record('CLEANUP',{store:f.store.id,product:f.product.id,writer_enabled:true,worker_running:true,product_stopped:true,store_locked:true,history_retained:true});
 }
});
