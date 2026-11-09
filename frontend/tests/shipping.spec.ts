import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='64000000-0000-4000-8000-000000000011',store='64000000-0000-4000-8000-000000000012',shipmentId='64000000-0000-4000-8000-000000000013',pickupId='64000000-0000-4000-8000-000000000014';
const location={id:pickupId,store_id:store,name:'Kho Đà Nẵng',shop_id:123,environment:'staging',enabled:true,version:0,address:{recipient_name:'Kho',phone:'0900000000',line1:'123 Test',ward:'Hải Châu',district:'Hải Châu',city:'Đà Nẵng'}};
const shipment={id:shipmentId,order_id:id,store_id:store,leg:'OUTBOUND',provider:'GHN',status:'READY_FOR_PICKUP',tracking_code:'GHN-DEMO-01',version:1,created_at:'2026-11-04T00:00:00Z',environment:'staging',cod_vnd:120000,label_available:true,events:[]};
async function setup(page:Page,role:'STORE_OWNER'|'CUSTOMER'|'ADMIN',initial:Array<typeof shipment & {provider_status?:string}> = [],options:{mode?:string;status?:string;locations?:any[]}={}) {
  let shipments:any[]=initial;
  const order={...fixtures.getStoreOrder.response,id,store_id:store,status:options.status??'PROCESSING',version:0,shipping_mode:options.mode??'GHN',payment_method:'COD',payment_status:'PENDING',items:[],amounts:{goods_vnd:100000,shipping_vnd:20000,store_discount_vnd:0,platform_discount_vnd:0,payable_vnd:120000}};
  const writes:any[]=[],shipmentReads:URLSearchParams[]=[],consoleErrors:string[]=[];page.on('pageerror',e=>consoleErrors.push(e.message));
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1','');
    const json=(value:any)=>route.fulfill({json:value});
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:id,roles:[role],role_permissions:role==='ADMIN'?['platform.admin']:[],token_version:0,...(role==='STORE_OWNER'?{store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}}:{})}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/store/orders'||path==='/admin/orders')return json({items:[order],total:1,page:1,size:20});
    if(path==='/store/orders/'+id||path==='/me/orders/'+id)return json(order);
    if(path==='/store/orders/'+id+'/shipping'&&req.method()==='POST'){
      writes.push(req.postDataJSON());shipments=[{...shipment,provider:order.shipping_mode==='PLATFORM'?'PLATFORM':'GHN',tracking_code:order.shipping_mode==='PLATFORM'?'DLV-DEMO-01':shipment.tracking_code}];order.version++;return json(shipments[0]);
    }
    if(path==='/store/orders/'+id+'/shipping')return json({mode:order.shipping_mode,items:shipments,locations:options.locations??[location],booking_enabled:true});
    if(path==='/me/orders/'+id+'/shipping')return json({mode:'GHN',items:shipments});
    if(path==='/admin/shipping/shipments'||path==='/store/shipping/shipments'){
      const params=new URL(req.url()).searchParams;
      shipmentReads.push(params);
      const size=Number(params.get('size')??20),page=Number(params.get('page')??1);
      const items=shipments.filter(s=>(!params.has('order_id')||s.order_id===params.get('order_id'))&&(!params.has('status')||s.status===params.get('status')));
      return json({items:items.slice((page-1)*size,page*size),page,size,total:items.length});
    }
    if(path.endsWith('/actions')){
      const body=req.postDataJSON();writes.push(body);
      const states:Record<string,string>={PICK_UP:'PICKED_UP',OUT_FOR_DELIVERY:'OUT_FOR_DELIVERY',DELIVER:'DELIVERED'};
      shipments=shipments.map(item=>({...item,version:item.version+1,...(body.courier_name?{courier_name:body.courier_name}:{}),...(states[body.action]?{status:states[body.action]}:{})}));
      return json(shipments[0]);
    }
    if(path.endsWith('/commands')){writes.push(req.postDataJSON());shipments=shipments.map(s=>({...s,pending_command:req.postDataJSON().kind,pending_command_status:'PENDING'}));return json(shipments[0]);}
    if(path==='/admin/shipping/connection')return json({provider:'GHN',environment:'staging',configured:false,booking_enabled:false,cod_verification_enabled:false});
    if(path==='/admin/shipping/locations')return json({items:[]});
    if(path==='/admin/stores')return json({items:[{id:store,name:'Shop Demo'}],total:1,page:1,size:100});
    if(path==='/me/notifications')return json({items:[],page:1,size:20,total:0,unread_count:0});
    if(path.endsWith('/unread-count'))return json({unread_total:0});
    if(path==='/me/cart')return json({items:[]});
    return json({items:[],total:0,page:1,size:20});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('shipping@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Test-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
  return {writes,shipmentReads,consoleErrors};
}

