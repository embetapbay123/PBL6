import { moneyNumber } from '../../../shared/src/money';

export interface DiscountTerms {
  discount_type: string;
  discount_value: string | number;
  max_discount_vnd?: string | number | null;
}

/** Canonical VND rounding/cap, shared by quotes and suggestions. Eligibility stays server-side. */
export function voucherDiscount(terms: DiscountTerms, goods: number): number {
  let amount = terms.discount_type === 'PERCENT'
    ? moneyNumber(BigInt(goods) * BigInt(terms.discount_value) / 100n)
    : moneyNumber(terms.discount_value);
  if (terms.discount_type === 'PERCENT' && terms.max_discount_vnd !== null && terms.max_discount_vnd !== undefined)
    amount = Math.min(amount, moneyNumber(terms.max_discount_vnd));
  return Math.min(goods, Math.max(0, amount));
}

export interface SuggestionVoucher extends DiscountTerms {
  id: string; code: string; scope: string; store_id: string | null;
  min_goods_vnd: string | number; status: string; starts_at: Date | string; ends_at: Date | string;
}
type StoreGoods = {store_id: string; goods_vnd: number};
type Choice = {discount: number; codes: Record<string,string>; count: number; signature: string};
export interface VoucherSelection {platform_voucher_code?: string; store_vouchers?: Record<string,string>}

export function activeVoucher(v: SuggestionVoucher, at: number) {
  const instant=(value:Date|string)=>value instanceof Date?value.getTime():Date.parse(value);
  return v.status === 'ACTIVE' && instant(v.starts_at) <= at && at < instant(v.ends_at);
}

/**
 * Equal total Store discounts have equal platform eligibility and final totals, so retain one
 * canonical selection per achievable sum. Never prune a smaller discount: it can preserve a
 * platform threshold. Bounded work returns LIMITED rather than claiming an unproven optimum.
 */
export function bestVoucherSelection(stores: StoreGoods[], candidates: SuggestionVoucher[], options: {
  at?: number; maxStates?: number; maxTransitions?: number; maxEvaluations?: number; candidatesComplete?: boolean;
} = {}) {
  const {at=Date.now(),maxStates=10000,maxTransitions=200000,maxEvaluations=1000000,candidatesComplete=true}=options;
  const goods=moneyNumber(stores.reduce((sum,s)=>sum+BigInt(s.goods_vnd),0n));
  const eligible=candidates.filter(v=>activeVoucher(v,at));
  let complete=candidatesComplete,transitions=0,evaluations=0;
  const baseline:Choice={discount:0,codes:{},count:0,signature:''};
  let states=new Map<number,Choice>([[0,baseline]]);
  const preferable=(a:Choice,b:Choice)=>a.count<b.count||(a.count===b.count&&a.signature<b.signature);
  for(const store of [...stores].sort((a,b)=>a.store_id.localeCompare(b.store_id))){
    const choices=new Map<number,SuggestionVoucher>();
    for(const v of eligible.filter(v=>v.scope==='STORE'&&v.store_id===store.store_id&&store.goods_vnd>=moneyNumber(v.min_goods_vnd))){
      const discount=voucherDiscount(v,store.goods_vnd),old=choices.get(discount);
      if(discount>0&&(!old||v.code<old.code))choices.set(discount,v);
    }
    if(!choices.size)continue;
    const next=new Map(states);let limited=false;
    for(const state of states.values()){
      for(const [discount,v] of choices){
        if(++transitions>maxTransitions){limited=true;break;}
        const sum=moneyNumber(BigInt(state.discount)+BigInt(discount));
        if(!next.has(sum)&&next.size>=maxStates){limited=true;break;}
        const candidate:Choice={discount:sum,codes:{...state.codes,[store.store_id]:v.code},count:state.count+1,signature:state.signature+'|'+store.store_id+':'+v.code};
        const existing=next.get(sum);if(!existing||preferable(candidate,existing))next.set(sum,candidate);
      }
      if(limited)break;
    }
    states=next;
    if(limited){complete=false;break;}
  }
  let winner=baseline,platform:SuggestionVoucher|undefined,net=goods;
  const consider=(choice:Choice,v?:SuggestionVoucher)=>{
    const afterStore=goods-choice.discount;
    if(v&&afterStore<moneyNumber(v.min_goods_vnd))return;
    const after=afterStore-(v?voucherDiscount(v,afterStore):0),count=choice.count+(v?1:0);
    const previousCount=winner.count+(platform?1:0),signature=choice.signature+'|'+(v?.code??''),oldSignature=winner.signature+'|'+(platform?.code??'');
    if(after<net||(after===net&&(count<previousCount||(count===previousCount&&signature<oldSignature)))){
      winner=choice;platform=v;net=after;
    }
  };
  for(const state of states.values())consider(state);
  outer:for(const v of eligible.filter(v=>v.scope==='PLATFORM').sort((a,b)=>a.code.localeCompare(b.code))){
    for(const state of states.values()){
      if(++evaluations>maxEvaluations){complete=false;break outer;}
      consider(state,v);
    }
  }
  const selected:VoucherSelection={...(Object.keys(winner.codes).length?{store_vouchers:winner.codes}:{}),...(platform?{platform_voucher_code:platform.code}:{})};
  return {selected,goods_total_vnd:goods,discount_total_vnd:goods-net,net_goods_total_vnd:net,optimality:complete?'OPTIMAL' as const:'LIMITED' as const};
}
