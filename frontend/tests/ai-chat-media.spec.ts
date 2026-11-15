import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'b1044000-0000-4000-8000-'+String(n).padStart(12,'0'),session=id(2),user=id(1);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64');
const file={name:'ao-do.png',mimeType:'image/png',buffer:png};
async function setup(page:Page){
 const state={enabled:true,guest:false,creates:0,admissions:[] as any[],headers:[] as string[],textCalls:0,turn:undefined as any,status:'SUCCEEDED',lostAdmission:false,omitAdmission:false,wrongPassword:false,holdPoll:false,held:undefined as Route|undefined,gets:0,deletes:0,items:[] as any[],assets:new Map<string,any>(),errors:[] as string[]};
 const paged=(items:any[])=>({items,page:1,size:20,total:items.length});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1',''),method=req.method();
  const context={user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0};
  if(path.startsWith('/auth/'))return state.guest?route.fulfill({status:401,json:{code:'UNAUTHENTICATED',message:'Đăng nhập.'}}):route.fulfill({json:{...fixtures.login.response,context}});
  if(path==='/me')return route.fulfill({json:{...fixtures.getProfile.response,user_id:user}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path==='/chat/media-capabilities'){const pending=state.turn&&state.status!=='SUCCEEDED';return route.fulfill({json:{enabled:state.enabled&&!pending,remaining:3,limit:3,provider_label:'OpenAI',retention_days:30,images_per_message:3,image_max_bytes:5242880,video_max_bytes:20971520,video_max_duration_seconds:30,video_max_frames:8,audio_supported:false,demo_password_required:true,consent_version:'chat-media-openai-v1',...(pending?{pending_turn:{session_id:session,client_message_id:state.turn.client_message_id}}:{})}});}
  if(path==='/chat/sessions'&&method==='POST'){state.creates++;return route.fulfill({status:201,json:{id:session,user_id:user,created_at:'2026-11-15T00:00:00Z'}});}
  if(path==='/me/chat/sessions'&&method==='GET')return route.fulfill({json:paged(state.creates||state.turn||state.items.length?[{id:session,user_id:user,title:'Mô tả áo đỏ',created_at:'2026-11-15T00:00:00Z',...(url.searchParams.has('session_id')?{messages:paged(state.items)}:{})}]:[])});
  if(path.startsWith('/me/chat/sessions')&&method==='DELETE'){state.deletes++;state.items=[];state.turn=undefined;state.creates=0;return route.fulfill({json:{deleted_count:1}});}
  if(path.endsWith('/attachments')&&method==='POST'){const body=req.postDataJSON(),asset={id:id(100+state.assets.size),kind:body.kind,status:'UPLOADING',expected_bytes:body.size_bytes};state.assets.set(asset.id,asset);return route.fulfill({status:201,json:asset});}
  const match=/\/attachments\/([^/]+)(\/content)?$/.exec(path);
  if(match){const asset=state.assets.get(match[1]);if(!asset)return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Không tìm thấy tệp.'}});
   if(method==='PUT'){asset.status='PROCESSING';return route.fulfill({json:asset});}
   if(method==='DELETE'){asset.status='DELETED';return route.fulfill({json:asset});}
   if(match[2])return route.fulfill({contentType:'image/png',body:png});
   asset.status='READY';asset.content_type='image/webp';asset.width=96;asset.height=64;asset.stored_bytes=100;return route.fulfill({json:asset});
  }
  if(path.endsWith('/media-messages')&&method==='POST'){
   const body=req.postDataJSON();state.admissions.push(body);state.headers.push(req.headers()['x-try-on-demo-password']??'');
   if(state.wrongPassword){state.wrongPassword=false;return route.fulfill({status:403,json:{code:'DEMO_PASSWORD_INVALID',message:'Mật khẩu demo chưa đúng.'}});}
   if(!state.omitAdmission)state.turn={id:id(500),client_message_id:body.client_message_id,status:'QUEUED',body};
   if(state.lostAdmission){state.lostAdmission=false;return route.abort('failed');}
   return route.fulfill({status:202,json:state.turn});
  }
  if(path.includes('/media-messages/')&&method==='GET'){
   state.gets++;if(state.holdPoll){state.held=route;return;}
   if(!state.turn)return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Không tìm thấy câu hỏi.'}});
   const answer={id:id(600),session_id:session,role:'ASSISTANT',content:'Trong ảnh có áo đỏ.',product_cards:[],fallback:false,mode:'real',media_analysis:[...state.assets.values()][0]?.kind==='VIDEO'?'VIDEO_FRAMES':'IMAGES'};
   if(state.status==='SUCCEEDED'){state.items=[{id:id(599),session_id:session,role:'USER',content:state.turn.body?.content??'Câu hỏi từ tab khác',attachments:[...state.assets.values()]},answer];return route.fulfill({json:{...state.turn,status:'SUCCEEDED',assistant:answer}});}
   return route.fulfill({json:{...state.turn,status:state.status,...(state.status==='UNKNOWN'?{error_code:'CHAT_MEDIA_PROVIDER_UNKNOWN',message:'Chưa xác định kết quả. Chỉ đọc lại câu hỏi này.'}:{})}});
  }
  if(path.includes('/chat/sessions/')&&path.endsWith('/messages')&&method==='POST')state.textCalls++;
  return route.fulfill({json:paged([])});
 });
 page.on('pageerror',error=>state.errors.push(error.message));
 await page.goto('/profile');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();return state;
}
const panel=(page:Page)=>page.getByRole('dialog',{name:'Trung tâm chat',exact:true}).getByRole('tabpanel',{name:'Trợ lý AI',exact:true});
async function select(page:Page){const area=panel(page);await area.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles(file);await expect(area.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toBeVisible();return area;}
async function consent(page:Page){const area=panel(page);await area.getByLabel('Tôi đồng ý gửi ảnh để phân tích.',{exact:true}).check();await area.getByLabel('Mật khẩu demo',{exact:true}).fill('fixture-demo-password');return area;}

for(const width of [390,1366])test(`AI upload needs consent/demo password and renders an actual attachment at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const state=await setup(page),area=await select(page);const send=area.getByRole('button',{name:'Gửi câu hỏi',exact:true});await expect(send).toBeDisabled();await area.getByLabel('Tôi đồng ý gửi ảnh để phân tích.',{exact:true}).check();await expect(send).toBeDisabled();await area.getByLabel('Mật khẩu demo',{exact:true}).fill('fixture-demo-password');await expect(send).toBeEnabled();
 await page.screenshot({path:info.outputPath('ai-media-draft.png'),fullPage:true});await send.click();await expect(area.getByRole('log')).toContainText('Trong ảnh có áo đỏ.');await expect(area.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toBeVisible();expect(state.admissions).toHaveLength(1);expect(state.admissions[0]).toMatchObject({content:'',attachment_ids:[id(100)],consent_version:'chat-media-openai-v1'});expect(state.headers[0]).toBe('fixture-demo-password');expect(state.textCalls).toBe(0);expect(state.errors).toEqual([]);await page.screenshot({path:info.outputPath('ai-media-answer.png'),fullPage:true});
});
test('a lost admission acknowledgement survives reload and only reads the original paid key',async({page})=>{
 const state=await setup(page);state.lostAdmission=true;state.status='PROCESSING';const area=await select(page);await consent(page);await area.getByLabel('Câu hỏi',{exact:true}).fill('Mô tả áo trong ảnh');await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(area.getByRole('button',{name:'Đọc kết quả',exact:true})).toBeVisible();expect(await page.evaluate(()=>Object.values(sessionStorage).join())).not.toContain('fixture-demo-password');
 await page.reload();await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();await expect(panel(page).getByLabel('Câu hỏi',{exact:true})).toHaveValue('Mô tả áo trong ảnh');await expect(panel(page).getByLabel('Câu hỏi',{exact:true})).toBeDisabled();expect(state.admissions).toHaveLength(1);state.status='SUCCEEDED';await expect(panel(page).getByRole('log')).toContainText('Trong ảnh có áo đỏ.');expect(state.admissions).toHaveLength(1);expect(state.textCalls).toBe(0);expect(state.errors).toEqual([]);
});
test('UNKNOWN reads never submit again and preserve the frozen question across minimize/reopen',async({page})=>{
 const state=await setup(page);state.status='UNKNOWN';const area=await select(page);await consent(page);await area.getByLabel('Câu hỏi',{exact:true}).fill('Áo có màu gì?');await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(area.getByText('Chưa xác định kết quả. Chỉ đọc lại câu hỏi này.',{exact:true}).first()).toBeVisible();await expect(area.getByLabel('Câu hỏi',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Thu nhỏ chat',exact:true}).click();await page.getByRole('button',{name:'Khôi phục chat',exact:true}).click();await expect(panel(page).getByLabel('Câu hỏi',{exact:true})).toHaveValue('Áo có màu gì?');state.status='SUCCEEDED';await panel(page).getByRole('button',{name:'Đọc kết quả',exact:true}).click();await expect(panel(page).getByRole('log')).toContainText('Trong ảnh có áo đỏ.');expect(state.admissions).toHaveLength(1);expect(state.errors).toEqual([]);
});
test('a confirmed missing admission can resend only the same immutable paid key',async({page})=>{
 const state=await setup(page);state.omitAdmission=true;state.lostAdmission=true;const area=await select(page);await consent(page);await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await area.getByRole('button',{name:'Đọc kết quả',exact:true}).click();await expect(area.getByRole('button',{name:'Thử gửi lại cùng câu hỏi',exact:true})).toBeVisible();state.omitAdmission=false;await area.getByLabel('Mật khẩu demo',{exact:true}).fill('fixture-demo-password');await area.getByRole('button',{name:'Thử gửi lại cùng câu hỏi',exact:true}).click();await expect(area.getByRole('log')).toContainText('Trong ảnh có áo đỏ.');expect(state.admissions).toHaveLength(2);expect(state.admissions[0]).toEqual(state.admissions[1]);expect(state.errors).toEqual([]);
});
test('another tab recovers the server-owned pending key without a new admission',async({page})=>{
 const state=await setup(page);state.status='PROCESSING';state.turn={id:id(500),client_message_id:id(501),status:'PROCESSING'};await page.reload();await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();await expect(panel(page).getByRole('button',{name:'Đọc kết quả',exact:true})).toBeVisible();await expect(panel(page).getByLabel('Câu hỏi',{exact:true})).toBeDisabled();state.status='SUCCEEDED';await expect(panel(page).getByRole('log')).toContainText('Trong ảnh có áo đỏ.');expect(state.admissions).toHaveLength(0);expect(state.errors).toEqual([]);
});
test('wrong demo password fails before admission and is never stored with the pending question',async({page})=>{
 const state=await setup(page);state.wrongPassword=true;const area=await select(page);await consent(page);await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(area.getByRole('alert')).toContainText('Mật khẩu demo chưa đúng.');await expect(area.getByLabel('Tôi đồng ý gửi ảnh để phân tích.',{exact:true})).not.toBeChecked();expect(await page.evaluate(()=>Object.values(sessionStorage).join())).not.toContain('fixture-demo-password');await consent(page);await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(area.getByRole('log')).toContainText('Trong ảnh có áo đỏ.');expect(state.admissions).toHaveLength(2);expect(state.errors).toEqual([]);
});
test('deleting a processing session cancels readback and a late response cannot restore deleted content',async({page})=>{
 const state=await setup(page);state.holdPoll=true;state.status='PROCESSING';const area=await select(page);await consent(page);await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect.poll(()=>Boolean(state.held)).toBe(true);
 page.once('dialog',dialog=>dialog.accept());await area.getByRole('button',{name:'Xóa cuộc trò chuyện hiện tại',exact:true}).click();await expect.poll(()=>state.deletes).toBe(1);await expect(area.getByRole('button',{name:'Đọc kết quả',exact:true})).toHaveCount(0);await expect(area.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toHaveCount(0);
 await state.held!.fulfill({json:{id:id(500),client_message_id:state.admissions[0].client_message_id,status:'SUCCEEDED',assistant:{id:id(600),session_id:session,role:'ASSISTANT',content:'Nội dung đã xóa',product_cards:[]}}}).catch(()=>{});await expect(area.getByRole('log')).not.toContainText('Nội dung đã xóa');expect(state.admissions).toHaveLength(1);expect(state.errors).toEqual([]);
});
test('three photos keep consent, password and the send action reachable on a small phone',async({page},info)=>{
 await page.setViewportSize({width:320,height:740});await setup(page);const area=panel(page);await area.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles([file,{...file,name:'ao-xanh.png'},{...file,name:'quan.png'}]);await expect(area.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toHaveCount(3);await consent(page);
 const send=area.getByRole('button',{name:'Gửi câu hỏi',exact:true});await expect(send).toBeEnabled();await expect(send).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('ai-three-photos-mobile.png'),fullPage:true});
});
test('video consent states frame sampling and the returned answer retains that limitation',async({page})=>{
 const state=await setup(page);const area=panel(page);await area.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles({name:'ao.mp4',mimeType:'video/mp4',buffer:Buffer.from('synthetic-video')});await expect(area.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toBeVisible();await expect(area).toContainText('Video được đọc qua tối đa 8 khung hình, không phân tích âm thanh.');await consent(page);await area.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(area.getByRole('log')).toContainText('Phân tích khung hình lấy mẫu, không có âm thanh.');expect(state.admissions).toHaveLength(1);expect(state.textCalls).toBe(0);expect(state.errors).toEqual([]);
});
