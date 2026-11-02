import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'76000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,scope:'CUSTOMER'|'STORE'|'ADMIN',status='APPROVED',extra:Record<string,unknown>={}){
 const row:any={id:id(1),order_id:id(2),type:'EXCHANGE',original_type:'EXCHANGE',reason:'Khách chọn sai size',status,version:2,payment_method:'COD',amount_vnd:220000,created_at:'2026-10-30T00:00:00Z',updated_at:'2026-10-30T00:00:00Z',fault_party:'CUSTOMER',fee_payer:'CUSTOMER',return_instructions:'Gửi về kho kiểm thử, điện thoại 0900000000, cổng B',inventory_status:'NOT_STARTED',exchange_status:'NOT_STARTED',items:[{order_item_id:id(3),product_id:id(4),variant_id:id(5),product_snapshot:{title:'Áo đã mua',variant_values:{size:'M'}},sku_snapshot:'OPAQUE-SKU',quantity:2,unit_price_vnd:100000}],...extra};
 const writes:any[]=[];
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:id(9),roles:scope==='CUSTOMER'?['CUSTOMER']:scope==='ADMIN'?['ADMIN']:['CUSTOMER','STORE_OWNER'],role_permissions:scope==='ADMIN'?['platform.admin']:[],token_version:0,...(scope==='STORE'?{store_membership:{store_id:id(8),role:'OWNER',status:'ACTIVE',permissions:[]}}:{})}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(['/me/returns','/store/returns','/admin/returns'].includes(path))return route.fulfill({json:{items:[row],total:1,page:1,size:20}});
  if(path==='/admin/stores')return route.fulfill({json:{items:[{id:id(8),name:'Store kiểm thử',status:'ACTIVE'}],total:1,page:1,size:100}});
  if(path==='/admin/users')return route.fulfill({json:{items:[{id:id(9),email:'fixture@example.test',status:'ACTIVE',display_name:'Khách kiểm thử'}],total:1,page:1,size:100}});
  if(path==='/products/'+id(4))return route.fulfill({json:{...fixtures.getProduct.response,id:id(4),status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:id(5),status:'ACTIVE',sku:'M',variant_values:{size:'M'},price_vnd:100000},{id:id(6),status:'ACTIVE',sku:'L',variant_values:{size:'L'},price_vnd:100000}]}});
  if(request.method()!=='GET'&&path.includes('/returns/'+id(1))){const body=request.postDataJSON();writes.push({path,body});
   if(path.endsWith('/resolution')){row.version++;if(body.action==='ACCEPT_REFUND'){row.type='REFUND';row.conversion_status='ACCEPTED';}if(body.action==='RESOLVE'){row.fault_party=body.fault_party;row.fee_payer=body.fault_party;}}
   else if(body.status==='RECEIVED'){row.version++;row.status='RECEIVED';row.inventory_status='PENDING';row.inspection=body.inspection;row.inspection_note=body.inspection_note;}
   else if(body.status==='EXCHANGE_SENT'){row.version++;row.exchange_status='PENDING';}
   return route.fulfill({json:row});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();await page.goto(scope==='CUSTOMER'?'/customer/returns':scope==='ADMIN'?'/admin?tab=returns':'/seller/returns');return {row,writes};
}
for(const scope of ['CUSTOMER','STORE','ADMIN'] as const)test('paused exchange writer keeps '+scope+' informed without another handoff',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const {writes}=await model(page,scope,'RECEIVED',{inventory_status:'APPLIED',exchange_status:'PENDING',last_error:'EXCHANGE_DISPATCH_PAUSED'});
 await expect(page.getByText('Việc xác nhận bàn giao hàng đổi đang tạm dừng.',{exact:false})).toBeVisible();
 await expect(page.getByText('Có thể làm mới để đọc kết quả đối chiếu.',{exact:false})).toBeVisible();
 await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();expect(writes).toHaveLength(0);
});

