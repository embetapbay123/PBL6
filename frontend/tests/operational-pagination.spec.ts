import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'94000000-0000-4000-8000-'+String(n).padStart(12,'0');
type Surface='money'|'gaps'|'audit'|'commitments';

async function model(page:Page,surface:Surface,admin=false){
 const size=surface==='commitments'?10:20,state={count:size,hold:false},pending:{route:Route;data:unknown}[]=[],reads:string[]=[];
 const context={user_id:id(1),roles:admin?['ADMIN']:['CUSTOMER',surface==='commitments'?'SELLER':'STORE_OWNER'],role_permissions:admin?['platform.admin']:[],token_version:0,...(admin?{}:{store_membership:{store_id:id(2),role:surface==='commitments'?'SELLER':'OWNER',status:'ACTIVE',permissions:surface==='commitments'?['inventory.store.read_adjust']:[]}})};
 const prefix=admin?'/admin':'/store';
 const rows=()=>Array.from({length:state.count},(_,n)=>surface==='money'?{id:id(100+n),order_id:id(200+n),payment_id:id(300+n),store_id:id(2),kind:'COLLECTION',amount_vnd:1000*(n+1),occurred_at:'2026-11-01T01:00:00Z',recorded_at:'2026-11-01T01:00:00Z',source_type:'COD_COLLECTION',source_id:'RECEIPT-'+n,time_source:'SYSTEM_CONFIRMED'}:surface==='gaps'?{order_id:id(200+n),payment_id:id(300+n),store_id:id(2),kind:'COLLECTION',amount_vnd:1000*(n+1),payment_method:'COD',reconciliation_reason:'MISSING_VERIFIED_EVENT_TIME'}:surface==='audit'?{id:id(100+n),service:'M1',store_id:id(2),actor_kind:'SYSTEM',target_type:'Product',target_id:id(200+n),target_label:'Áo kiểm nhật ký '+n,action:'UPDATE',request_id:'fixture-page-'+n,created_at:'2026-11-01T01:00:00Z',before:{},after:{}}:{order_id:id(200+n),order_status:'PENDING',variant_id:id(3),product_id:id(4),product_title:'Áo cần bàn giao '+n,sku:'OPAQUE-'+n,variant_values:{size:'XL',color:'Đen'},quantity:1,inventory_state:'CONSUMED',reconciliation:'CONSUMED_NOT_HANDED_OVER'});
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path===prefix+'/reports')return route.fulfill({json:{period_start:'2026-10-31T17:00:00Z',period_end:'2026-11-01T17:00:00Z',timezone:'Asia/Ho_Chi_Minh',order_count:0,order_value_vnd:0,completed_goods_revenue_vnd:0,shipping_fee_vnd:0,collected_vnd:surface==='money'?state.count*(state.count+1)*500:0,refunded_vnd:0,unresolved_collected_vnd:surface==='gaps'?state.count*(state.count+1)*500:0,unresolved_refunded_vnd:0,cash_series:[]}});
  if(path==='/store/inventory'||path==='/store/inventory/movements')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  const endpoint=surface==='money'?prefix+'/reports/money':surface==='gaps'?prefix+'/reports/unresolved-money':surface==='audit'?'/store/audit/catalog':'/store/stock-commitments';
  if(path===endpoint){
   reads.push(path+url.search);const number=Number(url.searchParams.get('page')??1),all=rows(),data={items:all.slice((number-1)*size,number*size),total:all.length,page:number,size,...(surface==='commitments'?{consumed_quantity:state.count,uncertain_quantity:0,as_of:'2026-11-01T01:00:00Z'}:{})};
   if(state.hold&&number===2){pending.push({route,data});return;}return route.fulfill({json:data});
  }
  if(path.endsWith('/reports/money')||path.endsWith('/reports/unresolved-money'))return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 return {state,pending,reads,size,reject:async()=>{state.hold=false;for(const item of pending)await item.route.fulfill({status:503,json:{code:'PAGE_UNAVAILABLE',message:'Không đọc được trang đối chiếu'}}).catch(()=>{});}};
}