test('shipment lookup searches beyond the first API batch and opens the matching order', async ({page},info) => {
  const delivered = {...shipment,status:'DELIVERED',tracking_code:'GHN-OLDER-71',label_available:false,cod_vnd:0};
  const recent = Array.from({length:100}, (_,index) => ({...shipment,
    id:`65000000-0000-4000-8000-${String(index).padStart(12,'0')}`,
    order_id:`65000000-0000-4000-8000-${String(index + 100).padStart(12,'0')}`,
    tracking_code:`GHN-RECENT-${index}`,label_available:false,
  }));
  const state = await setup(page,'STORE_OWNER',[...recent,delivered]);
  await page.goto('/seller/shipping');
  const queue=page.getByRole('region',{name:'Danh sách vận đơn'});
  await expect(queue.getByRole('button',{name:'Trang sau'})).toBeEnabled();
  const search=queue.getByRole('searchbox',{name:'Mã đơn hoặc mã vận đơn'});
  await search.fill('ghn-older-71');
  await search.press('Enter');
  await expect(queue.getByText(delivered.tracking_code,{exact:true})).toBeVisible();
  await expect(queue.getByText('Đã giao',{exact:true})).toBeVisible();
  await expect(queue.getByRole('button',{name:'Trang sau'})).toHaveCount(0);
  expect(state.shipmentReads.some(params=>params.get('size')==='100'&&params.get('page')==='2')).toBe(true);
  await queue.getByLabel('Nhóm trạng thái').selectOption('pickup');
  await expect(queue.getByText('Không tìm thấy vận đơn phù hợp.')).toBeVisible();
  await expect(queue.getByText(/0 kết quả/)).toHaveCount(0);
  await queue.getByLabel('Nhóm trạng thái').selectOption('delivered');
  await search.fill('#00000011');
  await search.press('Enter');
  await expect.poll(()=>Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({shipment_status:'delivered',shipment_q:'00000011'});
  const link = queue.getByRole('link',{name:'#00000011',exact:true});
  await expect(link).toBeVisible();
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await queue.getByRole('table').scrollIntoViewIfNeeded();
    await expect(queue.getByRole('cell',{name:'Đã giao',exact:true})).toBeInViewport();
    await queue.screenshot({path:info.outputPath(`shipping-queue-${width}.png`)});
  }
  await link.click();
  await expect(page.getByRole('dialog',{name:'Xử lý đơn Store'})).toBeVisible();
  expect(state.writes).toEqual([]);
});

