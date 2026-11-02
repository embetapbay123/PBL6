import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'78000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('an open history updates after Customer consent without reload or manual refresh',async({page})=>{
 const row:any={id:id(1),order_id:id(2),type:'EXCHANGE',original_type:'EXCHANGE',reason:'Đổi size',status:'RECEIVED',version:2,payment_method:'COD',amount_vnd:120000,created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',fault_party:'STORE',fee_payer:'STORE',inventory_status:'APPLIED',exchange_status:'NOT_STARTED',conversion_status:'PROPOSED',conversion_note:'Hết size đổi',items:[]};
 const writes:any[]=[];
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:id(9),roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/returns')return route.fulfill({json:{items:[row],size:20,total:1,page:1}});
  if(path==='/me/orders/'+id(2)+'/after-sale-history')return route.fulfill({json:{size:20,items:[{id:writes.length?id(51):id(50),source:'RETURN_OPERATION',action:writes.length?'ACCEPT_REFUND':'PROPOSE_REFUND',actor_kind:writes.length?'CUSTOMER':'OPERATOR',occurred_at:'2026-11-01T00:00:00.000000Z',recorded_at:'2026-11-01T00:00:00.000000Z'}]}});
  if(path==='/me/returns/'+id(1)+'/resolution'){writes.push(req.postDataJSON());Object.assign(row,{type:'REFUND',conversion_status:'ACCEPTED',version:3});return route.fulfill({json:row});}
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();await page.goto('/customer/returns');
 await page.getByText('Lịch sử đổi trả và hoàn về',{exact:true}).click();const history=page.getByRole('region',{name:'Diễn biến sau bán'});await expect(history.getByText('Store đề nghị chuyển sang hoàn đủ tiền',{exact:true})).toBeVisible();await page.getByLabel('Nội dung trao đổi / căn cứ',{exact:true}).fill('Đồng ý hoàn đủ tiền gồm phí giao ban đầu');await page.getByRole('button',{name:'Đồng ý chuyển sang hoàn đủ tiền',exact:true}).click();await expect(history.getByText('Khách đồng ý chuyển sang hoàn tiền',{exact:true})).toBeVisible();expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({action:'ACCEPT_REFUND',expected_version:2});
});
