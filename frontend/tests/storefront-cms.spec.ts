import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'c1055000-0000-4000-8000-'+String(n).padStart(12,'0'),store=id(1),user=id(2),banner=id(3),group=id(4);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64');
const products=Array.from({length:25},(_,n)=>({...fixtures.getProduct.response,id:id(100+n),store_id:store,title:n===0?'Áo khoác cotton sáng màu':n===1?'Quần ống rộng màu be':'Trang phục '+n,status:n===2?'STOPPED':'ACTIVE',moderation_status:'VISIBLE',images:[],variants:[{id:id(200+n),sku:'fixture-'+n,variant_values:{},price_vnd:199000,is_default:true,status:'ACTIVE',available_quantity:10}]}));
async function setup(page:Page,{editor=true,populated=false,staff=false}={}){
 const content=populated?{enabled:true,banner:{asset_id:banner,title:'Mặc thoải mái, chọn theo cách của bạn',subtitle:'Những món đồ dễ phối cho một ngày trọn vẹn.',link_type:'ALL_PRODUCTS'},groups:[{id:group,title:'Những lựa chọn mỗi ngày',kind:'CURATED',product_ids:[products[0].id,products[1].id]}]}:{enabled:false,groups:[]};
 const state={saved:{store_id:store,version:populated?2:0,content,...(populated?{published_at:'2026-11-21T08:00:00Z',published_version:2}:{})} as any,live:populated?structuredClone(content):{enabled:false,groups:[]},saves:[] as any[],publishes:[] as any[],lost:false,skipSave:false,holdUpload:false,held:undefined as Route|undefined,uploadCreates:0,uploads:0,editorReads:0,queries:[] as string[],errors:[] as string[]};
 const publicData=()=>({store_id:store,version:state.saved.published_version??0,content:state.live,products:{curated:products.slice(0,2),newest:[],bestsellers:[],bestsellers_complete:true}});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname.replace('/api/v1',''),method=req.method();
  const context={user_id:user,roles:staff?['CUSTOMER','SELLER']:editor?['CUSTOMER','STORE_OWNER']:['CUSTOMER'],role_permissions:[],token_version:0,...((editor||staff)?{store_membership:{store_id:store,role:staff?'SELLER':'OWNER',status:'ACTIVE',permissions:staff?['inventory.store.read_adjust']:[]}}:{})};
  if(p.startsWith('/auth/'))return route.fulfill({json:{...fixtures.login.response,context}});
  if(p==='/me/context')return route.fulfill({json:context});
  if(p==='/me')return route.fulfill({json:fixtures.getProfile.response});
  if(p==='/store')return route.fulfill({json:{...fixtures.getOwnStore.response,id:store,name:'Mộc Studio'}});
  if(p==='/store/storefront'&&method==='GET'){state.editorReads++;return route.fulfill({json:state.saved});}
  if(p==='/store/storefront'&&method==='PUT'){
   const body=req.postDataJSON();state.saves.push(body);if(!state.skipSave)state.saved={...state.saved,content:body.content,version:body.expected_version+1};
   if(state.lost){state.lost=false;return route.abort('failed');}return route.fulfill({json:state.saved});
  }
  if(p==='/store/storefront/publish'){state.publishes.push(req.postDataJSON());state.live=structuredClone(state.saved.content);state.saved={...state.saved,version:state.saved.version+1,published_version:state.saved.version+1,published_at:'2026-11-21T08:00:00Z'};return route.fulfill({json:state.saved});}
  if(p==='/store/storefront/preview')return route.fulfill({json:{...publicData(),version:state.saved.version,content:state.saved.content}});
  if(p==='/store/storefront/banners'&&method==='POST'){state.uploadCreates++;return route.fulfill({status:201,json:{id:banner,status:'UPLOADING'}});}
  if(p.includes('/storefront/banners/')&&method==='PUT'){state.uploads++;if(state.holdUpload){state.held=route;return;}return route.fulfill({json:{id:banner,status:'READY',width:128,height:96}});}
  if(p.includes('/storefront/banners/'))return route.fulfill({contentType:'image/png',body:png});
  if(p===`/stores/${store}/storefront`)return route.fulfill({json:publicData()});
  if(p===`/stores/${store}`)return route.fulfill({json:{id:store,name:'Mộc Studio',description:'Trang phục cho mỗi ngày',shipping_fee_vnd:15000}});
  if(p==='/store/products'||p===`/stores/${store}/products`||p==='/products'){
   state.queries.push(p+u.search);let list=products;const q=u.searchParams.get('q');if(q)list=list.filter(p=>p.title.toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')));const selected=u.searchParams.get('ids');if(selected)list=list.filter(p=>selected.split(',').includes(p.id));const page=Number(u.searchParams.get('page')??1),size=Number(u.searchParams.get('size')??20);return route.fulfill({json:{items:list.slice((page-1)*size,page*size),total:list.length,page,size}});
  }
  if(p==='/store/vouchers')return route.fulfill({json:{items:[],page:1,size:100,total:0}});
  if(p==='/vouchers/available')return route.fulfill({json:{items:[],page:1,size:20,total:0}});
  return route.fulfill({json:{items:[],page:1,size:20,total:0}});
 });
 page.on('pageerror',e=>state.errors.push(e.message));await page.goto(staff?'/seller/inventory':editor?'/seller/storefront':'/stores/'+store);return state;
}
async function fillGroup(page:Page){await page.getByLabel('Hiển thị nội dung trên trang gian hàng',{exact:true}).check();await page.getByRole('button',{name:'Thêm nhóm',exact:true}).click();await page.getByLabel('Tên nhóm',{exact:true}).fill('Những lựa chọn mỗi ngày');await page.getByRole('button',{name:/Chọn sản phẩm \(0\/12\)/}).click();await page.getByRole('button',{name:/Áo khoác cotton sáng màu Chọn/}).click();await page.getByRole('button',{name:/Quần ống rộng màu be Chọn/}).click();await page.getByRole('button',{name:'Xong',exact:true}).click();}
for(const width of [390,1366])test(`owner saves a draft, previews and publishes at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const state=await setup(page);await expect(page.getByRole('heading',{name:'Trang gian hàng',exact:true})).toBeVisible();await fillGroup(page);await expect(page.getByRole('button',{name:'Xuất bản',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Đã lưu nháp.'})).toBeVisible();expect(state.live.enabled).toBe(false);await page.getByRole('button',{name:'Xem trước bản đã lưu',exact:true}).click();await expect(page.getByLabel('Xem trước trang gian hàng',{exact:true}).getByRole('heading',{name:'Những lựa chọn mỗi ngày',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('storefront-owner-preview.png'),fullPage:true});
 await page.getByRole('button',{name:'Xuất bản',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã xuất bản');expect(state.saves).toHaveLength(1);expect(state.publishes).toEqual([{expected_version:1}]);expect(state.live.enabled).toBe(true);expect(state.errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('lost save acknowledgement reads server state without sending another mutation',async({page})=>{
 const state=await setup(page);await fillGroup(page);state.lost=true;await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await expect(page.getByRole('button',{name:'Đọc trạng thái',exact:true})).toBeVisible();await expect(page.getByLabel('Tên nhóm',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đọc trạng thái',exact:true}).click();await expect(page.getByRole('status')).toContainText('Bản nháp đã được lưu');expect(state.saves).toHaveLength(1);await expect(page.getByRole('button',{name:'Xuất bản',exact:true})).toBeEnabled();expect(state.errors).toEqual([]);
});
test('confirmed missing save retries only the same frozen version and content',async({page})=>{
 const state=await setup(page);await fillGroup(page);state.lost=true;state.skipSave=true;await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByRole('button',{name:'Đọc trạng thái',exact:true}).click();await expect(page.getByRole('button',{name:'Thử lại cùng nội dung',exact:true})).toBeVisible();state.skipSave=false;await page.getByRole('button',{name:'Thử lại cùng nội dung',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu nháp');expect(state.saves).toHaveLength(2);expect(state.saves[0]).toEqual(state.saves[1]);expect(state.errors).toEqual([]);
});
test('upload banner uses raw bytes and a cancelled late upload cannot change the form',async({page})=>{
 const state=await setup(page);state.holdUpload=true;await page.getByLabel('Ảnh banner',{exact:true}).setInputFiles({name:'banner.png',mimeType:'image/png',buffer:png});await expect.poll(()=>!!state.held).toBe(true);await page.getByRole('button',{name:'Hủy tải',exact:true}).click();await expect(page.getByRole('button',{name:'Tải lại banner',exact:true})).toBeVisible();await state.held!.fulfill({json:{id:banner,status:'READY',width:128,height:96}}).catch(()=>{});await expect(page.getByLabel('Tiêu đề banner',{exact:true})).toHaveCount(0);state.holdUpload=false;await page.getByRole('button',{name:'Tải lại banner',exact:true}).click();await expect(page.getByLabel('Tiêu đề banner',{exact:true})).toBeVisible();expect(state.uploadCreates).toBe(1);expect(state.uploads).toBe(2);expect(state.errors).toEqual([]);
});
test('product selection searches server pages, disables stopped products and preserves chosen order',async({page})=>{
 const state=await setup(page);await page.getByRole('button',{name:'Thêm nhóm',exact:true}).click();await page.getByRole('button',{name:/Chọn sản phẩm \(0\/12\)/}).click();await expect(page.getByRole('button',{name:/Trang phục 2 Chưa công khai/})).toBeDisabled();await page.getByLabel('Tìm sản phẩm',{exact:true}).fill('Trang phục 24');await expect(page.getByRole('button',{name:/Trang phục 24 Chọn/})).toBeVisible();expect(state.queries.some(q=>q.includes('q=Trang+ph%E1%BB%A5c+24'))).toBe(true);await page.getByRole('button',{name:/Trang phục 24 Chọn/}).click();await page.getByRole('button',{name:'Xong',exact:true}).click();await expect(page.locator('.storefront-selected-products')).toContainText('Trang phục 24');expect(state.errors).toEqual([]);
});
for(const width of [320,390,1366])test(`published storefront has banner, ordered groups and a working product anchor at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const state=await setup(page,{editor:false,populated:true});await expect(page.getByRole('heading',{name:'Mặc thoải mái, chọn theo cách của bạn',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Những lựa chọn mỗi ngày',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('storefront-public.png'),fullPage:true});await page.getByRole('link',{name:'Xem tất cả →',exact:true}).click();await expect(page).toHaveURL(/#store-products$/);await expect(page.locator('#store-products')).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(state.errors).toEqual([]);
});

test('staff cannot see owner storefront navigation or fetch a draft through a direct URL',async({page})=>{
 const state=await setup(page,{editor:false,staff:true});
 const menu=page.getByRole('complementary',{name:'Menu Store',exact:true});
 await expect(menu.getByRole('link',{name:'Tồn kho',exact:true})).toBeVisible();
 await expect(menu.getByRole('link',{name:'Trang gian hàng',exact:true})).toHaveCount(0);
 await page.goto('/seller/storefront');await expect(page.getByText('Bạn không có quyền mở trang này.',{exact:true})).toBeVisible();
 expect(state.editorReads).toBe(0);expect(state.saves).toHaveLength(0);expect(state.publishes).toHaveLength(0);expect(state.errors).toEqual([]);
});

for(const type of ['PERCENT','FIXED'] as const)test(`campaign maximum matches pricing for ${type}`,async({page})=>{
 await setup(page,{editor:false,populated:true});
 const voucher={id:id(40),code:'MOCTODAY',scope:'STORE',store_id:store,discount_type:type,discount_value:type==='PERCENT'?10:10000,max_discount_vnd:type==='PERCENT'?0:5000,min_goods_vnd:0,starts_at:'2026-01-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',usage_limit:100,per_customer_limit:1,status:'ACTIVE'};
 await page.route(`**/api/v1/stores/${store}/storefront`,route=>route.fulfill({json:{store_id:store,version:2,content:{enabled:true,groups:[],campaign:{title:'Ưu đãi hôm nay',voucher_id:voucher.id,starts_at:voucher.starts_at,ends_at:voucher.ends_at}},products:{curated:[],newest:[],bestsellers:[],bestsellers_complete:true},campaign_voucher:voucher}}));
 await page.reload();const campaign=page.getByRole('region',{name:'Ưu đãi đang diễn ra',exact:true});await expect(campaign).toBeVisible();
 if(type==='PERCENT')await expect(campaign).toContainText(/tối đa 0\s*₫/);
 else{await expect(campaign).toContainText(/Giảm 10\.000\s*₫/);await expect(campaign).not.toContainText('tối đa');}
});