test('carrier-managed orders with no return case point to shipment lookup', async ({page}) => {
  const state = await setup(page,'STORE_OWNER',[shipment],{mode:'PLATFORM',status:'SHIPPED'});
  await page.goto('/seller/delivery-returns');
  await expect(page.getByText('Chưa có kiện chuyển hoàn',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Xem vận đơn'})).toHaveAttribute('href','/seller/shipping');
  await expect(page.getByRole('button',{name:'Trang sau'})).toHaveCount(0);
  await page.goto('/seller/delivery-returns?order_id='+id);
  await expect(page.getByText('Chưa có kiện chuyển hoàn',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ghi nhận giao thất bại',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Xem vận đơn'}).click();
  await expect(page.getByText(shipment.tracking_code,{exact:true})).toBeVisible();
  expect(state.shipmentReads.some(params=>params.get('order_id')===id)).toBe(true);
  expect(state.writes).toEqual([]);
});

test('admin shipment order link opens the matching admin order details', async ({page}) => {
  await setup(page,'ADMIN',[shipment]);
  await page.goto('/admin?tab=shipping');
  await page.getByRole('link',{name:'#00000011',exact:true}).click();
  await expect(page).toHaveURL(/tab=orders/);
  await expect(page.getByRole('dialog',{name:`Chi tiết đơn ${id}`,exact:true})).toBeVisible();
});
for(const width of [1280,390])test('seller books a parcel and cannot mark delivery manually at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});const state=await setup(page,'STORE_OWNER');
  await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).filter({visible:true}).click();
  await expect(page.getByRole('button',{name:'Bàn giao'})).toHaveCount(0);
  await page.getByLabel('Khối lượng (g)',{exact:true}).fill('600');await page.getByLabel('Dài (cm)',{exact:true}).fill('25');await page.getByLabel('Rộng (cm)',{exact:true}).fill('20');await page.getByLabel('Cao (cm)',{exact:true}).fill('8');
  await page.screenshot({path:'test-results/shipping-booking-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Đặt lịch',exact:true}).click();
  await expect(page.getByText('GHN-DEMO-01',{exact:true})).toBeVisible();expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({weight:600,length:25,width:20,height:8,pickup_location_id:pickupId});
  expect(state.consoleErrors).toEqual([]);
});
test('failed delivery can request redelivery and waits for carrier acknowledgement',async({page})=>{
  const state=await setup(page,'STORE_OWNER',[{...shipment,status:'RETURN_PENDING',provider_status:'waiting_to_return'}] as never[]);
  await page.clock.install();
  await page.goto('/seller/shipping?shipment_status=attention');await page.getByRole('button',{name:'Giao lại'}).click();await expect(page.getByText('Đang gửi yêu cầu tới hãng.')).toBeVisible();await expect(page.getByRole('button',{name:'Giao lại'})).toBeDisabled();expect(state.writes[0].kind).toBe('REDELIVER');
  const reads=state.shipmentReads.length;
  await page.clock.fastForward(21000);
  await expect.poll(()=>state.shipmentReads.length).toBeGreaterThan(reads);
});

