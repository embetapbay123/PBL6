import type { components } from './generated';
import type {OperationInputs} from './operations.generated';
import {markStoreContextChanged,retainStoreContextNotice} from './store-context-notice';
export type Product = components['schemas']['Product'];
export type Profile = components['schemas']['Profile'];
export type AuthTokens = components['schemas']['AuthTokens'];
export class ApiError extends Error {
  constructor(public status:number,public code:string,message:string,public correlationId?:string,public details:unknown[]=[]){super(message);}
}
/** A failed acknowledgement does not establish that a mutation was rejected. */
export const isUncertainMutation=(error:unknown)=>!(error instanceof ApiError)||error.status===0||error.status===408||error.status>=500;
// Token and context form one snapshot; requests and React share its lifetime.
let session:AuthTokens|undefined;
let epoch=0;
let refreshing:{epoch:number;promise:Promise<AuthTokens>}|undefined;
const listeners=new Set<()=>void>();
const requests=new Set<AbortController>();
const cookieReads=new Set<AbortController>();
const base=import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const signalKey='pbl6_auth_signal';
let channel:BroadcastChannel|undefined;
let syncUsers=0;
let lastSignal:string|undefined;
/** Cookie rotation is shared by all tabs, unlike the in-memory refresh flight. */
async function withCookieLock<T>(work:()=>Promise<T>):Promise<T>{
  if(!navigator.locks)throw new ApiError(0,'SESSION_SYNC_UNAVAILABLE','Không thể đồng bộ phiên trên trình duyệt này. Vui lòng mở bằng trình duyệt hỗ trợ đồng bộ tab.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{return await navigator.locks.request('pbl6_auth_cookie',{signal:controller.signal},async()=>{clearTimeout(timer);return work();});}
  catch(error){if(controller.signal.aborted)throw new ApiError(0,'SESSION_BUSY','Tab khác đang xử lý phiên đăng nhập. Vui lòng thử lại sau khi thao tác đó kết thúc.');throw error;}
  finally{clearTimeout(timer);}
}
export function sessionScope(value?:AuthTokens):string {
  const c=value?.context,m=c?.store_membership;
  return JSON.stringify([c?.user_id??'guest',[...(c?.roles??[])].sort(),[...(c?.role_permissions??[])].sort(),c?.token_version,
    m?[m.store_id,m.role,m.status,[...(m.permissions??[])].sort()]:null]);
}
const changed=()=>new ApiError(401,'SESSION_CHANGED','Phiên hoặc quyền truy cập đã thay đổi. Hãy kiểm tra lại trước khi thao tác.');
export const getAuthSession=()=>session;
export const subscribeAuth=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
function clearDrafts(){try{for(const key of Object.keys(sessionStorage))if(/^pbl6_(checkout_selection|checkout_draft|buy_now)_/.test(key))sessionStorage.removeItem(key);}catch{/* Storage is optional. */}}
function publish(value?:AuthTokens) {
  const previous=session?.context;
  if(sessionScope(value)!==sessionScope(session)) {
    epoch++;
    for(const controller of requests)controller.abort();
    if(session)clearDrafts();
    // Uncertain financial attempts remain isolated by their original user for reconciliation.
  }
  session=value;
  retainStoreContextNotice(value?.context?.user_id);
  if(previous?.user_id&&previous.user_id===value?.context?.user_id&&previous.store_membership?.store_id&&previous.store_membership.store_id!==value?.context?.store_membership?.store_id)markStoreContextChanged(previous.user_id);
  for(const listener of listeners)listener();
}
function invalidate(){epoch++;clearDrafts();publish(undefined);}
export const setAccessToken=(token?:string)=>{if(!token)invalidate();else publish({...session,access_token:token,expires_at:session?.expires_at??''});};
const csrf=()=>document.cookie.split('; ').find(x=>x.startsWith('pbl6_csrf='))?.split('=')[1]??'';
function notify(kind:'AUTH_CHANGED'|'SIGNED_OUT') {
  const message={kind,nonce:crypto.randomUUID()};
  lastSignal=message.nonce;
  // A token-free marker also lets a tab reject delayed channel notifications.
  try{localStorage.setItem(signalKey,JSON.stringify(message));}catch{try{localStorage.removeItem(signalKey);}catch{/* Channel remains available. */}}
  if(channel)channel.postMessage(message);
}
function receive(message:unknown) {
  const {kind,nonce}=(message??{}) as {kind?:string;nonce?:string};
  if((kind!=='AUTH_CHANGED'&&kind!=='SIGNED_OUT')||typeof nonce!=='string'||nonce===lastSignal)return;
  try{const latest=JSON.parse(localStorage.getItem(signalKey)??'null');if(latest?.nonce&&latest.nonce!==nonce)return;}catch{/* Storage is optional. */}
  lastSignal=nonce;
  const previous=session?.context;
  invalidate();
  if(kind==='AUTH_CHANGED'&&csrf())void restore().then(value=>{
    if(previous?.user_id&&previous.user_id===value.context?.user_id&&session?.context?.user_id===previous.user_id&&previous.store_membership?.store_id&&previous.store_membership.store_id!==value.context?.store_membership?.store_id)markStoreContextChanged(previous.user_id);
  }).catch(()=>{});
}
const storageChanged=(event:StorageEvent)=>{if(event.key===signalKey&&event.newValue)try{receive(JSON.parse(event.newValue));}catch{/* Ignore malformed signals. */}};
const revalidate=()=>{if(document.visibilityState==='visible'&&csrf())void restore().catch(()=>{});};
export function startAuthSync(){
  if(++syncUsers===1){
    if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel(signalKey);channel.onmessage=event=>receive(event.data);}
    window.addEventListener('storage',storageChanged);window.addEventListener('focus',revalidate);
  }
  return()=>{if(--syncUsers===0){channel?.close();channel=undefined;window.removeEventListener('storage',storageChanged);window.removeEventListener('focus',revalidate);}};
}
const restore=():Promise<AuthTokens>=>{
  const generation=epoch;
  if(refreshing?.epoch===generation)return refreshing.promise;
  const flight={epoch:generation,promise:undefined as unknown as Promise<AuthTokens>};
  flight.promise=withCookieLock(()=>{
    if(generation!==epoch)throw changed();
    return request<AuthTokens>('/auth/refresh',{method:'POST',body:'{}'},false);
  }).then(value=>{
    if(generation!==epoch)throw changed();
    const scopeChanged=!!session&&sessionScope(value)!==sessionScope(session);
    publish(value);if(scopeChanged)notify('AUTH_CHANGED');return value;
  }).catch(error=>{if(generation===epoch&&error instanceof ApiError&&[401,403].includes(error.status))invalidate();throw error;})
    .finally(()=>{if(refreshing===flight)refreshing=undefined;});
  refreshing=flight;return flight.promise;
};
export async function request<T>(path:string,options:RequestInit={},retry=true):Promise<T> {
  const generation=epoch,scope=sessionScope(session),authRequest=path.startsWith('/auth/');
  const headers=new Headers(options.headers);
  // The browser supplies the multipart boundary for authenticated photo uploads.
  if(options.body instanceof FormData)headers.delete('Content-Type');
  else headers.set('Content-Type','application/json');
  const store=session?.context?.store_membership?.store_id;
  if(/^\/store(?:\/|\?|$)/.test(path)&&store){
    const supplied=headers.get('X-Store-Context');
    if(supplied&&supplied.toLowerCase()!==store.toLowerCase())throw changed();
    headers.set('X-Store-Context',store);
  }
  if(session?.access_token&&!headers.has('Authorization'))headers.set('Authorization',`Bearer ${session.access_token}`);
  if(options.method && options.method!=='GET')headers.set('X-CSRF-Token',csrf());
  const controller=new AbortController(),abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)controller.abort();
  if(!authRequest)requests.add(controller);
  if(path==='/auth/refresh')cookieReads.add(controller);
  // Model generation can use the server's 30s provider deadline plus Catalog work.
  // Keep ordinary API calls short; an AI turn must survive that bounded deadline.
  const aiTurn=options.method==='POST'&&/^\/chat\/sessions\/[^/?]+\/messages(?:\?|$)/.test(path);
  const timer=setTimeout(abort,aiTurn?35000:7000);
  let response:Response,data:any;
  try {
    response=await fetch(base+path,{...options,headers,credentials:'include',signal:controller.signal});
    data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return {};});
  }
  catch {if(generation!==epoch)throw changed();throw new ApiError(0,'NETWORK_ERROR','Không kết nối được API.');}
  finally {clearTimeout(timer);requests.delete(controller);cookieReads.delete(controller);options.signal?.removeEventListener('abort',abort);}
  if(!authRequest&&generation!==epoch)throw changed();
  if(response.status===401 && retry && !authRequest) {
    await restore();
    // Never publish B's response into a query or command originally made for A.
    if(scope!==sessionScope(session))throw changed();
    return request<T>(path,options,false);
  }
  if(!authRequest&&generation!==epoch)throw changed();
  const storeChanged=response.status===409&&data.code==='STORE_CONTEXT_CHANGED';
  if((response.status===403||storeChanged)&&!authRequest&&path!=='/me/context'){
    // Another denied request may already have published the current, narrower
    // context. An obsolete failure must not erase that valid session.
    try{await refreshAuthContext();}catch{if(generation===epoch)invalidate();}
    if(generation!==epoch)throw changed();
  }
  if(!response.ok)throw new ApiError(response.status,data.code ?? 'API_ERROR',data.message ?? 'Yêu cầu thất bại.',data.correlation_id,data.details);
  return data as T;
}
export async function refreshAuthContext(){
  const generation=epoch,context=await request<components['schemas']['AuthContext']>('/me/context');
  if(generation!==epoch||!session)throw changed();
  if(context.user_id!==session.context?.user_id){invalidate();await restore();return;}
  const value={...session,context},scopeChanged=sessionScope(value)!==sessionScope(session);
  publish(value);if(scopeChanged)notify('AUTH_CHANGED');
}
async function establishSession(path:string,body:unknown){
    invalidate();const generation=epoch;
    for(const controller of cookieReads)controller.abort();
    return withCookieLock(async()=>{
      if(generation!==epoch)throw changed();
      const value=await request<AuthTokens>(path,{method:'POST',body:JSON.stringify(body)},false);
      if(generation!==epoch)throw changed();
      publish(value);notify('AUTH_CHANGED');return value;
    });
}
export const api={
  restore,
  login:(email:string,password:string)=>establishSession('/auth/login',{email,password,client_type:'WEB'}),
  demoLogin:(account:OperationInputs['demoLogin']['body']['account'])=>establishSession('/auth/demo-login',{account}),
  logout:async()=>{
    const token=session?.access_token;invalidate();for(const controller of cookieReads)controller.abort();
    notify('SIGNED_OUT');
    if(!token)return;
    const result=await withCookieLock(()=>request<components['schemas']['LogoutResult']>('/auth/logout',{method:'POST',body:'{}',headers:{Authorization:'Bearer '+token}},false));
    if(result.cookie_session_changed&&csrf()){await restore();notify('AUTH_CHANGED');}
  },
  profile:()=>request<Profile>('/me'),
  products:(page=1,q='')=>request<{items:Product[];total:number;page:number;size:number}>(`/products?page=${page}&size=20&q=${encodeURIComponent(q)}`),
};
