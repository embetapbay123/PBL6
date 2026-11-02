import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'86000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,owner=true){
 const s={hold:false,pending:undefined as Route|undefined,lost:false,failReads:false,failAfterAccept:false,holdAccept:false,store:id(2),accepted:false,posts:[] as any[],reads:0,invite:{id:id(1),store_id:id(2),store_name:'Gian hàng đúng',invited_email:'staff@example.test',permissions:['inventory.store.read_adjust'],status:'PENDING',expires_at:new Date(Date.now()+86400000).toISOString()},member:{id:id(3),store_id:id(2),user_id:id(4),email:'staff@example.test',status:'ACTIVE',version:2,permissions:['inventory.store.read_adjust']}};
 await page.route('**/api/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname.replace('/api/v1','');const auth={...f.login.response,context:{user_id:owner?id(9):id(4),roles:owner?['CUSTOMER','STORE_OWNER']:s.accepted?['CUSTOMER','SELLER']:['CUSTOMER'],role_permissions:[],token_version:0,...(owner||s.accepted?{store_membership:{store_id:s.store,role:owner?'OWNER':'SELLER',status:'ACTIVE',permissions:owner?[]:['inventory.store.read_adjust']}}:{})}};
  if(p==='/auth/login'||p==='/auth/refresh')return route.fulfill({json:auth,headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(p==='/me/context')return route.fulfill({json:auth.context});
  if(p==='/store/staff/invitations'&&req.method()==='POST'){s.posts.push(req.postDataJSON());if(s.hold){s.pending=route;return;}return route.fulfill({status:201,json:s.invite});}
  if(p==='/me/invitations/'+id(1)+'/accept'){s.posts.push({accept:id(1)});s.accepted=true;s.invite.status='ACCEPTED';if(s.failAfterAccept)s.failReads=true;if(s.holdAccept){s.pending=route;return;}return s.lost?route.fulfill({status:503,json:{code:'LOST_ACK',message:'Chưa rõ kết quả chấp nhận'}}):route.fulfill({json:s.invite});}
  if(p==='/store/staff/invitations/'+id(1)+'/revoke'){s.posts.push({revoke:id(1)});s.invite.status='EXPIRED';return route.fulfill({status:409,json:{code:'INVITATION_EXPIRED',message:'Lời mời đã hết hạn'}});}
  if(p==='/store/staff')return route.fulfill({json:{items:[s.member],page:1,size:20,total:1}});
  if(p==='/store/staff/invitations'||p==='/me/invitations'){s.reads++;if(s.failReads)return route.fulfill({status:503,json:{code:'READ_FAILED',message:'Không đọc được lời mời'}});return route.fulfill({json:{items:[s.invite],page:1,size:20,total:1}});}
  return route.fulfill({json:{items:[],page:1,size:20,total:0}});
 });await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(owner?'owner@example.test':'staff@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return s;
}
test('invitation identity and permissions cannot change while the submitted request is pending',async({page})=>{
 const s=await model(page);await page.goto('/seller/staff');await page.getByLabel('Email nhân viên',{exact:false}).fill('staff@example.test');s.hold=true;await page.getByRole('button',{name:'Gửi lời mời',exact:true}).click();await expect(page.getByLabel('Email nhân viên',{exact:false})).toBeDisabled();await expect(page.getByRole('group',{name:'Quyền được cấp',exact:true}).getByRole('checkbox').first()).toBeDisabled();await expect.poll(()=>!!s.pending).toBe(true);await s.pending!.fulfill({status:201,json:s.invite});await expect(page.getByRole('status').filter({hasText:'Đã tạo lời mời'})).toBeVisible();expect(s.posts).toHaveLength(1);
});
test('accept lost ACK freezes another POST and reads membership outcome before opening the Store',async({page})=>{
 const s=await model(page,false);s.lost=true;await page.goto('/customer/invitations');await page.getByRole('button',{name:'Chấp nhận lời mời',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa rõ kết quả');await expect(page.getByRole('button',{name:'Chấp nhận lời mời',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đọc lại lời mời',exact:true}).click();await expect(page.getByRole('article')).toContainText('Đã chấp nhận');await expect(page.getByRole('button',{name:'Chấp nhận lời mời',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Cập nhật quyền và vào Store',exact:true})).toBeVisible();expect(s.posts).toEqual([{accept:id(1)}]);
});
test('a failed revoke reads the terminal state rather than leaving an expired invitation actionable',async({page})=>{
 const s=await model(page);await page.goto('/seller/staff');await page.getByRole('button',{name:'Thu hồi',exact:true}).click();await expect(page.getByRole('alert')).toContainText('hết hạn');await expect(page.getByRole('button',{name:'Thu hồi',exact:true})).toHaveCount(0);await expect(page.getByRole('article').filter({hasText:'staff@example.test'}).last()).toContainText('Đã hết hạn');expect(s.posts).toEqual([{revoke:id(1)}]);
});

test('success ACK with failed GET keeps accept disabled until GET recovery, never replays POST',async({page})=>{
 const s=await model(page,false);s.failAfterAccept=true;await page.goto('/customer/invitations');await page.getByRole('button',{name:'Chấp nhận lời mời',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Không đọc được');await expect(page.getByRole('button',{name:'Chấp nhận lời mời',exact:true})).toBeDisabled();s.failReads=false;await page.getByRole('button',{name:'Đọc lại lời mời',exact:true}).click();await expect(page.getByRole('button',{name:'Cập nhật quyền và vào Store',exact:true})).toBeVisible();expect(s.posts).toEqual([{accept:id(1)}]);
});
test('failed Owner readback blocks all writes until a successful GET retry',async({page})=>{
 const s=await model(page);await page.goto('/seller/staff');await expect(page.getByRole('button',{name:'Thu hồi',exact:true})).toBeVisible();s.failReads=true;await page.getByRole('button',{name:'Thu hồi',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Không đọc được'})).toBeVisible();await expect(page.getByLabel('Email nhân viên')).toBeDisabled();await expect(page.getByRole('button',{name:'Thu hồi',exact:true})).toHaveCount(0);s.failReads=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByLabel('Email nhân viên')).toBeEnabled();await expect(page.getByRole('article').last()).toContainText('Đã hết hạn');expect(s.posts).toEqual([{revoke:id(1)}]);
});
test('expiry while the invitation is open removes the acceptance action without a POST',async({page})=>{
 const s=await model(page,false);s.invite.expires_at=new Date(Date.now()+60000).toISOString();await page.clock.install();await page.goto('/customer/invitations');await expect(page.getByRole('button',{name:'Chấp nhận lời mời',exact:true})).toBeEnabled();await page.clock.fastForward(61000);await expect(page.getByRole('article')).toContainText('Đã hết hạn');await expect(page.getByRole('button',{name:'Chấp nhận lời mời',exact:true})).toHaveCount(0);expect(s.posts).toEqual([]);
});
test('a historical accepted invitation never navigates into a different current Store',async({page})=>{
 const s=await model(page,false);s.invite.status='ACCEPTED';s.accepted=true;s.store=id(99);await page.goto('/customer/invitations');await expect(page.getByText('Tài khoản hiện đang tham gia Store khác; lời mời này không thay đổi Store hiện hành.')).toBeVisible();await expect(page.getByRole('button',{name:'Cập nhật quyền và vào Store',exact:true})).toHaveCount(0);expect(s.posts).toEqual([]);
});
test('slow acceptance has one in-flight POST and explicit Store entry refreshes current rights',async({page})=>{
 const s=await model(page,false);s.holdAccept=true;await page.goto('/customer/invitations');const accept=page.getByRole('button',{name:'Chấp nhận lời mời',exact:true});await accept.click();await expect(accept).toBeDisabled();await expect.poll(()=>!!s.pending).toBe(true);await s.pending!.fulfill({json:s.invite});await page.getByRole('button',{name:'Cập nhật quyền và vào Store',exact:true}).click();await expect(page).toHaveURL(/\/seller$/);expect(s.posts).toEqual([{accept:id(1)}]);
});
