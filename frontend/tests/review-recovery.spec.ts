import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'8b000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{existing=false,lostAck=false,conflict=false,hold=false,notCommitted=false,wrongRead=false,multiItem=false,missingSnapshot=false}={}){
 const product={...f.getProduct.response,id:id(1),store_id:id(2),title:'Áo đã mua để đánh giá',status:'ACTIVE',moderation_status:'VISIBLE',images:[]};
 const order={...f.getOwnOrder.response,id:id(3),status:'COMPLETED',items:[{id:id(4),product_id:product.id,quantity:1,unit_price_vnd:100000,line_total_vnd:100000,product_snapshot:{title:product.title}}]};
 if(multiItem)order.items=[{...order.items[0],product_snapshot:{title:'Áo khi đặt',variant_values:{color:'Đỏ',size:'M'}}},{...order.items[0],id:id(7),quantity:2,product_snapshot:{title:'Áo khi đặt',variant_values:{color:'Xanh',size:'L'}}}] as any;
 if(missingSnapshot)order.items[0].product_snapshot={} as any;
 const initial={id:id(5),order_item_id:id(4),product_id:product.id,product_title:product.title,rating:4,body:'Bản hiện có trước chỉnh sửa',status:'HIDDEN',version:7};
 const state={review:existing?initial:undefined as typeof initial|undefined,writes:[] as {method:string;body:any}[],reads:0,failRead:false,pending:[] as Route[],conflicted:false};
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1','');
  if(path.startsWith('/auth/'))return route.fulfill({json:{...f.login.response,access_token:'fixture-review-recovery',context:{user_id:id(6),roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/products/'+id(1))return route.fulfill({json:product});
  if(path==='/products')return route.fulfill({json:{items:[product],total:1,page:1,size:20}});
  if(path==='/stores/'+id(2))return route.fulfill({json:{id:id(2),name:'Store đã mua',shipping_fee_vnd:20000}});
  if(path==='/products/'+id(1)+'/reviews')return route.fulfill({json:{items:state.review?.status==='VISIBLE'?[state.review]:[],total:state.review?.status==='VISIBLE'?1:0,page:1,size:20}});
  if(path==='/me/orders')return route.fulfill({json:{items:[order],total:1,page:1,size:20}});
  if(path==='/me/reviews'&&request.method()==='GET'){if(new URL(request.url()).searchParams.has('order_item_id'))state.reads++;return state.failRead?route.fulfill({status:503,json:{code:'READ_FAILED',message:'Đọc đối chiếu tạm lỗi'}}):route.fulfill({json:{items:state.review?[wrongRead?{...state.review,order_item_id:id(40)}:state.review]:[],total:state.review?1:0,page:1,size:1}});}
  if((path==='/me/reviews'&&request.method()==='POST')||(path==='/me/reviews/'+id(5)&&request.method()==='PATCH')){
   const body=request.postDataJSON();state.writes.push({method:request.method(),body});
   if(hold){state.pending.push(route);return;}
   if(notCommitted&&state.writes.length===1)return route.fulfill({status:503,json:{code:'NO_ACK',message:'Chưa rõ kết quả ghi đánh giá'}});
   if(conflict&&!state.conflicted){state.conflicted=true;state.review={...initial,version:8,rating:2,body:'Nội dung đã được tab khác sửa'};return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Đánh giá đã thay đổi'}});}
   state.review={...initial,order_item_id:body.order_item_id??initial.order_item_id,body:body.body.trim(),rating:body.rating,version:request.method()==='POST'?0:(state.review?.version??7)+1,status:request.method()==='POST'?'VISIBLE':'HIDDEN'};
   if(lostAck&&state.writes.length===1)return route.fulfill({status:503,json:{code:'ACK_LOST',message:'Chưa rõ kết quả ghi đánh giá'}});
   return route.fulfill({status:request.method()==='POST'?201:200,json:state.review});
  }
  if(path.startsWith('/recommendations/'))return route.fulfill({json:{source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]}});
  return route.fulfill({json:{items:[],total:0,page:1,size:20}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 return state;
}

test('an uncertain inline create freezes its body until an owned read confirms it, with no second POST',async({page})=>{
 const s=await model(page,{lostAck:true});await page.goto('/products/'+id(1));await page.getByRole('combobox',{name:'Mục đơn hàng',exact:true}).selectOption(id(4));const input=page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true});await input.fill('  Nội dung đã gửi cần đối chiếu  ');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Chưa rõ kết quả');await expect(input).toBeDisabled();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.locator('#reviews').getByRole('status').filter({hasText:'đối chiếu'})).toContainText('đối chiếu');
 expect(s.writes).toHaveLength(1);expect(s.reads).toBe(1);await expect(page.getByRole('button',{name:'Lưu đánh giá',exact:true})).toBeEnabled();
});

test('failed owned readback preserves the frozen inline attempt and retries only GET',async({page})=>{
 const s=await model(page,{lostAck:true});await page.goto('/products/'+id(1));await page.getByRole('combobox',{name:'Mục đơn hàng',exact:true}).selectOption(id(4));await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Giữ bản nháp tới lúc xác định kết quả');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();s.failRead=true;
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Đọc đối chiếu tạm lỗi');await expect(page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true})).toBeDisabled();expect(s.writes).toHaveLength(1);
 s.failRead=false;await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();expect(s.writes).toHaveLength(1);expect(s.reads).toBe(2);
});

test('a stale owned edit shows the freshly read server content beside the preserved draft before overwrite',async({page})=>{
 const s=await model(page,{existing:true,conflict:true});await page.goto('/customer/reviews');await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Bản nháp của tôi vẫn giữ');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
 const current=page.getByRole('region',{name:'Nội dung đã lưu mới nhất',exact:true});await expect(current).toContainText('Nội dung đã được tab khác sửa');await expect(current).toContainText('2 / 5');await expect(page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true})).toHaveValue('Bản nháp của tôi vẫn giữ');expect(s.writes).toHaveLength(1);
 await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();expect(s.writes[1].body.expected_version).toBe(8);expect(s.review?.status).toBe('HIDDEN');
});

test('an owned edit double activation sends only one PATCH while pending',async({page})=>{
 const s=await model(page,{existing:true,hold:true});await page.goto('/customer/reviews');await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Một lần xác nhận sửa');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect.poll(()=>s.writes.length).toBe(1);expect(s.pending).toHaveLength(1);await s.pending[0].fulfill({json:{...s.review!,body:'Một lần xác nhận sửa',version:8}});
});

test('an unresolved create read as absent retries its exact original item/rating/body only after explicit action',async({page})=>{
 const s=await model(page,{notCommitted:true});await page.goto('/products/'+id(1));await page.getByRole('combobox',{name:'Mục đơn hàng',exact:true}).selectOption(id(4));await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Nội dung gốc của lần gửi');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true})).toBeDisabled();expect(s.writes).toHaveLength(1);
 await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.locator('#reviews').getByRole('status').filter({hasText:'Đã lưu'})).toContainText('Đã lưu');expect(s.writes).toHaveLength(2);expect(s.writes[1]).toEqual(s.writes[0]);
});

