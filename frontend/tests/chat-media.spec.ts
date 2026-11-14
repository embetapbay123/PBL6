import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'b1040000-0000-4000-8000-'+String(n).padStart(12,'0'),thread=id(2),user=id(1);
async function setup(page:Page,{enabled=true,side='CUSTOMER'}:{enabled?:boolean;side?:'CUSTOMER'|'STORE'}={}){
 const prefix=side==='CUSTOMER'?'/me':'/store',context={user_id:user,roles:side==='CUSTOMER'?['CUSTOMER']:['STORE_OWNER'],role_permissions:[],token_version:0,...(side==='STORE'?{store_membership:{store_id:id(3),role:'OWNER',status:'ACTIVE',permissions:[]}}:{})};
 const state={creates:[] as any[],uploads:[] as Buffer[],sends:[] as any[],deletes:[] as string[],items:[] as any[],assets:new Map<string,any>(),lostSend:false,failUpload:false,holdUpload:false,held:undefined as Route|undefined,errors:[] as string[],external:[] as string[]};
 const paged=(items:any[])=>({items,page:1,size:20,total:items.length});
 await page.addInitScript(()=>{const original=URL.revokeObjectURL.bind(URL);(window as any).revoked=[];URL.revokeObjectURL=url=>{(window as any).revoked.push(url);original(url);};});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1',''),method=request.method();
  if(path.startsWith('/auth/'))return route.fulfill({json:{...fixtures.login.response,context}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path==='/me')return route.fulfill({json:{...fixtures.getProfile.response,user_id:user}});
  if(path===prefix+'/conversations')return route.fulfill({json:{...paged([{id:thread,store_id:id(3),store_name:'An Nhiên Studio',customer_name:'Khách demo',updated_at:'2026-11-15T00:00:00Z'}]),...(side==='STORE'?{unread_total:0}:{})}});
  if(path.endsWith('/attachments/capabilities'))return route.fulfill({json:{enabled,images_per_message:3,image_max_bytes:5242880,video_max_bytes:20971520,video_max_duration_seconds:30}});
  if(path.endsWith('/attachments')&&method==='POST'){
   const body=request.postDataJSON();state.creates.push(body);let asset=[...state.assets.values()].find(a=>a.uploadKey===body.client_upload_id);
   if(!asset){asset={id:id(100+state.assets.size),kind:body.kind,status:'UPLOADING',expected_bytes:body.size_bytes,uploadKey:body.client_upload_id};state.assets.set(asset.id,asset);}return route.fulfill({status:201,json:asset});
  }
  const match=/\/attachments\/([^/]+)(\/content)?$/.exec(path);
  if(match){const asset=state.assets.get(match[1]);if(!asset)return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Không tìm thấy tệp.'}});
   if(method==='DELETE'){state.deletes.push(asset.id);asset.status='DELETED';return route.fulfill({json:asset});}
   if(method==='PUT'){state.uploads.push(request.postDataBuffer()!);if(state.holdUpload){state.held=route;return;}if(state.failUpload){state.failUpload=false;return route.abort('failed');}asset.status='PROCESSING';return route.fulfill({json:asset});}
   if(match[2])return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64'),contentType:'image/png'});
   if(asset.status==='PROCESSING'){asset.status='READY';asset.content_type=asset.kind==='IMAGE'?'image/webp':'video/mp4';asset.stored_bytes=100;asset.width=96;asset.height=64;}
   return route.fulfill({json:asset});
  }
  if(path===prefix+'/conversations/'+thread+'/messages'){
   if(method==='POST'){
    const body=request.postDataJSON();state.sends.push(body);let message=state.items.find(m=>m.key===body.client_message_id);
    if(!message){message={id:id(500),conversation_id:thread,sender_side:side,content:body.content,created_at:'2026-11-15T00:00:00Z',key:body.client_message_id,attachments:(body.attachment_ids??[]).map((a:string)=>state.assets.get(a))};state.items.unshift(message);}
    if(state.lostSend){state.lostSend=false;return route.abort('failed');}return route.fulfill({status:201,json:message});
   }
   return route.fulfill({json:{conversation_id:thread,conversation:{id:thread,store_name:'An Nhiên Studio',customer_name:'Khách demo'},...paged(state.items)}});
  }
  return route.fulfill({json:paged([])});
 });
 page.on('pageerror',error=>state.errors.push(error.message));page.on('request',request=>{if(request.url().includes('untrusted.example'))state.external.push(request.url());});
 await page.goto((side==='CUSTOMER'?'/customer':'/seller')+'/messages/'+thread);await expect(page.getByLabel('Nội dung tin nhắn',{exact:true})).toBeVisible();return state;
}
const image=(name='ao.png')=>({name,mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64')});
for(const width of [390,1366])test(`upload, media-only send, viewer and cleanup at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const s=await setup(page);await page.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles(image());
 await expect(page.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toBeVisible();expect(s.uploads[0]).toEqual(image().buffer);expect(s.creates[0].sha256).toMatch(/^[a-f0-9]{64}$/);
 await page.screenshot({path:info.outputPath('media-draft.png'),fullPage:true});await page.getByRole('button',{name:'Gửi',exact:true}).click();
 await expect(page.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toBeVisible();expect(s.sends[0]).toMatchObject({content:'',attachment_ids:[id(100)]});
 await page.getByRole('button',{name:'Xem ảnh đính kèm',exact:true}).click();await expect(page.getByRole('dialog',{name:'Ảnh đính kèm',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('media-viewer.png'),fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Ảnh đính kèm',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>(window as any).revoked.length)).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(s.errors).toEqual([]);
});
test('limits reject invalid, oversized or mixed files before admission and disabled capability hides upload',async({page})=>{
 const s=await setup(page);const input=page.getByLabel('Chọn ảnh hoặc video',{exact:true});
 await input.setInputFiles({name:'x.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await expect(page.getByRole('alert')).toContainText('Chọn ảnh JPG');expect(s.creates).toHaveLength(0);
 await input.setInputFiles({...image(),buffer:Buffer.alloc(5242881)});await expect(page.getByRole('alert')).toContainText('Ảnh tối đa 5 MB');expect(s.creates).toHaveLength(0);
 await input.setInputFiles([image(),{name:'v.mp4',mimeType:'video/mp4',buffer:Buffer.from('video')}]);await expect(page.getByRole('alert')).toContainText('Mỗi tin');expect(s.creates).toHaveLength(0);
 await page.unrouteAll({behavior:'wait'});await setup(page,{enabled:false});await expect(page.getByRole('button',{name:'Đính kèm',exact:true})).toHaveCount(0);
});
test('cancel in-flight upload revokes preview and cannot reappear after a late response',async({page})=>{
 const s=await setup(page);s.holdUpload=true;await page.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles(image());await expect.poll(()=>Boolean(s.held)).toBe(true);
 await page.getByRole('button',{name:'Bỏ tệp 1',exact:true}).click();await expect(page.locator('.chat-upload-list')).toHaveCount(0);await expect.poll(()=>s.deletes.length).toBe(1);
 await s.held!.fulfill({json:{...s.assets.get(id(100)),status:'PROCESSING'}}).catch(()=>{});await expect(page.locator('.chat-upload-list')).toHaveCount(0);expect(s.sends).toHaveLength(0);expect(await page.evaluate(()=>(window as any).revoked.length)).toBeGreaterThan(0);expect(s.errors).toEqual([]);
});
test('failed upload retries the same admission and an unknown send freezes the same message with attachments',async({page})=>{
 const s=await setup(page);s.failUpload=true;await page.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles(image());await expect(page.getByRole('button',{name:'Thử tải lại',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Gửi',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Thử tải lại',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toBeVisible();expect(s.creates[0].client_upload_id).toBe(s.creates[1].client_upload_id);
 s.lostSend=true;await page.getByLabel('Nội dung tin nhắn',{exact:true}).fill('Xem áo này');await page.getByRole('button',{name:'Gửi',exact:true}).click();await expect(page.getByText('Chưa rõ kết quả. Thử gửi lại tin này.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Bỏ tệp 1',exact:true})).toBeDisabled();await expect(page.getByLabel('Nội dung tin nhắn',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Thử gửi',exact:true}).click();await expect(page.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toBeVisible();expect(s.sends).toHaveLength(2);expect(s.sends[0]).toEqual(s.sends[1]);expect(s.items).toHaveLength(1);expect(s.errors).toEqual([]);
});
test('Store can send private media and text never embeds arbitrary remote URLs',async({page})=>{
 const s=await setup(page,{side:'STORE'});s.items.push({id:id(601),conversation_id:thread,sender_side:'CUSTOMER',content:'![x](https://untrusted.example/photo.jpg) [video:https://untrusted.example/a.mp4]',created_at:'2026-11-15T00:00:00Z'});
 await page.reload();await expect(page.getByRole('log')).toContainText('https://untrusted.example/photo.jpg');expect(s.external).toEqual([]);
 await page.getByLabel('Chọn ảnh hoặc video',{exact:true}).setInputFiles(image());await expect(page.getByRole('status').filter({hasText:'Sẵn sàng gửi'})).toBeVisible();await page.getByRole('button',{name:'Gửi',exact:true}).click();await expect(page.getByRole('button',{name:'Xem ảnh đính kèm',exact:true})).toBeVisible();expect(s.sends[0].attachment_ids).toEqual([id(100)]);expect(s.errors).toEqual([]);
});
test('video content is fetched only after an explicit download and keeps native playback controls',async({page})=>{
 const s=await setup(page);const asset={id:id(710),kind:'VIDEO',status:'READY',expected_bytes:1024,stored_bytes:1024,content_type:'video/mp4',width:96,height:64,duration_ms:1000};s.assets.set(asset.id,asset);
 s.items.push({id:id(711),conversation_id:thread,sender_side:'STORE',content:'',created_at:'2026-11-15T00:00:00Z',attachments:[asset]});let reads=0;page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/'+asset.id+'/content'))reads++;});
 await page.reload();await expect(page.getByRole('button',{name:/Tải video/})).toBeVisible();expect(reads).toBe(0);await page.getByRole('button',{name:/Tải video/}).click();await expect(page.getByLabel('Video đính kèm',{exact:true})).toHaveAttribute('controls','');expect(reads).toBe(1);expect(s.errors).toEqual([]);
});