test('inspection starts at zero and records actual condition before waiting for stock acknowledgement',async({page})=>{
 const {writes}=await model(page,'STORE');await expect(page.getByText('Gửi về kho kiểm thử',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Bán lại được',{exact:true})).toHaveValue('0');await page.getByLabel('Thực nhận',{exact:true}).fill('2');await page.getByLabel('Bán lại được',{exact:true}).fill('1');await page.getByLabel('Hỏng / không bán lại',{exact:true}).fill('1');await page.getByLabel('Kết quả kiểm hàng',{exact:true}).fill('Một nguyên, một hỏng, đã kiểm đủ');await page.getByRole('button',{name:'Xác nhận kiểm hàng thực nhận',exact:true}).click();await expect(page.getByText('Chờ đối chiếu biên bản và kho.',{exact:false})).toBeVisible();expect(writes[0].body).toMatchObject({status:'RECEIVED',expected_version:2,inspection:[{order_item_id:id(3),received_quantity:2,resellable_quantity:1,damaged_quantity:1,pending_quantity:0}]});await expect(page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true})).toHaveCount(0);
});
test('Customer explicitly accepts full refund and original exchange history remains',async({page})=>{
 const {writes}=await model(page,'CUSTOMER','RECEIVED',{inventory_status:'APPLIED',conversion_status:'PROPOSED',conversion_note:'Hết size L, xin hoàn đủ tiền'});await expect(page.getByText('Hết size L, xin hoàn đủ tiền',{exact:false})).toBeVisible();await page.getByLabel('Nội dung trao đổi / căn cứ',{exact:true}).fill('Tôi đồng ý hoàn đủ, gồm phí giao ban đầu');await page.getByRole('button',{name:'Đồng ý chuyển sang hoàn đủ tiền',exact:true}).click();await expect(page.getByText('Yêu cầu ban đầu là đổi hàng;',{exact:false})).toBeVisible();expect(writes[0].body).toMatchObject({action:'ACCEPT_REFUND',expected_version:2});expect(writes[0].path).toBe('/me/returns/'+id(1)+'/resolution');
});
test('size selection queues inventory without saying sent before worker confirmation',async({page})=>{
 const {writes}=await model(page,'STORE','RECEIVED',{inventory_status:'APPLIED'});await page.getByLabel(/Áo đã mua — phân loại gửi đổi/).selectOption(id(6));await page.getByLabel('Mã vận đơn / tham chiếu bàn giao hàng đổi',{exact:true}).fill('HANDOFF-TEST');await page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true}).click();await expect(page.getByText('Đang xác nhận lệnh kho bàn giao hàng đổi.',{exact:false})).toBeVisible();await expect(page.getByText('Đã gửi hàng đổi',{exact:true})).toHaveCount(0);expect(writes[0].body).toMatchObject({status:'EXCHANGE_SENT',replacement_reference:'HANDOFF-TEST',replacements:[{order_item_id:id(3),variant_id:id(6)}]});
});

test('same-product return lines expose original size and quantity next to distinct replacement controls',async({page})=>{
 const {writes}=await model(page,'STORE','RECEIVED',{inventory_status:'APPLIED',items:[
  {order_item_id:id(3),product_id:id(4),variant_id:id(5),product_snapshot:{title:'Áo đã mua',variant_values:{size:'M'}},sku_snapshot:'OPAQUE-M',quantity:1,unit_price_vnd:100000},
  {order_item_id:id(10),product_id:id(4),variant_id:id(6),product_snapshot:{title:'Áo đã mua',variant_values:{size:'L'}},sku_snapshot:'OPAQUE-L',quantity:2,unit_price_vnd:100000},
 ]});
 const first=page.getByRole('group',{name:'Đổi mục 1',exact:true}),second=page.getByRole('group',{name:'Đổi mục 2',exact:true});
 await expect(first).toContainText('Phân loại: M');await expect(first).toContainText('Số lượng: 1');
 await expect(second).toContainText('Phân loại: L');await expect(second).toContainText('Số lượng: 2');
 await expect(first.getByRole('combobox',{name:'Áo đã mua — phân loại gửi đổi (mục 1)',exact:true})).toHaveValue('');
 await first.getByRole('combobox').selectOption(id(6));await second.getByRole('combobox').selectOption(id(5));
 await expect(first.getByRole('combobox',{name:'Áo đã mua — phân loại gửi đổi (mục 1)',exact:true})).toHaveValue(id(6));
 for(const width of (process.env.CORE_FIX_SKIP_MOBILE==='1'?[1440,1024,768]:[1440,1024,768,390])){
  await page.setViewportSize({width,height:900});await second.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('exchange-lines-'+width+'.png'),fullPage:true});
 }
 await page.getByLabel('Mã vận đơn / tham chiếu bàn giao hàng đổi',{exact:true}).fill('MANUAL-TWO-LINES');
 await page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true}).click();
 expect(writes[0].body.replacements).toEqual([{order_item_id:id(3),variant_id:id(6)},{order_item_id:id(10),variant_id:id(5)}]);
});

