import {ApiError} from '../../../shared/src/errors';
export interface ShippingConfig {environment:'staging'|'production';accountKey:string;token:string;webhookSecret:string;enabled:boolean;verifyCod:boolean}
export function shippingConfig(env:NodeJS.ProcessEnv=process.env):ShippingConfig {
  const environment=env.GHN_ENVIRONMENT??'staging';
  if(!['staging','production'].includes(environment))throw new ApiError(503,'SHIPPING_CONFIG_INVALID','Môi trường giao hàng chưa hợp lệ.');
  return {environment:environment as ShippingConfig['environment'],accountKey:env.GHN_ACCOUNT_KEY??'platform',token:env.GHN_TOKEN??'',
    webhookSecret:env.GHN_WEBHOOK_SECRET??'',enabled:env.SHIPPING_ENABLED==='1',verifyCod:env.GHN_VERIFY_COD_COLLECTION==='1'};
}
export class CarrierError extends Error {
  constructor(readonly code:string,readonly definitive=false){super(code);}
}
export interface CarrierAdapter {
  create(shop:number,body:Record<string,unknown>):Promise<any>;
  lookup(shop:number,clientCode:string):Promise<any>;
  command(shop:number,tracking:string,kind:'CANCEL'|'REDELIVER'|'RETURN'):Promise<void>;
  label(shop:number,tracking:string):Promise<string>;
}
/** No caller-provided URLs, tokens in logs, or blind retries of ambiguous commands. */
export class GhnAdapter implements CarrierAdapter {
  private readonly base:string;
  constructor(private readonly config:ShippingConfig,private readonly fetcher:typeof fetch=fetch){
    this.base=config.environment==='staging'?'https://dev-online-gateway.ghn.vn':'https://online-gateway.ghn.vn';
  }
  private async call(path:string,shop:number,body:Record<string,unknown>,get=false):Promise<any>{
    if(!this.config.token)throw new CarrierError('SHIPPING_NOT_CONFIGURED');
    const url=this.base+'/shiip/public-api/'+path+(get?'?'+new URLSearchParams(Object.entries(body).map(([k,v])=>[k,String(v)])):'');
    let response:Response;
    try{response=await this.fetcher(url,{method:get?'GET':'POST',headers:{Token:this.config.token,ShopId:String(shop),'Content-Type':'application/json'},
      ...(get?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000),redirect:'error'});}
    catch{throw new CarrierError('CARRIER_RESULT_UNKNOWN');}
    let result:any;try{result=await response.json();}catch{throw new CarrierError('CARRIER_RESULT_UNKNOWN');}
    if(!response.ok||result.code!==200){
      if(get&&(response.status===404||result.code_message==='ORDER_NOT_FOUND'))throw new CarrierError('CARRIER_ORDER_NOT_FOUND',true);
      const definitive=response.status>=400&&response.status<500&&![408,429].includes(response.status);
      throw new CarrierError(definitive?'CARRIER_REQUEST_REJECTED':'CARRIER_RESULT_UNKNOWN',definitive);
    }
    if(result.data===undefined||result.data===null)throw new CarrierError('CARRIER_RESULT_UNKNOWN');
    return result.data;
  }
  create(shop:number,body:Record<string,unknown>){return this.call('v2/shipping-order/create',shop,body);}
  lookup(shop:number,clientCode:string){return this.call('v2/shipping-order/detail-by-client-code',shop,{client_order_code:clientCode},true);}
  async command(shop:number,tracking:string,kind:'CANCEL'|'REDELIVER'|'RETURN'){
    const path={CANCEL:'cancel',REDELIVER:'storing',RETURN:'return'}[kind];
    const result=await this.call('v2/switch-status/'+path,shop,{order_codes:[tracking]});
    if(!Array.isArray(result)||!result.some(row=>row.order_code===tracking&&row.result===true))throw new CarrierError('CARRIER_COMMAND_REJECTED',true);
  }
  async label(shop:number,tracking:string){
    const data=await this.call('v2/a5/gen-token',shop,{order_codes:[tracking]});
    if(typeof data.token!=='string'||!data.token)throw new CarrierError('CARRIER_RESULT_UNKNOWN');
    return this.base+'/a5/public-api/printA5?token='+encodeURIComponent(data.token);
  }
}
