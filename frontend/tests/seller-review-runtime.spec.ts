import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {seededMarket} from './runtime/seeded-market';

test.skip(process.env.SELLER_REVIEW_QA !== '1','Requires the private pbl6-fe-verify stack and tagged fixtures.');
test.use({viewport:{width:1440,height:900}});
test('Store settings and inbox use real gateway, current scope and persisted read/archive state',async({page},info)=>{
 test.setTimeout(120000);
 const f=seededMarket('corecheckout',{verified:true}),owner=await f.actor('seller-review-owner'),buyer=await f.actor('seller-review-customer');
 const create=`const {Client}=require('pg'),{randomUUID}=require('crypto');(async()=>{let s='';for await(const b of process.stdin)s+=b;const x=JSON.parse(s);if(!/^corecheckout-[0-9]+$/.test(x.tag)||process.env.EMAIL_ADAPTER!=='capture')throw Error('Private tagged QA only');const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{await c.query('BEGIN');const application=randomUUID(),store=randomUUID();await c.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,$3,$4,'APPROVED')",[application,x.owner,x.tag,x.tag+'@pbl6.test']);await c.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,$3,$3,$4,0,'ACTIVE')",[store,application,x.tag,x.tag+'@pbl6.test']);await c.query("INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at) VALUES($1,$2,$3,'OWNER','ACTIVE',now())",[randomUUID(),store,x.owner]);await c.query("INSERT INTO user_role(user_id,role_id,granted_at) SELECT $1,id,now() FROM role WHERE code='STORE_OWNER' AND status='ACTIVE' ON CONFLICT DO NOTHING",[x.owner]);await c.query('COMMIT');process.stdout.write(JSON.stringify({store}));}catch(e){await c.query('ROLLBACK');throw e}finally{await c.end()}})().catch(e=>{console.error(e.message);process.exit(1)});`;
 const {store}=JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m3-1','node','-e',create],{input:JSON.stringify({tag:f.tag,owner:owner.user}),encoding:'utf8'}));
 try {
  const ownerSession=await f.api('/auth/login',undefined,'POST',{email:owner.email,password:f.password,client_type:'MOBILE'}),token=ownerSession.access_token;
  const settings=await f.api('/store',token);expect(settings.id).toBe(store);
  const updated=await f.api('/store',token,'PATCH',{expected_version:settings.version,logo_url:'https://example.test/qa-logo.png'});expect(updated.logo_url).toBe('https://example.test/qa-logo.png');expect((await f.api('/store',token)).logo_url).toBe(updated.logo_url);
  const unauthorized=await f.raw('/store',buyer.access,'PATCH',{expected_version:updated.version,logo_url:'https://example.test/wrong.png'});expect([403,404]).toContain(unauthorized.status);expect((await f.api('/store',token)).logo_url).toBe(updated.logo_url);
  const stock=await f.api('/store/inventory?page=1&size=1&sort=AVAILABLE_ASC',token);expect(stock.total).toBe(0);
  const returns=await f.api('/store/returns?page=1&size=1&status=REQUESTED',token);expect(returns.total).toBe(0);
  const delivery=await f.api('/store/delivery-returns?page=1&size=1',token);expect(delivery.summary).toEqual({open:0,awaiting_inspection:0});
  const thread=await f.api('/me/conversations',buyer.access,'POST',{store_id:store});
  const message=await f.api('/me/conversations/'+thread.id+'/messages',buyer.access,'POST',{content:'Sản phẩm: Áo thử QA\nCòn hàng không?',client_message_id:crypto.randomUUID()});
  const list=await f.api('/store/conversations?q='+encodeURIComponent(f.tag),token);expect(list.items).toHaveLength(1);expect(list.items[0]).toMatchObject({id:thread.id,unread_count:1,last_product_mention:'Áo thử QA'});expect(list.unread_total).toBe(1);
  const read=await f.api('/store/conversations/'+thread.id+'/read',token,'POST',{message_id:message.id});expect(read.unread_count).toBe(0);
  await f.api('/store/conversations/'+thread.id+'/archive',token,'POST',{archived:true});expect((await f.api('/store/conversations?archived=true',token)).items.map((item:any)=>item.id)).toContain(thread.id);
  try{await f.login(page,owner.email);}finally{await page.evaluate(()=>document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input=>{input.value='';})).catch(()=>{});}await page.goto('/seller/messages');await expect(page.getByRole('button',{name:'Xem hội thoại đã lưu trữ'})).toBeVisible();await page.getByRole('button',{name:'Xem hội thoại đã lưu trữ'}).click();await expect(page.getByRole('navigation',{name:'Hội thoại'})).toContainText('Áo thử QA');await page.screenshot({path:info.outputPath('seller-inbox-1440.png')});
 } finally {
  const cleanup=`const {Client}=require('pg');(async()=>{let s='';for await(const b of process.stdin)s+=b;const x=JSON.parse(s);if(!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Tagged only');const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{const r=await c.query("UPDATE store SET status='LOCKED',version=version+1 WHERE id=$1 AND name=$2",[x.store,x.tag]);if(r.rowCount!==1)throw Error('Tagged Store not found');}finally{await c.end()}})().catch(e=>{console.error(e.message);process.exit(1)});`;
  execFileSync('docker',['exec','-i','pbl6-fe-verify-m3-1','node','-e',cleanup],{input:JSON.stringify({tag:f.tag,store}),encoding:'utf8'});
 }
});