for(const width of [1280,390])test('Delivery orders require pickup booking and wait for carrier instead of seller completion at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});const state=await setup(page,'STORE_OWNER',[],{mode:'PLATFORM'});
  await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).filter({visible:true}).click();
  await expect(page.getByRole('heading',{name:'Thông tin kiện hàng',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Delivery ↗',exact:true})).toHaveAttribute('href','/delivery/ops');
  await expect(page.getByRole('button',{name:'Bàn giao'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Hoàn tất đơn'})).toHaveCount(0);
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  const book=page.getByRole('button',{name:'Gọi Delivery',exact:true});
  await expect(book).toBeDisabled();
  const parcel=page.getByRole('radio',{name:width===390?'Hàng to':'Hàng nhỏ',exact:true});
  await expect(parcel).toHaveAccessibleDescription(width===390?'5.000 g · 50 × 35 × 30 cm':'500 g · 20 × 15 × 8 cm');
  await parcel.check();
  if(width===390)await page.getByRole('checkbox',{name:'Dễ vỡ',exact:true}).check();
  await expect(book).toBeEnabled();
  await page.screenshot({path:'test-results/shipping-required-'+width+'.png',fullPage:true});
  await book.click();
  await expect(page.getByText('Chờ Delivery lấy hàng.')).toBeVisible();
  await expect(page.getByText('DLV-DEMO-01',{exact:true})).toBeVisible();expect(state.writes).toHaveLength(1);expect(state.consoleErrors).toEqual([]);
  expect(state.writes[0]).toMatchObject(width===390
    ? {weight:5000,length:50,width:35,height:30,note:'Hàng dễ vỡ'}
    : {weight:500,length:20,width:15,height:8,note:''});
});

test('order actions stay visible while scrolling and the dialog returns keyboard focus',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await setup(page,'STORE_OWNER',[],{mode:'PLATFORM'});
  await page.goto('/seller/orders');
  const table=page.getByRole('region',{name:/Danh sách đơn hàng, cuộn ngang/});
  const opener=table.getByRole('button',{name:'Xem đơn',exact:true});
  const fits=()=>opener.evaluate(button=>{
    const wrapper=button.closest('.order-queue-table')!;
    const rect=button.getBoundingClientRect(),bounds=wrapper.getBoundingClientRect();
    return rect.left>=bounds.left&&rect.right<=Math.min(bounds.right,innerWidth);
  });
  await expect.poll(fits).toBe(true);
  await table.evaluate(element=>{element.scrollLeft=element.scrollWidth;});
  await expect.poll(fits).toBe(true);
  await page.setViewportSize({width:1280,height:720});
  await expect(page.locator('.seller-chat-launcher')).toHaveCount(0);
  await expect(page.getByRole('complementary',{name:'Menu Store'}).getByRole('link',{name:'Tin nhắn khách hàng'})).toBeVisible();
  await opener.focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Xử lý đơn Store'});
  const close=dialog.getByRole('button',{name:'Đóng',exact:true});
  await expect(close).toBeInViewport();
  await dialog.evaluate(element=>{element.scrollTop=element.scrollHeight;});
  await expect(close).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('missing Delivery pickup blocks booking without offering manual shipping',async({page})=>{
  await setup(page,'STORE_OWNER',[],{mode:'PLATFORM',locations:[]});
  await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).filter({visible:true}).click();
  await expect(page.getByText('Chưa thể đặt lịch.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Bàn giao'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Gọi Delivery',exact:true})).toHaveCount(0);
});
test('admin can prepare a warehouse but cannot enable an unconfigured carrier',async({page})=>{
  await setup(page,'ADMIN');await page.goto('/admin?tab=shipping');await page.getByText('Kết nối hãng GHN',{exact:true}).click();await page.getByText('Kho lấy hàng',{exact:true}).click();await page.getByText('Thêm kho',{exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Áp dụng GHN cho đơn mới của cửa hàng'})).toBeDisabled();
  await expect(page.getByText('Có thể lưu kho trước.',{exact:false})).toBeVisible();
  await page.screenshot({path:'test-results/shipping-admin.png',fullPage:true});
});

test('PBL6 opens the separate delivery portal and cannot dispatch locally',async({page})=>{
  await setup(page,'ADMIN',[{...shipment,provider:'PLATFORM',tracking_code:'DLV-TEST',label_available:false}] as never[]);
  await page.goto('/admin?tab=shipping');
  await expect(page.getByRole('link',{name:'Delivery ↗',exact:true})).toHaveAttribute('href','/delivery/ops');
  await expect(page.getByRole('button',{name:'Đã lấy hàng',exact:true})).toHaveCount(0);
});

for(const width of [1280,390])test('Delivery merchant requests stay pending until the independent carrier confirms at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  const state=await setup(page,'STORE_OWNER',[{...shipment,provider:'PLATFORM',status:'DELIVERY_ATTEMPT_FAILED',tracking_code:'DLV-DEMO-01',label_available:false}] as never[]);
  await page.goto('/seller/shipping');
  await expect(page.getByRole('button',{name:'Giao lại',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Chuyển hoàn',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Hủy lịch',exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/shipping-delivery-merchant-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Giao lại',exact:true}).click();
  await expect(page.getByText('Đang gửi yêu cầu tới hãng.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Giao lại',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Chuyển hoàn',exact:true})).toBeDisabled();
  expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({kind:'REDELIVER',expected_version:1});
  expect(state.consoleErrors).toEqual([]);
});

for(const scenario of [
  {status:'READY_FOR_PICKUP',button:'Hủy lịch',kind:'CANCEL'},
  {status:'CREATE_FAILED',button:'Hủy yêu cầu',kind:'CANCEL'},
  {status:'DELIVERY_ATTEMPT_FAILED',button:'Chuyển hoàn',kind:'RETURN'},
])test('Delivery supports merchant '+scenario.status,async({page})=>{
  const state=await setup(page,'STORE_OWNER',[{...shipment,provider:'PLATFORM',tracking_code:scenario.status==='CREATE_FAILED'?undefined:'DLV-DEMO-01',status:scenario.status,label_available:false,...(scenario.status==='CREATE_FAILED'?{last_error:'DELIVERY_CREATE_REJECTED'}:{})}] as never[]);
  await page.goto('/seller/shipping');
  if(scenario.status==='CREATE_FAILED')await expect(page.getByText('Chưa tạo được kiện.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:scenario.button,exact:true}).click();
  expect(state.writes).toHaveLength(1);expect(state.writes[0].kind).toBe(scenario.kind);
});
