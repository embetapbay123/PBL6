import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'79000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{conflict=false,missingVersion=false}={}){
 const apps=Array.from({length:25},(_,n)=>({id:id(n+1),proposed_name:'Gian hàng '+n,contact:'contact-'+n+'@example.test',status:n<20?'APPROVED':'PENDING',version:missingVersion?undefined:0,applicant_user_id:id(n+100),applicant_email:'person-'+n+'@example.test',applicant_display_name:'Người nộp '+n,applicant_status:'ACTIVE'}));
 const reads:any[]=[],writes:any[]=[];
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context:{user_id:id(99),roles:['ADMIN'],role_permissions:['platform.admin'],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/admin/store-applications'){
   const q=url.searchParams.get('q')??'',status=url.searchParams.get('status'),pageNumber=Number(url.searchParams.get('page')??1),size=Number(url.searchParams.get('size')??10);reads.push({q,status,page:pageNumber});
   const all=apps.filter(a=>!q||[a.proposed_name,a.id,a.applicant_email].join(' ').includes(q)),matched=all.filter(a=>!status||a.status===status);const value={items:matched.slice((pageNumber-1)*size,pageNumber*size),total:matched.length,page:pageNumber,size,status_counts:{ALL:all.length,PENDING:all.filter(a=>a.status==='PENDING').length,APPROVED:all.filter(a=>a.status==='APPROVED').length,REJECTED:all.filter(a=>a.status==='REJECTED').length}};
   if(q==='Gian hàng 1')await new Promise(resolve=>setTimeout(resolve,400));return route.fulfill({json:value});
  }
  if(path.startsWith('/admin/store-applications/')&&request.method()==='PATCH'){
   const body=request.postDataJSON(),app=apps.find(a=>path.endsWith(a.id))!;writes.push({id:app.id,body});if(conflict){app.status='REJECTED';app.version=1;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Hồ sơ đã được người khác xử lý'}});}app.status=body.status;app.version=(app.version??0)+1;return route.fulfill({json:app});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();await page.goto('/admin/store-applications');return {apps,reads,writes};
}
test('global Pending count includes applications beyond page two; server filters before pagination',async({page})=>{
 const m=await model(page);await expect(page.locator('tbody')).not.toContainText('Gian hàng 20');await expect(page.getByRole('button',{name:/Chờ duyệt/})).toContainText('5');await page.getByRole('button',{name:/Chờ duyệt/}).click();await expect(page.locator('tbody tr')).toHaveCount(5);await expect(page.locator('tbody')).toContainText('Gian hàng 24');expect(m.reads).toContainEqual({q:'',status:'PENDING',page:1});await expect(page.getByText('Trang 1 · 5 kết quả',{exact:true})).toBeVisible();
});
test('decision dialog identifies the exact applicant and cancellation does not write',async({page})=>{
 const m=await model(page);await page.getByRole('button',{name:/Chờ duyệt/}).click();const row=page.locator('tbody tr').filter({hasText:'Gian hàng 24'});await row.getByRole('button',{name:'Duyệt',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Người nộp 24');await expect(dialog).toContainText('person-24@example.test');await expect(dialog).toContainText(id(124));await expect(dialog).toContainText(id(25));await dialog.getByRole('button',{name:'Quay lại',exact:true}).click();expect(m.writes).toHaveLength(0);
});
test('409 cannot repeat a decision from stale version; explicit readback finds the processed application',async({page})=>{
 const m=await model(page,{conflict:true});await page.getByRole('button',{name:/Chờ duyệt/}).click();await page.locator('tbody tr').filter({hasText:'Gian hàng 24'}).getByRole('button',{name:'Duyệt',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Xác nhận duyệt',exact:true}).click();await expect(dialog.getByRole('button',{name:'Xác nhận duyệt',exact:true})).toBeDisabled();await expect(dialog.getByRole('alert')).toContainText('Hồ sơ đã được người khác xử lý');await dialog.getByRole('button',{name:'Đọc lại hồ sơ này',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Hồ sơ đã được xử lý: Từ chối');expect(m.writes).toEqual([{id:id(25),body:{status:'APPROVED',expected_version:0}}]);
});
test('missing version never manufactures expected_version0 for an approval',async({page})=>{
 const m=await model(page,{missingVersion:true});await page.getByRole('button',{name:/Chờ duyệt/}).click();await page.locator('tbody tr').last().getByRole('button',{name:'Duyệt',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Xác nhận duyệt',exact:true})).toBeDisabled();expect(m.writes).toHaveLength(0);
});
test('late old query cannot overwrite current results, and empty results keep filters and pagination reachable',async({page})=>{
 await model(page);const search=page.getByRole('searchbox',{name:'Tìm hồ sơ theo Store, người nộp hoặc mã hồ sơ',exact:true});await search.fill('Gian hàng 1');await search.fill('Gian hàng 24');await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody')).toContainText('Gian hàng 24');await expect(page.getByText('Trang 1 · 1 kết quả',{exact:true})).toBeVisible();await search.fill('Không có');await expect(page.getByText('Không có hồ sơ phù hợp',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Chờ duyệt/})).toBeEnabled();await expect(page.getByText('Trang 1 · 0 kết quả',{exact:true})).toBeVisible();await search.fill('');await page.getByRole('button',{name:/Chờ duyệt/}).click();await expect(page.locator('tbody tr')).toHaveCount(5);
});