test('a return revision preserves the unsent Owner COD receipt and submits the current request version',async({page})=>{
 const order:any={...fixtures.getOwnOrder.response,id:id(2),status:'COMPLETED',version:4,payment_method:'COD',payment_status:'SUCCEEDED',amounts:{...fixtures.getOwnOrder.response.amounts,payable_vnd:220000}},commands:any[]=[];
 await page.route('**/api/v1/store/orders/'+id(2),route=>route.fulfill({json:order}));
 const {row}=await model(page,'STORE','RECEIVED',{type:'REFUND',original_type:'REFUND',inventory_status:'APPLIED'});
 // Register after the broad route so this form receives its matching order fixture.
 await page.route('**/api/v1/store/orders/'+id(2),route=>route.fulfill({json:order}));await page.reload();
 await page.route('**/api/v1/store/orders/'+id(2)+'/cod-refund',route=>{commands.push(route.request().postDataJSON());order.payment_status='REFUNDED';return route.fulfill({status:201,json:fixtures.confirmCodRefund.response});});
 const form=page.getByRole('heading',{name:'Xác nhận hoàn COD thủ công',exact:true}).locator('..');
 await form.getByLabel('Mã biên nhận',{exact:true}).fill('RETURN-RECEIPT-KEEP');await form.getByLabel('Người nhận tiền hoàn',{exact:true}).fill('Người nhận tiền');await form.getByLabel('Thời điểm hoàn (giờ trên thiết bị)',{exact:true}).fill('2026-11-01T12:01:01');await form.getByRole('checkbox').check();
 row.version++;await page.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();
 await expect(form.getByLabel('Mã biên nhận',{exact:true})).toHaveValue('RETURN-RECEIPT-KEEP');await expect(form.getByRole('checkbox')).toBeChecked();
 await form.getByRole('button',{name:'Xác nhận đã hoàn đủ COD',exact:true}).click();await expect.poll(()=>commands.length).toBe(1);expect(commands[0]).toMatchObject({expected_order_version:4,expected_return_version:3,receipt_reference:'RETURN-RECEIPT-KEEP',recipient_name:'Người nhận tiền'});
});

