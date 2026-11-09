import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const order='64000000-0000-4000-8000-000000000001',id='64000000-0000-4000-8000-000000000002';
const request={inventory_status:'APPLIED',exchange_status:'NOT_STARTED',fault_party:'STORE',fee_payer:'STORE',items:[],id,order_id:order,type:'EXCHANGE',reason:'Sai kích thước',status:'REQUESTED',version:0,payment_method:'COD',amount_vnd:100000,created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z'};
test('Seller status filter requests the complete Store feed and survives reload',async({page})=>{
 const reads:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/v1/store/returns')reads.push(r.url());});
 await setup(page,{seller:true});await page.getByRole('navigation',{name:'Lọc trạng thái đổi trả'}).getByRole('button',{name:'Chờ duyệt'}).click();
 await expect(page).toHaveURL(/status=REQUESTED/);await expect.poll(()=>reads.some(url=>new URL(url).searchParams.get('status')==='REQUESTED')).toBe(true);
 await page.reload();await expect(page.getByRole('navigation',{name:'Lọc trạng thái đổi trả'}).getByRole('button',{name:'Chờ duyệt'})).toHaveAttribute('aria-pressed','true');
});
test('return details restore the filter, page, scroll and keyboard opener',async({page})=>{
 await page.setViewportSize({width:1024,height:768});
 await setup(page,{seller:true});
 const approved=Array.from({length:20},(_,i)=>({...request,status:'APPROVED',id:`64000000-0000-4000-8000-${String(i+100).padStart(12,'0')}`}));
 await page.route('**/api/v1/store/returns?*',route=>{
   const params=new URL(route.request().url()).searchParams;
   const n=Number(params.get('page'));
   return route.fulfill({json:{items:approved,page:n,size:20,total:params.has('order_id')?20:40}});
 });
 const filter=page.getByRole('button',{name:'Đã duyệt',exact:true});
 await filter.click();
 await page.getByRole('button',{name:'Trang sau',exact:true}).click();
 await expect(page).toHaveURL(/status=APPROVED&page=2/);
 const table=page.locator('.seller-returns-summary-table');
 const opener=table.getByRole('link',{name:/Xem chi tiết/}).last();
 await opener.focus();
 const before=await table.evaluate(element=>({top:element.scrollTop,left:element.scrollLeft,windowY:window.scrollY}));
 expect(before.top).toBeGreaterThan(0);
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Đổi hàng #'+approved.at(-1)!.id.slice(-8),exact:true})).toBeVisible();
 const back=page.getByRole('link',{name:/Quay lại danh sách đổi trả/});
 await expect(back).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/status=APPROVED&page=2/);
 await expect(filter).toHaveAttribute('aria-pressed','true');
 await expect(opener).toBeFocused();
 await expect.poll(()=>table.evaluate(element=>({top:element.scrollTop,left:element.scrollLeft,windowY:window.scrollY}))).toEqual(before);
});
async function setup(page:Page,{seller=false,sellerDetail=false,initial=request,conflict=false,failList=false}:{seller?:boolean;sellerDetail?:boolean;initial?:typeof request;conflict?:boolean;failList?:boolean}={}){
  let row={...initial},conflicted=false;const writes:unknown[]=[];
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1','');
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:order,roles:seller?['STORE_OWNER']:['CUSTOMER'],role_permissions:[],token_version:0,...(seller?{store_membership:{store_id:order,role:'OWNER',status:'ACTIVE',permissions:[]}}:{})}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/me/returns'||path==='/store/returns')return route.fulfill(failList?{status:503,json:{code:'DOWN',message:'Không tải được đổi trả',details:[]}}:{json:{items:[row],total:1,page:1,size:20}});
    if(path==='/me/returns/'+id+'/confirm'||path==='/store/returns/'+id){
      writes.push(req.postDataJSON());
      if(conflict&&!conflicted){conflicted=true;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Yêu cầu đã thay đổi',details:[]}});}
      row={...row,...req.postDataJSON(),status:path.endsWith('/confirm')?'COMPLETED':req.postDataJSON().status,version:row.version+1};
      return route.fulfill({status:path.endsWith('/confirm')?201:200,json:row});
    }
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình',details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
  await page.goto(seller?(sellerDetail?`/seller/returns?return_id=${id}&order_id=${order}`:'/seller/returns'):'/customer/returns');return writes;
}
test('Customer confirms receipt through the API using the current version',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const writes=await setup(page,{initial:{...request,status:'EXCHANGE_SENT',version:3}});
  const table=page.getByRole('table',{name:'Danh sách yêu cầu đổi trả'});
  await expect(table.getByRole('row').filter({hasText:'Đã gửi hàng đổi'})).toHaveCount(1);
  expect(await table.evaluate(node=>node.scrollWidth<=node.parentElement!.clientWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Đã nhận hàng'})).toHaveCount(0);
  await table.getByRole('link',{name:/Xem chi tiết/}).click();
  await page.reload();
  await page.getByRole('button',{name:'Đã nhận hàng',exact:true}).click();await expect(page.getByText('Đã hoàn tất',{exact:true})).toBeVisible();expect(writes).toEqual([{expected_version:3}]);
  await page.getByRole('link',{name:/Quay lại danh sách đổi trả/}).click();
  await expect(table.getByText('Đã hoàn tất',{exact:true})).toBeVisible();
});

test('Customer can confirm a GHN exchange only after delivery of its own parcel',async({page})=>{
  const writes=await setup(page,{initial:{...request,shipping_mode:'GHN',status:'EXCHANGE_SENT',version:3} as typeof request});
  const shipment={id,order_id:order,store_id:order,return_request_id:id,leg:'EXCHANGE_OUTBOUND',provider:'GHN',tracking_code:'GHN-EXCHANGE-01',created_at:'2026-11-04T00:00:00Z',version:1,events:[]};
  let status='OUT_FOR_DELIVERY';
  await page.route('**/api/v1/me/orders/'+order+'/shipping',route=>route.fulfill({json:{mode:'GHN',items:[{...shipment,status}]}}));
  await page.getByRole('link',{name:/Xem chi tiết/}).click();
  await expect(page.getByText('GHN-EXCHANGE-01',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Đã nhận hàng'})).toHaveCount(0);
  status='DELIVERED';
  await page.reload();
  await page.getByRole('button',{name:'Đã nhận hàng'}).click();
  expect(writes).toEqual([{expected_version:3}]);
});

test('Customer can request another collection after a failed reverse parcel has returned to them',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await setup(page,{initial:{...request,shipping_mode:'PLATFORM',status:'APPROVED',version:1} as typeof request});
  let row={...request,shipping_mode:'PLATFORM',status:'APPROVED',version:1};
  const oldParcel={id,order_id:order,store_id:order,return_request_id:id,leg:'CUSTOMER_RETURN',provider:'PLATFORM',tracking_code:'DLV-OLD-RETURN',status:'RETURNED',created_at:'2026-11-04T00:00:00Z',version:8,events:[]};
  const parcels:any[]=[oldParcel],writes:any[]=[];
  await page.route('**/api/v1/me/returns',route=>route.fulfill({json:{items:[row],total:1,page:1,size:20}}));
  await page.route('**/api/v1/me/orders/'+order+'/shipping',route=>route.fulfill({json:{mode:'PLATFORM',items:parcels}}));
  await page.route('**/api/v1/me/returns/'+id+'/pickup',route=>{
    writes.push(route.request().postDataJSON());row={...row,version:row.version+1};
    const next={...oldParcel,id:'64000000-0000-4000-8000-000000000009',tracking_code:'DLV-NEW-PICKUP',status:'READY_FOR_PICKUP',version:1};
    parcels.push(next);return route.fulfill({json:next});
  });
  await page.getByRole('link',{name:/Xem chi tiết/}).click();
  await expect(page.getByText('Đã trả lại khách',{exact:true})).toBeVisible();
  await expect(page.getByText('Kiện đã trả lại bạn.',{exact:false})).toBeVisible();
  await page.screenshot({path:'test-results/shipping-return-retry-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Đặt lịch',exact:true}).click();
  await expect(page.getByText('DLV-NEW-PICKUP',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Đặt lịch',exact:true})).toHaveCount(0);
  expect(writes).toHaveLength(1);expect(writes[0].expected_version).toBe(1);
});

test('Seller opens the exact request across pages and cannot act on a missing request',async({page})=>{
  const writes=await setup(page,{seller:true});
  const laterId='64000000-0000-4000-8000-000000000003';
  const laterOrder='64000000-0000-4000-8000-000000000004';
  const missingId='64000000-0000-4000-8000-000000000005';
  const later={...request,id:laterId,order_id:laterOrder};
  const filteredReads:string[]=[];
  await page.route('**/api/v1/store/returns?*',route=>{
    const params=new URL(route.request().url()).searchParams;
    const pageNumber=Number(params.get('page'));
    const orderId=params.get('order_id');
    if(orderId)filteredReads.push(orderId);
    return route.fulfill({json:{
      items:orderId ? [later] : pageNumber===1 ? [request] : [later],
      page:pageNumber,size:20,total:orderId ? 1 : 21,
    }});
  });

  await page.goto('/seller/returns/'+laterId);
  await expect(page.getByRole('heading',{name:'Đổi hàng #'+laterId.slice(-8),exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Lưu quyết định',exact:true})).toBeVisible();

  await page.goto('/seller/returns?return_id='+laterId+'&order_id='+laterOrder);
  await expect(page.getByRole('heading',{name:'Đổi hàng #'+laterId.slice(-8),exact:true})).toBeVisible();
  expect(filteredReads).toContain(laterOrder);

  await page.goto('/seller/returns?return_id='+missingId+'&order_id='+laterOrder);
  await expect(page.getByText('Không tìm thấy thông tin yêu cầu đổi trả này.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Lưu quyết định',exact:true})).toHaveCount(0);
  expect(writes).toHaveLength(0);
});

test('Seller resolves a conflict by explicitly reloading even when the returned version is unchanged',async({page})=>{
  const writes=await setup(page,{seller:true,sellerDetail:true,conflict:true});
  await page.getByLabel('Hướng dẫn và địa chỉ gửi trả').fill('Kho nhận trả, 0900000000, địa chỉ kiểm thử');await page.getByLabel('Giải thích quyết định').fill('Chấp thuận, vui lòng gửi hàng về');await page.getByRole('button',{name:'Lưu quyết định',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Yêu cầu đã thay đổi');await expect(page.getByRole('button',{name:'Lưu quyết định',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Đọc lại hồ sơ',exact:true}).click();await expect(page.getByLabel('Giải thích quyết định')).toHaveValue('Chấp thuận, vui lòng gửi hàng về');await page.getByLabel('Giải thích quyết định').fill('Đã kiểm tra lại, chấp thuận');await page.getByRole('button',{name:'Lưu quyết định',exact:true}).click();
  await expect(page.getByText('Đã chấp thuận',{exact:true})).toBeVisible();expect(writes).toHaveLength(2);
});
test('a pending refund cannot be marked completed by the Seller',async({page})=>{
  const writes=await setup(page,{seller:true,sellerDetail:true,initial:{...request,type:'REFUND',status:'RECEIVED'}});
  await expect(page.getByText('Chưa có xác nhận hoàn tiền.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true})).toBeDisabled();expect(writes).toHaveLength(0);
});
test('an unavailable return feed stays an error',async({page})=>{
  await setup(page,{failList:true});await expect(page.getByRole('alert')).toContainText('Không tải được đổi trả');await expect(page.getByText('Chưa có yêu cầu đổi trả ở trang này.')).toHaveCount(0);
});


test('CR-007: pending online refund updates by GET only, polling is bounded and manual refresh recovers after an error',async({page})=>{
 await page.clock.install();const writes=await setup(page,{seller:true,sellerDetail:true,initial:{...request,type:'REFUND',status:'RECEIVED',payment_method:'SANDBOX'}});let status='REQUESTED',gets=0,fail=false;
 await page.route('**/api/v1/store/orders/*/refund-recovery',route=>route.fulfill({json:{order_id:order,order_version:0,refund_id:id,refund_version:0,status,amount_vnd:100000,can_retry_known_failure:false}}));
 await page.route('**/api/v1/store/returns?*',route=>{gets++;return fail?route.fulfill({status:503,json:{code:'OFFLINE',message:'Đọc trạng thái tạm lỗi'}}):route.fulfill({json:{items:[{...request,type:'REFUND',status:'RECEIVED',payment_method:'SANDBOX',refund_status:status}],page:1,size:20,total:1}});});
 await expect(page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true})).toBeDisabled();await page.clock.runFor(3100);await expect.poll(()=>gets).toBeGreaterThan(0);expect(writes).toEqual([]);
 status='SUCCEEDED';await page.clock.runFor(3100);await expect(page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true})).toBeEnabled();await expect(page.getByText('Đã xác nhận hoàn tiền.',{exact:true})).toBeVisible();expect(writes).toEqual([]);
 await page.clock.runFor(61000);const stopped=gets;await page.clock.runFor(10000);expect(gets).toBe(stopped);await expect(page.getByText('Đã dừng tự làm mới sau 60 giây', {exact:false})).toBeVisible();
 fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Đọc trạng thái tạm lỗi');expect(writes).toEqual([]);fail=false;
 await page.getByRole('alert').getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true})).toBeEnabled();expect(writes).toEqual([]);
});