test('an owned update acknowledged only by readback compares normalized text without a second PATCH',async({page})=>{
 const s=await model(page,{existing:true,lostAck:true});await page.goto('/customer/reviews');await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('  Nội dung có khoảng trắng ngoài  ');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.getByRole('form',{name:'Sửa đánh giá sở hữu',exact:true})).toHaveCount(0);await expect(page.getByText('Nội dung có khoảng trắng ngoài',{exact:true})).toBeVisible();expect(s.writes).toHaveLength(1);expect(s.review?.status).toBe('HIDDEN');
});

test('readback for another purchased item stays blocked and cannot supply a write version',async({page})=>{
 const s=await model(page,{lostAck:true,wrongRead:true});await page.goto('/products/'+id(1));await page.getByRole('combobox',{name:'Mục đơn hàng',exact:true}).selectOption(id(4));await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Giữ đúng mục đã mua');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('không khớp đánh giá');await expect(page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true})).toBeDisabled();expect(s.writes).toHaveLength(1);
});

test('two purchased variants are selected by original color size and quantity rather than opaque item IDs',async({page})=>{
 const s=await model(page,{multiItem:true});await page.goto('/products/'+id(1));const select=page.getByRole('combobox',{name:'Mục đơn hàng',exact:true});
 await expect(select.getByRole('option',{name:/Áo khi đặt.*Đỏ \/ M.*SL 1/})).toHaveCount(1);const blue=select.getByRole('option',{name:/Áo khi đặt.*Xanh \/ L.*SL 2/});await expect(blue).toHaveCount(1);await select.selectOption({label:(await blue.textContent())!});
 await expect(page.getByRole('status').filter({hasText:'Đang đánh giá:'})).toContainText('Xanh / L');await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Đánh giá đúng phân loại Xanh L đã nhận');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();expect(s.writes[0].body.order_item_id).toBe(id(7));
});

test('a legacy purchased item without snapshot does not borrow the current product title or assume a standard variant',async({page})=>{
 await model(page,{missingSnapshot:true});await page.goto('/products/'+id(1));const select=page.getByRole('combobox',{name:'Mục đơn hàng',exact:true}),option=select.locator('option[value="'+id(4)+'"]');
 await expect(option).toContainText('Chưa có tên món khi đặt');await expect(option).toContainText('Chưa lưu phân loại');await expect(option).not.toContainText('Áo đã mua để đánh giá');
});