test('an uncertain COD receipt keeps its original body and operation when the return revision changes',async({page})=>{
 const order:any={...fixtures.getOwnOrder.response,id:id(2),status:'COMPLETED',version:4,payment_method:'COD',payment_status:'SUCCEEDED',amounts:{...fixtures.getOwnOrder.response.amounts,payable_vnd:220000}},commands:any[]=[];
 const {row}=await model(page,'STORE','RECEIVED',{type:'REFUND',original_type:'REFUND',inventory_status:'APPLIED'});
 await page.route('**/api/v1/store/orders/'+id(2),route=>route.fulfill({json:order}));await page.reload();
 await page.route('**/api/v1/store/orders/'+id(2)+'/cod-refund',route=>{
  commands.push(route.request().postDataJSON());if(commands.length===1)return route.fulfill({status:503,json:{code:'ACK_LOST',message:'Biên nhận đã ghi nhưng mất phản hồi'}});
  order.payment_status='REFUNDED';return route.fulfill({status:201,json:fixtures.confirmCodRefund.response});
 });
 const form=page.getByRole('heading',{name:'Xác nhận hoàn COD thủ công',exact:true}).locator('..');
 await form.getByLabel('Mã biên nhận',{exact:true}).fill('COD-UNCERTAIN-KEEP');await form.getByLabel('Người nhận tiền hoàn',{exact:true}).fill('Người nhận đã đối chiếu');await form.getByLabel('Thời điểm hoàn (giờ trên thiết bị)',{exact:true}).fill('2026-11-01T12:01:01');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Xác nhận đã hoàn đủ COD',exact:true}).click();
 await expect(form.getByText('Chưa rõ kết quả.',{exact:false})).toBeVisible();row.version++;await page.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();await expect(form.getByLabel('Mã biên nhận',{exact:true})).toBeDisabled();
 await form.getByRole('button',{name:'Đối chiếu lại xác nhận cũ',exact:true}).click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0]);expect(commands[1].expected_return_version).toBe(2);expect(commands[1].receipt_reference).toBe('COD-UNCERTAIN-KEEP');
});

test('same-title return inspection identifies each original variant next to its own counts',async({page})=>{
 const items=[{order_item_id:id(3),product_id:id(4),variant_id:id(5),product_snapshot:{title:'Áo cùng tên',variant_values:{color:'Đỏ',size:'M'}},sku_snapshot:'OPAQUE-1091',quantity:2},{order_item_id:id(10),product_id:id(4),variant_id:id(6),product_snapshot:{title:'Áo cùng tên',variant_values:{color:'Đỏ',size:'L'}},sku_snapshot:'OPAQUE-1092',quantity:1}];
 await model(page,'CUSTOMER','RECEIVED',{items,inspection:[{order_item_id:id(3),received_quantity:2,resellable_quantity:1,damaged_quantity:1,pending_quantity:0},{order_item_id:id(10),received_quantity:1,resellable_quantity:0,damaged_quantity:1,pending_quantity:0}]});
 const receipt=page.getByRole('list',{name:'Biên bản hàng trả đã ghi nhận',exact:true}),small=receipt.getByRole('listitem').filter({hasText:'Phân loại: Đỏ / M'}),large=receipt.getByRole('listitem').filter({hasText:'Phân loại: Đỏ / L'});
 await expect(small).toContainText('Số lượng: 2');await expect(large).toContainText('Số lượng: 1');await expect(small.getByRole('term').filter({hasText:'Bán lại được'}).locator('..').getByRole('definition')).toHaveText('1');await expect(large.getByRole('term').filter({hasText:'Bán lại được'}).locator('..').getByRole('definition')).toHaveText('0');
});

