import http from 'k6/http';
import { check,sleep } from 'k6';
import { Counter } from 'k6/metrics';
// Only implemented Catalog read path. Not an end-to-end Commerce benchmark.
const workload=__ENV.WORKLOAD || 'catalog';
if(!['catalog','related'].includes(workload))throw new Error('Unsupported public read workload');
const rateLimited=new Counter('rate_limited');
export const options=__ENV.PROFILE==='smoke'
 ?{scenarios:{read_burst:{executor:'constant-vus',vus:100,duration:'30s',gracefulStop:'1s'}},thresholds:{http_req_duration:['p(95)<2000'],http_req_failed:['rate<0.01'],checks:['rate>0.99']}}
 :{stages:[{duration:'30s',target:10},{duration:'1m',target:100},{duration:'2m',target:100},{duration:'15s',target:0}],thresholds:{http_req_duration:['p(95)<2000'],http_req_failed:['rate<0.01']}};
export function setup(){
 if(workload!=='related')return {};
 const response=http.get(`${__ENV.BASE_URL || 'http://gateway'}/api/v1/products?page=1&size=1`);
 if(response.status!==200)throw new Error('Catalog setup unavailable');
 const item=response.json('items.0');if(!item?.id)throw new Error('No public Product for related workload');
 return {product_id:item.id};
}
export default function(data){
 const path=workload==='catalog'?'/products?page=1&size=20':`/products/${data.product_id}/related?page=1&size=20`;
 const response=http.get(`${__ENV.BASE_URL || 'http://gateway'}/api/v1${path}`,{timeout:'6s',tags:{workload}});
 if(response.status===429)rateLimited.add(1);
 let body={};try {body=response.json();}catch {}
 check(response,{'read 200':r=>r.status===200,'contract shape':()=>Array.isArray(body.items)&&typeof body.total==='number'&&body.size===20});
 sleep(__ENV.PROFILE==='smoke'?20:1);
}