for(const [surface,admin]of[['money',false],['money',true],['gaps',false],['gaps',true],['audit',false],['commitments',false]]as const){
 test((admin?'Admin ':'Owner/employee ')+surface+' reopens a new last page and recovers a failed GET without stale-count redirects',async({page})=>{
  const m=await model(page,surface,admin),key=surface==='money'?'money_page':surface==='gaps'?'gap_page':surface==='audit'?'page':'commitments_page';
  const path=surface==='audit'?'/seller/audit?source=catalog&action=UPDATE&':surface==='commitments'?'/seller/inventory?variant_id='+id(3)+'&':(admin?'/admin?tab=reports&':'/seller/reports?')+'from=2026-11-01&to=2026-11-02&';
  const label=surface==='money'?'Sự kiện tiền đã xác nhận':surface==='gaps'?'Khoản lịch sử chưa rõ ngày':surface==='audit'?'Bảng nhật ký Store, cuộn ngang để xem đủ cột':'Hàng đã trừ chưa bàn giao';
  await page.goto(path+key+'=2');if(surface==='gaps')await page.getByRole('button',{name:'Xem khoản chưa rõ ngày',exact:true}).click();
  const region=surface==='audit'?page.locator('main'):page.getByRole('region',{name:label,exact:true});
  await expect(region.locator('.boot-pagination')).toContainText('Trang 1 · '+m.size+' kết quả');
  m.state.count++;
  await page.getByRole('banner').getByRole('link',{name:'Trang chủ PBL6',exact:true}).click();await expect(page.getByRole('heading',{name:'Sản phẩm từ các gian hàng',exact:true})).toBeVisible();await page.goBack();
  if(surface==='gaps')await page.getByRole('button',{name:'Xem khoản chưa rõ ngày',exact:true}).click();
  await expect(region.locator('.boot-pagination')).toContainText('Trang 1 · '+m.state.count+' kết quả');
  if(surface==='money')await expect(page.locator('.financial-summary')).toContainText('231.000');
  if(surface==='gaps')await expect(page.getByText('Đã thu chưa rõ ngày: 231.000 ₫',{exact:false})).toBeVisible();
  m.state.hold=true;await region.getByRole('button',{name:'Trang sau',exact:true}).click();await expect.poll(()=>m.pending.length).toBe(1);
  await expect(page).toHaveURL(new RegExp(key+'=2'));await expect(region.getByRole('status').filter({hasText:'Đang tải…'})).toBeVisible();await expect(region.getByText(surface==='money'?'Không có sự kiện tiền đã xác nhận trong khoảng này.':surface==='gaps'?'Không có khoản lịch sử thiếu mốc tiền trong phạm vi này.':surface==='audit'?'Không có nhật ký phù hợp trong phạm vi này.':'Không có hàng chưa bàn giao hoặc lệnh kho cần đối soát trong bộ lọc.',{exact:true})).toHaveCount(0);await m.reject();
  await expect(region.getByRole('alert')).toContainText('Không đọc được trang đối chiếu');await expect(page).toHaveURL(new RegExp(key+'=2'));
  await region.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(region.locator('.boot-pagination')).toContainText('Trang 2 · '+m.state.count+' kết quả');
  if(surface==='commitments'){await expect(region).toContainText('OPAQUE-10');await expect(region).toContainText('Đen / XL');}
  else if(surface==='audit')await expect(region).toContainText('Áo kiểm nhật ký 20');
  else await expect(region.getByRole('link',{name:'Đối chiếu đơn '+id(220),exact:true})).toBeVisible();
  expect(m.reads.some(url=>url.includes('page=2'))).toBe(true);
 });
}

for(const [surface,admin]of[['money',false],['money',true],['gaps',false],['gaps',true],['audit',false],['commitments',false]]as const){
 test((admin?'Admin ':'Owner/employee ')+surface+' automatic page correction lets Back leave the work and Forward return',async({page})=>{
  await model(page,surface,admin);const key=surface==='money'?'money_page':surface==='gaps'?'gap_page':surface==='audit'?'page':'commitments_page';
  const path=surface==='audit'?'/seller/audit?source=catalog&':surface==='commitments'?'/seller/inventory?variant_id='+id(3)+'&':(admin?'/admin?tab=reports&':'/seller/reports?')+'from=2026-11-01&to=2026-11-02&';
  await page.goto(path+key+'=2');if(surface==='gaps')await page.getByRole('button',{name:'Xem khoản chưa rõ ngày',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(key+'=1'));
  await page.goBack();await expect(page).toHaveURL(/\/login$/);
  await page.goForward();await expect(page).toHaveURL(new RegExp(key+'=1'));
 });
}