test('historical inspection keeps variant identity and uses that event counts instead of the latest receipt',async({page})=>{
 const items=[{order_item_id:id(3),product_id:id(4),variant_id:id(5),product_snapshot:{title:'Áo cùng tên',variant_values:{size:'M'}},sku_snapshot:'OPAQUE-1091',quantity:2},{order_item_id:id(10),product_id:id(4),variant_id:id(6),product_snapshot:{title:'Áo cùng tên',variant_values:{size:'L'}},sku_snapshot:'OPAQUE-1092',quantity:1}];
 await model(page,'CUSTOMER','RECEIVED',{items,inspection:items.map(item=>({order_item_id:item.order_item_id,received_quantity:item.quantity,resellable_quantity:item.quantity,damaged_quantity:0,pending_quantity:0}))});
 await page.route('**/api/v1/me/orders/*/after-sale-history*',route=>route.fulfill({json:{size:20,items:[{id:id(50),source:'RETURN_OPERATION',action:'RECEIPT_INSPECTED',actor_kind:'OPERATOR',occurred_at:'2026-11-01T00:00:00Z',recorded_at:'2026-11-01T00:00:00Z',inspection:[{order_item_id:id(3),received_quantity:1,resellable_quantity:0,damaged_quantity:0,pending_quantity:1},{order_item_id:id(10),received_quantity:0,resellable_quantity:0,damaged_quantity:0,pending_quantity:0}]}]}}));
 await page.getByText('Lịch sử đổi trả và hoàn về',{exact:true}).click();const history=page.getByRole('region',{name:'Diễn biến sau bán',exact:true}),receipt=history.getByRole('list',{name:'Kiểm hàng tại bước này',exact:true}),small=receipt.getByRole('listitem').filter({hasText:'Phân loại: M'}),large=receipt.getByRole('listitem').filter({hasText:'Phân loại: L'});
 await expect(small.getByRole('term').filter({hasText:'Thực nhận'}).locator('..').getByRole('definition')).toHaveText('1');await expect(small.getByRole('term').filter({hasText:'Chờ kiểm / xử lý'}).locator('..').getByRole('definition')).toHaveText('1');await expect(large.getByRole('term').filter({hasText:'Thực nhận'}).locator('..').getByRole('definition')).toHaveText('0');
});
test('Admin resolves fees explicitly and cannot bypass inventory with a sent status',async({page})=>{
 const {writes}=await model(page,'ADMIN','RECEIVED',{inventory_status:'APPLIED',fault_party:'DISPUTED',fee_payer:undefined,admin_context:{store_id:id(8),customer_user_id:id(9),order_created_at:'2026-10-30T00:00:00Z',order_status:'COMPLETED',payment_status:'SUCCEEDED',collected_vnd:220000,refunded_vnd:0}});await expect(page.getByText('Store kiểm thử',{exact:true})).toBeVisible();await page.getByLabel('Nội dung trao đổi / căn cứ',{exact:true}).fill('Đã kiểm tra bằng chứng Store gửi sai');await page.getByRole('combobox',{name:'Kết luận bên chịu phí',exact:true}).selectOption('STORE');await page.getByRole('button',{name:'Lưu kết luận tranh chấp',exact:true}).click();expect(writes[0].body).toMatchObject({action:'RESOLVE',fault_party:'STORE'});await expect(page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true})).toHaveCount(0);
});
test('inspection stays readable at four widths',async({page})=>{
 await model(page,'STORE');for(const width of (process.env.CORE_FIX_SKIP_MOBILE==='1'?[1440,1024,768]:[1440,1024,768,390])){await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath('after-sale-'+width+'.png'),fullPage:true});}
});


