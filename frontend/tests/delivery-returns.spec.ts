import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'6a000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{lostSettle=false,failReadback=false}={}) {
 const item={order_item_id:id(4),product_id:id(5),variant_id:id(6),product_snapshot:{title:'Áo hoàn kiểm thử tên dài để nhận diện',variant_values:{color:'Đỏ',size:'M'}},sku_snapshot:'OPAQUE-RETURN-300',quantity:3};
 const order={id:id(1),store_id:id(2),purchase_group_id:id(3),status:'SHIPPED',version:0,payment_method:'COD',payment_status:'PENDING',amounts:{goods_vnd:300000,shipping_vnd:20000,store_discount_vnd:0,platform_discount_vnd:0,payable_vnd:320000},address_snapshot:{recipient_name:'Người nhận kiểm thử',phone:'0900000000',line1:'Địa chỉ dài, tầng 15 phía sau cổng B',ward:'A',district:'B',city:'Huế'},items:[{...item,id:item.order_item_id}]};
 const s={record:undefined as any,posts:[] as any[],committed:new Map<string,any>(),getBlocked:false,gets:0};
 await page.route('**/api/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1',''),body=req.postData()?req.postDataJSON():undefined;
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:id(7),roles:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:id(2),role:'OWNER',status:'ACTIVE',permissions:[]}}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/store/orders/'+id(1))return route.fulfill({json:order});
  if(path==='/store/delivery-returns'){s.gets++;if(s.getBlocked)return route.fulfill({status:503,json:{code:'READ_ERROR',message:'Không đọc lại được hồ sơ'}});return route.fulfill({json:{items:s.record?[s.record]:[],page:1,size:20,total:s.record?1:0}});}
  if(req.method()==='POST'&&(path.endsWith('/delivery-return')||path.endsWith('/inspection')||path.endsWith('/settle'))){
   s.posts.push({path,body});if(s.committed.has(body.operation_id))return route.fulfill({status:201,json:s.committed.get(body.operation_id)});
   if(path.endsWith('/delivery-return'))s.record={id:id(8),order_id:id(1),store_id:id(2),status:'OPEN',reason:body.reason,version:0,inventory_status:'PENDING',payment_method:'COD',payment_status:'PENDING',amount_vnd:320000,money_settled:false,inspection:[],items:[item],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   if(path.endsWith('/inspection')){s.record={...s.record,status:'RECEIVED',version:s.record.version+1,inspection:body.lines.map((line:any)=>Object.fromEntries(Object.entries(line).sort(([a],[b])=>a.localeCompare(b)))),inspection_note:body.note};if(failReadback)s.getBlocked=true;}
   if(path.endsWith('/settle'))s.record={...s.record,status:'SETTLING',version:s.record.version+1,payment_status:'CANCELLED',money_settled:true};
   s.committed.set(body.operation_id,structuredClone(s.record));if(lostSettle&&path.endsWith('/settle'))return route.fulfill({status:503,json:{code:'UNKNOWN',message:'Chưa rõ kết quả'}});
   return route.fulfill({status:201,json:s.record});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture not configured'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();await page.goto('/seller/delivery-returns?order_id='+id(1));return s;
}
async function open(page:Page){await page.getByLabel('Lý do giao thất bại / từ chối nhận (hiển thị cho khách)',{exact:true}).fill('Khách từ chối nhận; kiện đã đưa về kiểm');await page.getByRole('button',{name:'Ghi nhận giao thất bại',exact:true}).click();await expect(page.getByRole('heading',{name:'Giao thất bại — chờ hàng hoàn về',exact:true})).toBeVisible();}
async function inspect(page:Page){await page.getByLabel('Thực nhận',{exact:true}).fill('3');await page.getByLabel('Đủ điều kiện bán lại',{exact:true}).fill('2');await page.getByLabel('Hỏng / không bán lại',{exact:true}).fill('1');await page.getByLabel('Kết quả kiểm hàng thực tế',{exact:true}).fill('Kiểm đủ ba: hai tốt, một hỏng');await page.getByRole('button',{name:'Lưu biên bản kiểm hàng',exact:true}).click();}
test('inspection starts without assuming sellable stock, supports four widths and separates inventory from money/closure',async({page},info)=>{
 const s=await model(page);await open(page);await expect(page.getByLabel('Đủ điều kiện bán lại',{exact:true})).toHaveValue('0');
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390])){await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));await expect(page.getByLabel('Thực nhận',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('inspection-'+width+'.png'),fullPage:true});}
 await inspect(page);const settle=page.getByRole('button',{name:'Bắt đầu đối chiếu tồn và tiền',exact:true});await expect(settle).toBeEnabled();await settle.click();await expect(page.getByRole('heading',{name:'Đang đối chiếu tồn và tiền',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Đã đóng hoàn về',exact:true})).toHaveCount(0);
 expect(s.posts.map(x=>x.body.lines).filter(Boolean)).toEqual([[{order_item_id:id(4),received_quantity:3,resellable_quantity:2,damaged_quantity:1,pending_quantity:0}]]);
 s.record={...s.record,status:'CLOSED',inventory_status:'APPLIED',version:4,closed_at:new Date().toISOString()};await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đóng hoàn về',exact:true})).toBeVisible();expect(s.posts).toHaveLength(3);
});
test('unknown settlement freezes inspection and retries the exact same operation',async({page})=>{
 const s=await model(page,{lostSettle:true});await open(page);await inspect(page);await page.getByRole('button',{name:'Bắt đầu đối chiếu tồn và tiền',exact:true}).click();await expect(page.getByText('Chưa rõ kết quả. Thử lại dùng đúng nội dung và operation ID cũ; không ghi thêm giao dịch.',{exact:true})).toBeVisible();await expect(page.getByLabel('Thực nhận',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Thử lại đối chiếu cũ',exact:true}).click();await expect(page.getByRole('heading',{name:'Đang đối chiếu tồn và tiền',exact:true})).toBeVisible();const commands=s.posts.filter(x=>x.path.endsWith('/settle'));expect(commands).toHaveLength(2);expect(commands[0]).toEqual(commands[1]);
});
test('read failure after acknowledged inspection asks only for GET recovery and never resubmits the mutation',async({page})=>{
 const s=await model(page,{failReadback:true});await open(page);await inspect(page);await expect(page.getByRole('alert')).toContainText('Không đọc lại được hồ sơ');const writes=s.posts.length;s.getBlocked=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('button',{name:'Bắt đầu đối chiếu tồn và tiền',exact:true})).toBeEnabled();expect(s.posts).toHaveLength(writes);
});

test('saved inspection keeps its field label separate from the note when reopened',async({page})=>{
 await model(page);await open(page);const note='Đã nhận một món, còn chờ hai món';
 await page.getByLabel('Thực nhận',{exact:true}).fill('1');await page.getByLabel('Chờ kiểm / xử lý',{exact:true}).fill('1');
 await page.getByLabel('Kết quả kiểm hàng thực tế',{exact:true}).fill(note);await page.getByRole('button',{name:'Lưu biên bản kiểm hàng',exact:true}).click();
 await page.reload();await expect(page.getByRole('textbox',{name:'Kết quả kiểm hàng thực tế',exact:true})).toHaveValue(note);
 await expect(page.getByRole('button',{name:'Bắt đầu đối chiếu tồn và tiền',exact:true})).toBeDisabled();
});

test('inventory acknowledgement preserves the Owner COD receipt draft during delivery-return polling',async({page})=>{
 const s=await model(page);await open(page);
 await page.route('**/api/v1/store/orders/'+id(1),route=>route.fulfill({json:{...fixtures.getOwnOrder.response,id:id(1),version:3,payment_method:'COD',payment_status:'SUCCEEDED',amounts:{...fixtures.getOwnOrder.response.amounts,payable_vnd:320000}}}));
 s.record={...s.record,status:'SETTLING',version:2,payment_status:'SUCCEEDED',inventory_status:'PENDING'};
 await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();const form=page.getByRole('heading',{name:'Xác nhận hoàn COD thủ công',exact:true}).locator('..');
 await form.getByLabel('Mã biên nhận',{exact:true}).fill('MANUAL-RECEIPT-KEEP');await form.getByLabel('Người nhận tiền hoàn',{exact:true}).fill('Người nhận đã đối chiếu');
 s.record={...s.record,version:3,inventory_status:'APPLIED'};await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();
 await expect(page.getByText('Hàng:',{exact:false})).toContainText('Đã đối chiếu');await expect(form.getByLabel('Mã biên nhận',{exact:true})).toHaveValue('MANUAL-RECEIPT-KEEP');await expect(form.getByLabel('Người nhận tiền hoàn',{exact:true})).toHaveValue('Người nhận đã đối chiếu');
 expect(s.posts).toHaveLength(1);
});

test('a delayed refund record is polled read-only for a bounded time instead of leaving the initial not-found screen stuck',async({page})=>{
 await page.clock.install();const s=await model(page);await open(page);let ready=false,reads=0;
 await page.route('**/api/v1/store/orders/'+id(1)+'/refund-recovery',route=>{
  reads++;return ready?route.fulfill({json:{order_id:id(1),order_version:3,refund_id:id(20),refund_version:1,status:'UNKNOWN',amount_vnd:320000,can_retry_known_failure:false,blocked_reason:'RESULT_UNKNOWN'}}):route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Đơn chưa có yêu cầu hoàn online để đối chiếu.'}});
 });
 s.record={...s.record,status:'SETTLING',version:2,payment_method:'SANDBOX',payment_status:'SUCCEEDED',inventory_status:'APPLIED'};await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();
 const panel=page.getByRole('region',{name:'Phục hồi hoàn tiền online',exact:true});await expect(panel).toContainText('Chưa đọc được yêu cầu hoàn online. Chưa có xác nhận đã hoàn tiền.');
 ready=true;await page.clock.fastForward(3100);await expect(panel).toContainText('Hệ thống chỉ tra soát lệnh cũ; không tạo khoản hoàn mới.');expect(reads).toBeGreaterThan(1);
 await page.clock.fastForward(61000);const stopped=reads;await page.clock.fastForward(15000);expect(reads).toBe(stopped);
 await panel.getByRole('button',{name:'Làm mới đối soát hoàn online',exact:true}).click();expect(reads).toBeGreaterThan(stopped);expect(s.posts).toHaveLength(1);
});

test('delivery inspection readback identifies same-title variants without decoding an opaque SKU',async({page})=>{
 const s=await model(page);await open(page);const first=s.record.items[0],second={...first,order_item_id:id(40),variant_id:id(41),sku_snapshot:'OPAQUE-RETURN-301',product_snapshot:{...first.product_snapshot,variant_values:{color:'Đỏ',size:'L'}},quantity:1};
 s.record={...s.record,status:'RECEIVED',version:1,items:[first,second],inspection:[{order_item_id:first.order_item_id,received_quantity:2,resellable_quantity:1,damaged_quantity:1,pending_quantity:0},{order_item_id:second.order_item_id,received_quantity:1,resellable_quantity:0,damaged_quantity:1,pending_quantity:0}]};await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();
 const receipt=page.getByRole('list',{name:'Hàng hoàn về đã ghi nhận',exact:true});await expect(receipt.getByRole('listitem')).toHaveCount(2);
 const small=receipt.getByRole('listitem').filter({hasText:'Phân loại: Đỏ / M'}),large=receipt.getByRole('listitem').filter({hasText:'Phân loại: Đỏ / L'});await expect(small).toContainText(first.product_snapshot.title);await expect(large).toContainText(second.product_snapshot.title);await expect(small.getByRole('term').filter({hasText:'Bán lại được'}).locator('..').getByRole('definition')).toHaveText('1');await expect(large.getByRole('term').filter({hasText:'Bán lại được'}).locator('..').getByRole('definition')).toHaveText('0');
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390])){
  await page.setViewportSize({width,height:900});await small.evaluate(element=>element.scrollIntoView({block:'center'}));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const label of ['Thực nhận','Bán lại được','Hỏng / không bán lại','Chờ kiểm / xử lý'])await expect(small.getByRole('term').filter({hasText:label})).toBeVisible();
  await small.screenshot({path:test.info().outputPath('receipt-identity-'+width+'.png')});
 }
});

test('an inspection line without original metadata stays explicit and never borrows a current catalog identity',async({page})=>{
 const s=await model(page);await open(page);let catalogReads=0;await page.route('**/api/v1/products/*',route=>{catalogReads++;return route.fulfill({json:{title:'Tên hôm nay không phải lịch sử'}});});
 s.record={...s.record,status:'RECEIVED',version:1,items:[],inspection:[{order_item_id:id(99),received_quantity:1,resellable_quantity:0,damaged_quantity:1,pending_quantity:0}]};await page.getByRole('button',{name:'Làm mới hồ sơ',exact:true}).click();
 const receipt=page.getByRole('list',{name:'Hàng hoàn về đã ghi nhận',exact:true});await expect(receipt).toContainText('Chưa đối chiếu được dòng đơn gốc');await expect(receipt).toContainText('không suy thông tin từ sản phẩm hiện tại');await expect(receipt.getByRole('term').filter({hasText:'Hỏng / không bán lại'}).locator('..').getByRole('definition')).toHaveText('1');expect(catalogReads).toBe(0);await expect(receipt).not.toContainText('Tên hôm nay');
});
