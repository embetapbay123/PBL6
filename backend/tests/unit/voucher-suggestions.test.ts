import {bestVoucherSelection,voucherDiscount,type SuggestionVoucher} from '../../commerce-service/src/voucher/voucher-pricing';
const at=Date.parse('2026-11-14T00:00:00Z');
function v(code:string,store:string|null,value:number,min=0,extra:Partial<SuggestionVoucher>={}):SuggestionVoucher{return {id:code,code,scope:store?'STORE':'PLATFORM',store_id:store,discount_type:'FIXED',discount_value:value,min_goods_vnd:min,status:'ACTIVE',starts_at:'2026-01-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',...extra};}
test('maximizing a Store coupon can be worse than preserving the platform threshold',()=>{
 const r=bestVoucherSelection([{store_id:'a',goods_vnd:300000}],[v('BIG','a',100000),v('SMALL','a',40000),v('PLATFORM',null,100000,250000)],{at});
 expect(r.selected).toEqual({store_vouchers:{a:'SMALL'},platform_voucher_code:'PLATFORM'});expect(r.net_goods_total_vnd).toBe(160000);expect(r.optimality).toBe('OPTIMAL');
});
test('percentage flooring, zero caps, goods caps and zero-discount choices match quote arithmetic',()=>{
 expect(voucherDiscount({discount_type:'PERCENT',discount_value:13},107)).toBe(13);
 expect(voucherDiscount({discount_type:'PERCENT',discount_value:50,max_discount_vnd:0},100)).toBe(0);
 expect(voucherDiscount({discount_type:'FIXED',discount_value:999},100)).toBe(100);
 const r=bestVoucherSelection([{store_id:'a',goods_vnd:100}],[v('ZERO','a',20,0,{discount_type:'PERCENT',max_discount_vnd:0})],{at});expect(r.selected).toEqual({});
});
test('inactive, expired, future, wrong Store and minimum spend coupons cannot be selected',()=>{
 const invalid=[v('STOP','a',99,0,{status:'STOPPED'}),v('EXPIRED','a',99,0,{ends_at:new Date(at)}),v('FUTURE','a',99,0,{starts_at:new Date(at+1)}),v('OTHER','b',99),v('MIN','a',99,101)];
 expect(bestVoucherSelection([{store_id:'a',goods_vnd:100}],invalid,{at}).selected).toEqual({});
});
test('bounded work returns a feasible partial suggestion with an explicit LIMITED status',()=>{
 const r=bestVoucherSelection([{store_id:'a',goods_vnd:1000},{store_id:'b',goods_vnd:1000}],[v('A','a',300),v('B','b',200),v('P',null,100)],{at,maxStates:1,maxEvaluations:0});
 expect(r.optimality).toBe('LIMITED');expect(r.net_goods_total_vnd).toBeLessThanOrEqual(2000);
 expect(bestVoucherSelection([],[],{at,candidatesComplete:false}).optimality).toBe('LIMITED');
});
test('equivalent totals use fewer coupons and deterministic codes',()=>{
 const coupons=[v('Z','a',100),v('A','a',100),v('B','b',50),v('P',null,0)];
 const stores=[{store_id:'a',goods_vnd:100},{store_id:'b',goods_vnd:50}];
 expect(bestVoucherSelection(stores,coupons,{at}).selected).toEqual({store_vouchers:{a:'A',b:'B'}});
 expect(bestVoucherSelection(stores,[...coupons].reverse(),{at}).selected).toEqual({store_vouchers:{a:'A',b:'B'}});
});
test('exact solver agrees with exhaustive combinations across multiple Stores and platform rules',()=>{
 let seed=473;const random=(max:number)=>(seed=(seed*48271)%2147483647)%max;
 for(let run=0;run<80;run++){
  const stores=[{store_id:'a',goods_vnd:500+random(500)},{store_id:'b',goods_vnd:500+random(500)},{store_id:'c',goods_vnd:500+random(500)}];
  const coupons=stores.flatMap(s=>[v(s.store_id+'1',s.store_id,random(400)),v(s.store_id+'2',s.store_id,random(60),0,{discount_type:'PERCENT',max_discount_vnd:random(500)})]);
  const platforms=[v('P1',null,random(600),random(2000)),v('P2',null,random(100),random(2000),{discount_type:'PERCENT',max_discount_vnd:random(800)})];
  const goods=stores.reduce((n,s)=>n+s.goods_vnd,0);let best=goods;
  const enumerate=(i:number,discount:number)=>{if(i===stores.length){const net=goods-discount;best=Math.min(best,net);for(const p of platforms)if(net>=Number(p.min_goods_vnd))best=Math.min(best,net-voucherDiscount(p,net));return;}enumerate(i+1,discount);for(const c of coupons.filter(c=>c.store_id===stores[i].store_id))enumerate(i+1,discount+voucherDiscount(c,stores[i].goods_vnd));};
  enumerate(0,0);const r=bestVoucherSelection(stores,[...coupons,...platforms],{at});expect(r.optimality).toBe('OPTIMAL');expect(r.net_goods_total_vnd).toBe(best);
 }
});
