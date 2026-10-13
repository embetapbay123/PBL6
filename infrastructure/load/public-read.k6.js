import http from 'k6/http';
import { check,sleep } from 'k6';
import { Counter } from 'k6/metrics';
// Implemented public API mix only. Full Commerce/provider acceptance is a separate gate.
const profile=__ENV.PROFILE || 'smoke';
if(!['smoke','acceptance'].includes(profile))throw new Error('Unsupported profile');
const limited=new Counter('rate_limited');
export const options={scenarios:{read_mix:{executor:'constant-vus',vus:100,duration:profile==='acceptance'?'15m':'30s',gracefulStop:'6s'}},thresholds:{http_req_failed:['rate<0.01'],checks:['rate>0.99'],'http_req_duration{operation:listProducts}':['p(95)<2000'],'http_req_duration{operation:getProduct}':['p(95)<2000'],'http_req_duration{operation:getRelatedProducts}':['p(95)<2000']}};
const base=__ENV.BASE_URL || 'http://gateway';
function read(path,operation){
 const r=http.get(base+'/api/v1'+path,{timeout:'6s',tags:{operation}});
 if(r.status===429)limited.add(1);
 let data;try{data=r.json();}catch{}
 check(r,{[operation+' 200']:()=>r.status===200,[operation+' shape']:()=>operation==='getProduct'?typeof data?.id==='string'&&data.status==='ACTIVE':Array.isArray(data?.items)&&Number.isInteger(data.total)});
 return data;
}
export function setup(){
 const page=read('/products?page=1&size=20','listProducts');
 if(!page?.items?.length)throw new Error('Public seed Catalog is required');
 return {ids:page.items.map(p=>p.id),catalog_size:page.total};
}
export default function(data){
 const id=data.ids[(__VU-1)%data.ids.length];
 read('/products?page=1&size=20','listProducts');
 read('/products/'+id,'getProduct');
 read('/products/'+id+'/related?page=1&size=20','getRelatedProducts');
 sleep(20);
}
