import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const product='42000000-0000-4000-8000-000000000001',session='42000000-0000-4000-8000-000000000002',key='a'.repeat(64);
async function setup(page:Page,{customer=false,failure=false}={}){
 const calls:{path:string;body:any;key?:string}[]=[];
 const auth={...f.login.response,context:{roles:['CUSTOMER'],user_id:'42000000-0000-4000-8000-000000000003',token_version:0}};
 await page.route('**/api/v1/**',route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;calls.push({path:path+url.search,body:req.postData()?req.postDataJSON():undefined,key:req.headers()['x-chat-key']});
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:auth,headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/products')return route.fulfill({json:{items:[],page:1,size:20,total:0}});
  if(path==='/api/v1/recommendations/for-you'){expect(url.search).toBe('');return route.fulfill({json:{source:'BASELINE',product_ids:[product],recently_viewed_product_ids:[]}})}
  if(path==='/api/v1/products/'+product)return route.fulfill({json:{...f.getProduct.response,id:product,title:'Current recommendation',status:'ACTIVE'}});
  if(path.endsWith('/related')){expect(url.searchParams.get('size')).toBe('4');return route.fulfill({json:{items:[{...f.getProduct.response,id:product,title:'Related current product'}],page:1,size:4,total:1}})}
  if(path.endsWith('/reviews')||path==='/api/v1/me/orders')return route.fulfill({json:{items:[],page:1,size:20,total:0}});
  if(path==='/api/v1/chat/sessions')return route.fulfill({status:201,json:{id:session,created_at:new Date().toISOString(),...(customer?{}:{anonymous_key:key})}});
  if(path==='/api/v1/me/chat/sessions')return route.fulfill({json:{items:[{id:session,created_at:new Date().toISOString(),...(url.searchParams.has('session_id')?{messages:{items:[{content:'Owned history message',role:'ASSISTANT'}],total:1,page:1,size:20}}:{})}],page:1,size:20,total:1}});
  if(path==='/api/v1/chat/sessions/'+session+'/messages'){
   expect(req.postDataJSON()).toEqual({content:'Find something useful'});expect(req.headers()['x-chat-key']).toBe(customer?undefined:key);
   return route.fulfill(failure?{status:503,json:{code:'UNAVAILABLE',message:'Provider unavailable',details:[]}}:{json:{session_id:session,content:'Actual server answer',role:'ASSISTANT',fallback:true,fallback_reason:'PROVIDER_NOT_CONFIGURED',product_cards:[{product_id:product,current_price_vnd:123456,status:'ACTIVE'}]}});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}});
 });
 if(customer){await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible()}
 return calls;
}
test('Guest chat is reachable from the application and sends the session capability and actual content',async({page})=>{
 const calls=await setup(page);await page.goto('/');await page.getByRole('button',{name:'Chat hỗ trợ',exact:true}).click();await page.getByLabel('Câu hỏi',{exact:true}).fill('Find something useful');await page.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('Actual server answer');await expect(page.getByRole('status')).toContainText('PROVIDER_NOT_CONFIGURED');await expect(page.getByRole('log')).toContainText('123.456');
 expect(calls.filter(c=>c.path==='/api/v1/chat/sessions')).toHaveLength(1);expect(calls.some(c=>c.path.includes('/me/chat'))).toBe(false);await expect(page.getByText('Cảm ơn bạn. Hệ thống đang xử lý yêu cầu của bạn.')).toHaveCount(0);
});
test('Customer For You, related products and owned chat history use their real operations',async({page})=>{
 await setup(page,{customer:true});await page.goto('/');await expect(page.getByRole('region',{name:'Dành cho bạn'})).toContainText('Current recommendation');await page.getByRole('button',{name:'Chat hỗ trợ',exact:true}).click();await page.getByRole('button',{name:'Mở phiên '+session}).click();await expect(page.getByRole('log')).toContainText('Owned history message');
 await page.goto('/products/'+product);await expect(page.getByRole('region',{name:'Sản phẩm liên quan'})).toContainText('Related current product');
});
test('Provider errors preserve the question and never fabricate an answer',async({page})=>{
 await setup(page,{failure:true});await page.goto('/');await page.getByRole('button',{name:'Chat hỗ trợ',exact:true}).click();await page.getByLabel('Câu hỏi',{exact:true}).fill('Find something useful');await page.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Provider unavailable');await expect(page.getByLabel('Câu hỏi',{exact:true})).toHaveValue('Find something useful');await expect(page.getByRole('log')).toBeEmpty();
});
