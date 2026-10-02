import http from 'k6/http';
import { check,sleep } from 'k6';
// Only implemented Catalog read path. Not an end-to-end Commerce benchmark.
export const options={stages:[{duration:'30s',target:10},{duration:'1m',target:100},{duration:'2m',target:100},{duration:'15s',target:0}],thresholds:{http_req_duration:['p(95)<2000'],http_req_failed:['rate<0.01']}};
export default function(){
 const response=http.get(`${__ENV.BASE_URL || 'http://gateway'}/api/v1/products?page=1&size=20`);
 check(response,{'catalog 200':r=>r.status===200,'has items':r=>Array.isArray(r.json('items'))});sleep(1);
}
