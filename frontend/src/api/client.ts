import type { components } from './generated';
export type Product = components['schemas']['Product'];
export type Profile = components['schemas']['Profile'];
export type AuthTokens = components['schemas']['AuthTokens'];
export class ApiError extends Error {
  constructor(public status:number,public code:string,message:string,public correlationId?:string,public details:unknown[]=[]){super(message);}
}
let accessToken:string|undefined;
let credentialEpoch=0;
let refreshing:Promise<AuthTokens>|undefined;
const base=import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const setAccessToken=(token?:string)=>{credentialEpoch++;accessToken=token;};
const csrf=()=>document.cookie.split('; ').find(x=>x.startsWith('pbl6_csrf='))?.split('=')[1] ?? '';
const restore=()=>{
  const generation=credentialEpoch;
  refreshing ??= request<AuthTokens>('/auth/refresh',{method:'POST',body:'{}'},false).then(data=>{if(generation===credentialEpoch)setAccessToken(data.access_token);return data;}).finally(()=>{refreshing=undefined;});
  return refreshing;
};
export async function request<T>(path:string,options:RequestInit={},retry=true):Promise<T> {
  const generation=credentialEpoch;
  const headers=new Headers(options.headers);headers.set('Content-Type','application/json');
  if(accessToken)headers.set('Authorization',`Bearer ${accessToken}`);
  if(options.method && options.method!=='GET')headers.set('X-CSRF-Token',csrf());
  let response:Response;
  try {response=await fetch(base+path,{...options,headers,credentials:'include',signal:options.signal ?? AbortSignal.timeout(7000)});}
  catch {throw new ApiError(0,'NETWORK_ERROR','Không kết nối được API.');}
  if(response.status===401 && retry && !path.startsWith('/auth/')) {
    if(generation!==credentialEpoch)throw new ApiError(401,'SESSION_CHANGED','Phiên đăng nhập đã thay đổi. Hãy tải lại dữ liệu.');
    let restored:AuthTokens;
    try {restored=await restore();} catch(error) {if(generation===credentialEpoch)setAccessToken();throw error;}
    if(accessToken!==restored.access_token)throw new ApiError(401,'SESSION_CHANGED','Phiên đăng nhập đã thay đổi. Hãy tải lại dữ liệu.');
    return request<T>(path,options,false);
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new ApiError(response.status,data.code ?? 'API_ERROR',data.message ?? 'Yêu cầu thất bại.',data.correlation_id,data.details);
  return data as T;
}
export const api={
  restore,
  login:(email:string,password:string)=>request<AuthTokens>('/auth/login',{method:'POST',body:JSON.stringify({email,password,client_type:'WEB'})}),
  logout:()=>request('/auth/logout',{method:'POST',body:'{}'}),
  profile:()=>request<Profile>('/me'),
  products:(page=1,q='')=>request<{items:Product[];total:number;page:number;size:number}>(`/products?page=${page}&size=20&q=${encodeURIComponent(q)}`),
};
