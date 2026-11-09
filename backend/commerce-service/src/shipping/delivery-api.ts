import {createHmac,timingSafeEqual} from 'node:crypto';
import {ApiError} from '../../../shared/src/errors';
import type {DeliverySnapshot,CreateParcel} from '../../../delivery-service/src/contracts';

export function deliveryApiConfigured(){return !!process.env.DELIVERY_API_URL&&(process.env.DELIVERY_API_KEY?.length??0)>=24&&(process.env.DELIVERY_WEBHOOK_SECRET?.length??0)>=24;}
export class DeliveryApi {
  constructor(private readonly url=process.env.DELIVERY_API_URL??'',private readonly key=process.env.DELIVERY_API_KEY??''){}
  private async request(path:string,body?:unknown):Promise<DeliverySnapshot>{
    if(!this.url||!this.key)throw new ApiError(503,'DELIVERY_NOT_CONFIGURED','Chưa cấu hình API của hệ thống giao hàng.');
    let response:Response;
    try{response=await fetch(this.url+'/api/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000),redirect:'error'});}
    catch{throw new ApiError(503,'DELIVERY_RESULT_UNKNOWN','Chưa rõ kết quả yêu cầu giao nhận.');}
    if(!response.ok)throw new ApiError([404,409,422].includes(response.status)?response.status:503,'DELIVERY_API_REJECTED','Hệ thống giao hàng chưa xác nhận yêu cầu.');
    return response.json();
  }
  create(reference:string,body:any){
    const address=(prefix:string)=>({name:body[prefix+'_name'],phone:body[prefix+'_phone'],address:[body[prefix+'_address'],body[prefix+'_ward_name'],body[prefix+'_district_name'],body[prefix+'_province_name']].filter(Boolean).join(', ')});
    const convert=(value:any)=>({name:value.recipient_name,phone:value.phone,address:[value.line1,value.ward,value.district,value.city].filter(Boolean).join(', ')});
    const parcel:CreateParcel={client_reference:reference,pickup:body.from?convert(body.from):address('from'),destination:body.to?convert(body.to):address('to'),cod_amount:body.cod_amount??0,contents:body.items?.map((item:any)=>item.name+' × '+item.quantity).join(', ').slice(0,2000)||'Kiện hàng gửi trả',weight:body.weight??500};
    if(body.handling_note)parcel.handling_note=body.handling_note;
    return this.request('parcels',parcel);
  }
  lookup(reference:string){return this.request('parcels/'+encodeURIComponent(reference));}
  command(reference:string,body:unknown){return this.request('parcels/'+encodeURIComponent(reference)+'/commands',body);}
}
export function authenticateDeliveryCallback(raw:Buffer,timestamp:unknown,signature:unknown,secret=process.env.DELIVERY_WEBHOOK_SECRET??''){
  if(!Buffer.isBuffer(raw)||secret.length<24||typeof timestamp!=='string'||typeof signature!=='string'||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)throw new ApiError(401,'INVALID_DELIVERY_SIGNATURE','Không xác thực được callback giao nhận.');
  const expected=Buffer.from(createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex'));
  const given=Buffer.from(signature);
  if(expected.length!==given.length||!timingSafeEqual(expected,given))throw new ApiError(401,'INVALID_DELIVERY_SIGNATURE','Không xác thực được callback giao nhận.');
}