test('a zero-due return explains no refund and keeps the stock-ready completion path',async({page})=>{
 const {writes}=await model(page,'STORE','RECEIVED',{type:'REFUND',original_type:'REFUND',amount_vnd:0,inventory_status:'APPLIED'});
 await expect(page.getByText('Đơn 0đ không có khoản đã thu cần hoàn.',{exact:false})).toBeVisible();await expect(page.getByRole('heading',{name:'Xác nhận hoàn COD thủ công',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Hoàn tất yêu cầu',exact:true}).click();expect(writes[0].body.status).toBe('COMPLETED');
});


test('after-sale history loads on intent, preserves chronology, safe actor label and old inspection at four widths',async({page})=>{
 await model(page,'STORE','RECEIVED',{inventory_status:'APPLIED'});const reads:string[]=[];
 await page.route('**/api/v1/store/audit/actors',route=>route.fulfill({json:{users:[{id:id(9),label:'Nhân viên kiểm kho'}]}}));
 await page.route('**/api/v1/store/orders/*/after-sale-history*',route=>{reads.push(route.request().url());return route.fulfill({json:{size:20,items:[{id:id(20),source:'MONEY',action:'REFUND_CONFIRMED',occurred_at:'2026-11-01T00:00:00.000000Z',recorded_at:'2026-11-01T00:10:00.000000Z',actor_kind:'OPERATOR',actor_user_id:id(9),amount_vnd:220000,time_source:'OWNER_ATTESTED'},{id:id(21),source:'RETURN_OPERATION',action:'RECEIPT_INSPECTED',occurred_at:'2026-10-31T23:00:00.000000Z',recorded_at:'2026-10-31T23:00:00.000000Z',actor_kind:'OPERATOR',inspection:[{order_item_id:id(3),received_quantity:2,resellable_quantity:1,damaged_quantity:1,pending_quantity:0}],note:'Đã kiểm: một tốt, một hỏng'}]}});});
 expect(reads).toHaveLength(0);const summary=page.getByText('Lịch sử đổi trả và hoàn về',{exact:true});await summary.focus();await page.keyboard.press('Enter');const history=page.getByRole('region',{name:'Diễn biến sau bán'});
 await expect(history.getByText('Đã xác nhận hoàn tiền',{exact:true})).toBeVisible();await expect(history.getByText('Nhân viên kiểm kho',{exact:false})).toBeVisible();const receipt=history.getByRole('list',{name:'Kiểm hàng tại bước này',exact:true});await expect(receipt).toContainText('Áo đã mua');await expect(receipt).toContainText('Phân loại: M');for(const [label,value] of [['Thực nhận','2'],['Bán lại được','1'],['Hỏng / không bán lại','1'],['Chờ kiểm / xử lý','0']])await expect(receipt.getByRole('term').filter({hasText:label}).locator('..').getByRole('definition')).toHaveText(value);await expect(history.getByText('Hệ thống ghi nhận:',{exact:false})).toBeVisible();expect(await history.locator('time').first().textContent()).toContain('07:00:00');expect(reads.length).toBeGreaterThanOrEqual(1);
 for(const width of (process.env.CORE_FIX_SKIP_MOBILE==='1'?[1440,1024,768]:[1440,1024,768,390])){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await history.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('after-sale-history-'+width+'.png'),fullPage:true});}
});

test('history cursor retry is read-only and failed older-page GET does not skip that page',async({page})=>{
 await model(page,'CUSTOMER');let older=0;const cursors:(string|null)[]=[],writes:string[]=[];
 await page.route('**/api/v1/me/orders/*/after-sale-history*',route=>{const req=route.request(),cursor=new URL(req.url()).searchParams.get('cursor');cursors.push(cursor);if(req.method()!=='GET')writes.push(req.method());if(cursor&&++older===1)return route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Chưa đọc được trang cũ'}});return route.fulfill({json:{size:20,items:[{id:cursor?id(31):id(30),source:'REFUND_ACTIVITY',action:cursor?'REFUND_REQUESTED':'REFUND_RESULT',to_status:'UNKNOWN',actor_kind:'SYSTEM',occurred_at:'2026-11-01T00:00:00.000000Z',recorded_at:'2026-11-01T00:00:00.000000Z'}],...(cursor?{}:{next_cursor:'opaque-history-cursor'})}});});
 await page.getByText('Lịch sử đổi trả và hoàn về',{exact:true}).click();const history=page.getByRole('region',{name:'Diễn biến sau bán'});await expect(history.getByText('Chưa rõ kết quả hoàn tiền — cần đối soát',{exact:true})).toBeVisible();await history.getByRole('button',{name:'Xem diễn biến cũ hơn',exact:true}).click();await expect(history.getByText('Chưa đọc được trang cũ',{exact:false})).toBeVisible();await history.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(history.getByText('Đã tạo yêu cầu hoàn tiền — chưa phải đã hoàn',{exact:true})).toBeVisible();expect(cursors.filter(Boolean)).toEqual(['opaque-history-cursor','opaque-history-cursor']);expect(writes).toEqual([]);
});

test('history access loss hides cached rows and actor lookup is not requested for Customer',async({page})=>{
 await model(page,'CUSTOMER');let forbidden=false,lookups=0;
 await page.route('**/api/v1/me/context',route=>route.fulfill({json:{user_id:id(9),roles:['CUSTOMER'],role_permissions:[],token_version:0}}));
 await page.route('**/api/v1/store/audit/actors',route=>{lookups++;return route.fulfill({status:403,json:{code:'FORBIDDEN',message:'Không có quyền'}});});
 await page.route('**/api/v1/me/orders/*/after-sale-history*',route=>forbidden?route.fulfill({status:403,json:{code:'FORBIDDEN',message:'Quyền xem hồ sơ đã thay đổi'}}):route.fulfill({json:{size:20,items:[{id:id(40),source:'RETURN_OPERATION',action:'PROPOSE_REFUND',note:'Thông tin lịch sử chỉ đọc khi còn quyền',actor_kind:'OPERATOR',occurred_at:'2026-11-01T00:00:00.000000Z',recorded_at:'2026-11-01T00:00:00.000000Z'}]}}));
 await page.getByText('Lịch sử đổi trả và hoàn về',{exact:true}).click();const history=page.getByRole('region',{name:'Diễn biến sau bán'});await expect(history.getByText('Thông tin lịch sử chỉ đọc khi còn quyền',{exact:true})).toBeVisible();forbidden=true;await history.getByRole('button',{name:'Làm mới lịch sử',exact:true}).click();await expect(page.getByText('Quyền xem hồ sơ đã thay đổi',{exact:false})).toBeVisible();await expect(page.getByText('Thông tin lịch sử chỉ đọc khi còn quyền',{exact:true})).toHaveCount(0);expect(lookups).toBe(0);
});


test('exchange requires explicit eligible selection and unavailable metadata cannot submit a handoff',async({page})=>{
 const {writes}=await model(page,'STORE','RECEIVED',{inventory_status:'APPLIED'});let failing=true;
 await page.route('**/api/v1/products/'+id(4),route=>failing?route.fulfill({status:503,json:{code:'DOWN',message:'Chưa đọc được hàng đổi'}}):route.fulfill({json:{...fixtures.getProduct.response,id:id(4),status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:id(5),status:'ACTIVE',sku:'M',variant_values:{size:'M'},price_vnd:100000},{id:id(6),status:'ACTIVE',sku:'L',variant_values:{size:'L'},price_vnd:120000},{id:id(7),status:'STOPPED',sku:'XL',variant_values:{size:'XL'},price_vnd:100000}]}}));
 await page.reload();await expect(page.getByRole('alert')).toContainText('Chưa đọc được hàng đổi');const send=page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true});await expect(send).toBeDisabled();failing=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();const select=page.getByLabel(/Áo đã mua — phân loại gửi đổi/);await expect(select).toHaveValue('');await expect(select.locator('option[value="'+id(6)+'"]')).toHaveAttribute('disabled','');await expect(select.locator('option[value="'+id(7)+'"]')).toHaveAttribute('disabled','');await expect(send).toBeDisabled();await select.selectOption(id(5));await page.getByLabel('Mã vận đơn / tham chiếu bàn giao hàng đổi',{exact:true}).fill('HANDOFF-EXPLICIT');await expect(send).toBeEnabled();await send.click();expect(writes[0].body.replacements[0].variant_id).toBe(id(5));
});

test('Customer sees replacement snapshot separately from original; legacy handoff admits missing identity',async({page})=>{
 const {row}=await model(page,'CUSTOMER','EXCHANGE_SENT',{exchange_status:'APPLIED',exchange_dispatch:{dispatched_at:'2026-11-01T00:00:00Z',items:[{original_variant_id:id(5),variant_id:id(6),product_id:id(4),store_id:id(8),sku_snapshot:'SENT-L',unit_price_vnd:100000,quantity:2,product_snapshot:{title:'Áo đúng lúc gửi đổi',variant_values:{size:'L'}}}]}});await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toContainText('Phân loại: L');await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toContainText('SKU lúc xuất hàng đổi: SENT-L');await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).not.toContainText('SKU khi đặt:');await expect(page.getByText('Hàng đã mua ban đầu',{exact:true})).toBeVisible();delete row.exchange_dispatch;await page.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();await expect(page.getByText('Lần đổi cũ chưa lưu tên và phân loại hàng đã bàn giao.',{exact:false})).toBeVisible();await expect(page.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toHaveCount(0);
});
