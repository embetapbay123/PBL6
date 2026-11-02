import type {Page,test as BaseTest} from '@playwright/test';

/** Render/transport evidence only. Never capture request bodies, headers or form values. */
export function installRenderDiagnostics(test:typeof BaseTest){
 const events=new WeakMap<Page,{page_errors:string[];failed_modules:{path:string;error:string|null}[];bad_modules:{path:string;status:number}[];crashed:boolean}>();
 const safe=(value:string)=>value.replace(/https?:\/\/[^\s"'<>]+/g,url=>{try{return new URL(url).pathname;}catch{return '[url]';}});
 test.beforeEach(async({page})=>{
  const state={page_errors:[] as string[],failed_modules:[] as {path:string;error:string|null}[],bad_modules:[] as {path:string;status:number}[],crashed:false};events.set(page,state);
  page.on('pageerror',error=>state.page_errors.push(safe(error.message)));
  page.on('crash',()=>{state.crashed=true;});
  page.on('requestfailed',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/src/')||url.pathname.includes('/node_modules/')||request.resourceType()==='document')state.failed_modules.push({path:url.pathname,error:request.failure()?.errorText??null});});
  page.on('response',response=>{const url=new URL(response.url());if(response.status()>=400&&(url.pathname.startsWith('/src/')||url.pathname.includes('/node_modules/')))state.bad_modules.push({path:url.pathname,status:response.status()});});
 });
 test.afterEach(async({page},info)=>{
  if(info.status===info.expectedStatus)return;
  const state=events.get(page),dom=await page.evaluate(()=>({path:location.pathname,ready:document.readyState,root_children:document.getElementById('root')?.childElementCount,root_text_length:document.getElementById('root')?.textContent?.length,body_elements:document.body.childElementCount})).catch(()=>({closed:page.isClosed()}));
  await info.attach('render-diagnostics',{body:JSON.stringify({events:state,dom},null,2),contentType:'application/json'});
 });
}
