import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {once} from '../../../shared/src/idempotency';
import {audit} from '../../../shared/src/audit';
import {returnedRow} from '../../../shared/src/postgres-returning';
import type {OperationInputs} from '../../../shared/src/operations.generated';
import {requireStorePermission} from '../scope';
import {CarrierAdapter,GhnAdapter,ShippingConfig,shippingConfig} from './ghn.adapter';
import {validTime} from './shipping-state';
import {applyCodEvidence,completeDeliveredOrder} from './shipping.transitions';
import {commandId} from '../order/checkout.runner';
import {deliveryApiConfigured} from './delivery-api';

type Scope='STORE'|'CUSTOMER'|'ADMIN';
const fail=(code:string,message:string,status=409):never=>{throw new ApiError(status,code,message);};
export function shippingScope(auth:any,scope:Scope):string {
  if(!auth?.user_id) return fail('UNAUTHENTICATED','Vui lòng đăng nhập.',401);
  if(scope==='ADMIN'){
    if(!auth.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))return fail('FORBIDDEN','Cần quyền quản trị nền tảng.',403);
    return auth.user_id;
  }
  return scope==='STORE'?requireStorePermission(auth,'order.store.read_status_cancel'):auth.user_id;
}
export function authorizeShippingOrder(order:any,auth:any,scope:Scope){
  const id=shippingScope(auth,scope);
  if(!order||(scope==='STORE'&&order.store_id!==id)||(scope==='CUSTOMER'&&order.customer_user_id!==id))fail('NOT_FOUND','Không tìm thấy đơn hàng.',404);
}
export async function shipmentView(manager:EntityManager,row:any,staff=false):Promise<any>{
  const events=await manager.query('SELECT status,occurred_at,source FROM shipping_event WHERE shipment_id=$1 ORDER BY occurred_at,id',[row.id]);
  const result:any={id:row.id,order_id:row.order_id,store_id:row.store_id,leg:row.leg,provider:row.provider,status:row.status,version:row.version,
    created_at:new Date(row.created_at).toISOString(),events:events.map((e:any)=>({status:e.status,occurred_at:new Date(e.occurred_at).toISOString(),source:['MANUAL','PLATFORM'].includes(e.source)?'MANUAL':'CARRIER'}))};
  for(const key of ['return_request_id','tracking_code'])if(row[key])result[key]=row[key];
  for(const key of ['expected_delivery_at','picked_up_at','delivered_at'])if(row[key])result[key]=new Date(row[key]).toISOString();
  if(staff){
    const parcel=row.request_json;
    const addressLabel=(value:any)=>[value?.recipient_name,value?.phone,value?.line1,value?.ward,value?.district,value?.city].filter(Boolean).join(', ').slice(0,1000);
    const pickupLabel=parcel.from?addressLabel(parcel.from):[parcel.from_name,parcel.from_phone,parcel.from_address,parcel.from_ward_name,parcel.from_district_name,parcel.from_province_name].filter(Boolean).join(', ').slice(0,1000);
    const destinationLabel=parcel.to?addressLabel(parcel.to):[parcel.to_name,parcel.to_phone,parcel.to_address,parcel.to_ward_name,parcel.to_district_name,parcel.to_province_name].filter(Boolean).join(', ').slice(0,1000);
    if(pickupLabel)result.pickup_label=pickupLabel;
    if(destinationLabel)result.destination_label=destinationLabel;
    if(row.courier_name)result.courier_name=row.courier_name;
    if(row.delivery_note)result.delivery_note=row.delivery_note;
    if(row.leg==='EXCHANGE_OUTBOUND'){
      const [request]=await manager.query('SELECT exchange_dispatch_snapshot FROM order_return_request WHERE id=$1',[row.return_request_id]);
      const quantities=new Map<string,{variant_id:string;name:string;quantity:number}>();
      for(const line of request?.exchange_dispatch_snapshot?.items??[]){const previous=quantities.get(line.variant_id);quantities.set(line.variant_id,{variant_id:line.variant_id,name:String(line.product_snapshot?.title??line.sku_snapshot).slice(0,512),quantity:(previous?.quantity??0)+line.quantity});}
      result.exchange_items=[...quantities.values()];
      const [receipt]=await manager.query('SELECT status FROM shipping_exchange_receipt WHERE shipment_id=$1',[row.id]);
      if(receipt)result.exchange_receipt_status=receipt.status;
    }
    result.environment=row.environment;result.cod_vnd=Number(row.cod_vnd);result.label_available=row.provider==='GHN'&&!!row.tracking_code&&!['CANCELLED','CREATE_FAILED'].includes(row.status);
    for(const key of ['last_error','provider_status'])if(row[key])result[key]=row[key];
    if(row.actual_fee_vnd!=null)result.actual_fee_vnd=Number(row.actual_fee_vnd);
    for(const key of ['cod_collected_at','cod_remitted_at'])if(row[key])result[key]=new Date(row[key]).toISOString();
    const [command]=await manager.query("SELECT kind,status FROM shipping_command WHERE shipment_id=$1 AND status IN ('PENDING','UNKNOWN')",[row.id]);
    if(command){result.pending_command=command.kind;result.pending_command_status=command.status;}
  }
  return result;
}
const locationView=(row:any)=>({id:row.id,store_id:row.store_id,name:row.name,...(row.shop_id?{shop_id:row.shop_id}:{}),provider:row.provider,environment:row.environment,address:row.address_json,enabled:row.enabled,version:row.version});
export class ShippingService {
  constructor(private readonly source:DataSource=database,private readonly cfg:ShippingConfig=shippingConfig(),private readonly carrier:CarrierAdapter=new GhnAdapter(cfg)){}
  connection(auth:any){shippingScope(auth,'ADMIN');return {provider:'GHN',environment:this.cfg.environment,configured:!!this.cfg.token&&this.cfg.webhookSecret.length>=24,booking_enabled:this.cfg.enabled&&!!this.cfg.token&&this.cfg.webhookSecret.length>=24,cod_verification_enabled:this.cfg.verifyCod};}
  async locations(auth:any){shippingScope(auth,'ADMIN');return {items:(await this.source.query('SELECT * FROM shipping_pickup_location ORDER BY created_at,id')).map(locationView)};}
  async saveLocation(input:OperationInputs['saveShippingLocation']['body'],auth:any,trace:string){
    shippingScope(auth,'ADMIN');
    if(input.enabled&&(!this.cfg.enabled||!this.cfg.token||this.cfg.webhookSecret.length<24||input.environment!==this.cfg.environment))fail('SHIPPING_NOT_CONFIGURED','Cần cấu hình kết nối đúng môi trường trước khi bật kho.');
    return this.source.transaction(async m=>{
      // Serialize activation per seller, including first insert; fail before a unique-index race.
      await m.query('SELECT pg_advisory_xact_lock(hashtext($1))',['shipping-location:'+input.store_id]);
      const [old]=await m.query('SELECT * FROM shipping_pickup_location WHERE id=$1 FOR UPDATE',[input.id]);
      if(old?.provider==='PLATFORM')fail('PICKUP_PROVIDER_MISMATCH','Dùng chức năng kho PBL6 để cập nhật kho này.');
      if(old&&(old.version!==input.expected_version||old.store_id!==input.store_id)||!old&&input.expected_version!==0)fail('VERSION_CONFLICT','Kho đã thay đổi. Hãy tải lại.');
      if(old&&(old.shop_id!==input.shop_id||old.environment!==input.environment||old.account_key!==this.cfg.accountKey))fail('PICKUP_IDENTITY_IMMUTABLE','Tạo kho mới để đổi tài khoản, môi trường hoặc ShopId.');
      const [other]=await m.query('SELECT id FROM shipping_pickup_location WHERE (environment=$1 AND account_key=$2 AND shop_id=$3 OR store_id=$4 AND enabled AND $5) AND id<>$6',[input.environment,this.cfg.accountKey,input.shop_id,input.store_id,input.enabled,input.id]);
      if(other)fail('PICKUP_ALREADY_ASSIGNED','ShopId đã gắn kho khác hoặc cửa hàng đã có kho đang bật.');
      const [row]=await m.query(`INSERT INTO shipping_pickup_location(id,store_id,name,shop_id,environment,account_key,address_json,enabled)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=excluded.name,address_json=excluded.address_json,enabled=excluded.enabled,version=shipping_pickup_location.version+1,updated_at=now() RETURNING *`,
        [input.id,input.store_id,input.name,input.shop_id,input.environment,this.cfg.accountKey,input.address,input.enabled]);
      await audit(m,'M2',auth.user_id,'ShippingPickup',row.id,'SAVE_PICKUP',trace,old?{enabled:old.enabled}:{},{enabled:row.enabled,store_id:row.store_id});
      return locationView(row);
    });
  }
  async timeline(orderId:string,auth:any,scope:'STORE'|'CUSTOMER'){
    const [order]=await this.source.query('SELECT * FROM "order" WHERE id=$1',[orderId]);authorizeShippingOrder(order,auth,scope);
    const rows=await this.source.query('SELECT * FROM shipping_shipment WHERE order_id=$1 ORDER BY created_at,id',[orderId]);
    const result:any={mode:order.shipping_mode,items:await Promise.all(rows.map((r:any)=>shipmentView(this.source.manager,r,scope==='STORE')))};
    if(scope==='STORE'){
      result.locations=(await this.source.query('SELECT * FROM shipping_pickup_location WHERE store_id=$1 AND enabled AND (provider=\'PLATFORM\' AND $4=\'PLATFORM\' OR provider=\'GHN\' AND $4=\'GHN\' AND environment=$2 AND account_key=$3)',[order.store_id,this.cfg.environment,this.cfg.accountKey,order.shipping_mode])).map(locationView);
      result.booking_enabled=order.shipping_mode==='PLATFORM'?deliveryApiConfigured():this.cfg.enabled&&!!this.cfg.token&&this.cfg.webhookSecret.length>=24;
    }
    return result;
  }
  async list(query:{page?:number;size?:number;status?:string;order_id?:string},auth:any,scope:'STORE'|'ADMIN'){
    const scopeId=shippingScope(auth,scope),page=query.page??1,size=query.size??20;
    const values:any[]=[scope==='STORE'?scopeId:null,query.status??null,query.order_id??null];
    const where=' WHERE ($1::uuid IS NULL OR store_id=$1) AND ($2::varchar IS NULL OR status=$2) AND ($3::uuid IS NULL OR order_id=$3)';
    const [count]=await this.source.query('SELECT count(*)::int AS total FROM shipping_shipment'+where,values);
    const rows=await this.source.query('SELECT * FROM shipping_shipment'+where+' ORDER BY created_at DESC,id LIMIT $4 OFFSET $5',[...values,size,(page-1)*size]);
    return {items:await Promise.all(rows.map((r:any)=>shipmentView(this.source.manager,r,true))),page,size,total:count.total};
  }
  async book(orderId:string,input:OperationInputs['bookStoreShipment']['body'],auth:any,trace:string){
    return this.source.transaction(async m=>{
      const [order]=await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[orderId]);authorizeShippingOrder(order,auth,'STORE');
      return once(m,'M2.Shipping.book',input.operation_id,{orderId,input,actor:auth.user_id},async()=>{
        const internal=order.shipping_mode==='PLATFORM';
        if(internal&&!deliveryApiConfigured())fail('DELIVERY_NOT_CONFIGURED','Chưa kết nối API hệ thống giao hàng.');
        if(!internal&&(!this.cfg.enabled||!this.cfg.token||this.cfg.webhookSecret.length<24))fail('SHIPPING_NOT_CONFIGURED','Nền tảng chưa bật đặt lịch giao hàng.');
        if(!['GHN','PLATFORM'].includes(order.shipping_mode))fail('LEGACY_SHIPPING','Đơn này tiếp tục theo phương thức giao hàng đã chốt.');
        if(order.version!==input.expected_order_version)fail('VERSION_CONFLICT','Đơn đã thay đổi. Tải lại trước khi đặt lịch.');
        const [pickup]=await m.query('SELECT * FROM shipping_pickup_location WHERE id=$1 AND store_id=$2 AND enabled AND provider=$5 AND environment=$3 AND account_key=$4',[input.pickup_location_id,order.store_id,internal?'production':this.cfg.environment,internal?'platform-internal':this.cfg.accountKey,internal?'PLATFORM':'GHN']);
        if(!pickup)fail('PICKUP_NOT_AVAILABLE','Không tìm thấy kho giao hàng đang hoạt động.',422);
        let items:any[],leg='OUTBOUND';
        if(input.return_request_id){
          const [request]=await m.query('SELECT * FROM order_return_request WHERE id=$1 AND order_id=$2 FOR UPDATE',[input.return_request_id,orderId]);
          if(!request||request.type!=='EXCHANGE'||request.status!=='RECEIVED'||request.exchange_status!=='APPLIED'||!request.exchange_dispatch_snapshot?.items?.length)fail('EXCHANGE_NOT_READY','Cần xác nhận xuất kho hàng đổi trước khi đặt lịch.');
          leg='EXCHANGE_OUTBOUND';items=request.exchange_dispatch_snapshot.items.map((i:any)=>({name:i.product_snapshot?.title??i.product_title??i.sku??'Hàng đổi',code:i.sku??i.variant_id,quantity:i.quantity,price:i.unit_price_vnd}));
        }else{
          if(order.status!=='PROCESSING')fail('ORDER_NOT_READY','Cần bắt đầu chuẩn bị đơn trước khi đặt lịch.');
          items=(await m.query('SELECT * FROM order_item WHERE order_id=$1 ORDER BY id',[orderId])).map((i:any)=>({name:String(i.product_snapshot?.title??i.product_snapshot?.name??i.sku_snapshot).slice(0,512),code:i.sku_snapshot,quantity:i.quantity,price:Number(i.unit_price_vnd)}));
        }
        const [existing]=await m.query("SELECT id FROM shipping_shipment WHERE order_id=$1 AND leg=$2 AND status<>'CANCELLED' AND ($3::uuid IS NULL OR return_request_id=$3)",[orderId,leg,input.return_request_id??null]);
        if(existing)fail('SHIPMENT_ALREADY_EXISTS','Đã có vận đơn cho chặng này. Tải lại để theo dõi.');
        const address=order.address_snapshot,from=pickup.address_json;
        if(!address||['recipient_name','phone','line1','ward','city'].some(k=>typeof address[k]!=='string'||!address[k].trim()))fail('SHIPPING_ADDRESS_INCOMPLETE','Địa chỉ nhận hàng chưa đầy đủ.');
        const cod=leg==='OUTBOUND'&&order.payment_method==='COD'?Number(order.payable_vnd):0;
        if(!Number.isSafeInteger(cod)||cod>50000000)fail('COD_LIMIT_EXCEEDED','Số tiền thu hộ vượt giới hạn vận chuyển.');
        const id=randomUUID(),clientCode='pbl6-'+id;
        const body={client_order_code:clientCode,payment_type_id:1,required_note:'CHOXEMHANGKHONGTHU',service_type_id:2,
          from_name:from.recipient_name,from_phone:from.phone,from_address:from.line1,from_ward_name:from.ward,from_district_name:from.district??'',from_province_name:from.city,is_new_from_address:from.new_address===true,
          return_name:from.recipient_name,return_phone:from.phone,return_address:from.line1,return_ward_name:from.ward,return_district_name:from.district??'',return_province_name:from.city,is_new_return_address:from.new_address===true,
          to_name:address.recipient_name,to_phone:address.phone,to_address:address.line1,to_ward_name:address.ward,to_district_name:address.district??'',to_province_name:address.city,is_new_to_address:address.new_address===true,
          cod_amount:cod,cod_failed_amount:0,insurance_value:Math.min(Number(order.goods_vnd),5000000),weight:input.weight,length:input.length,width:input.width,height:input.height,note:input.note??'',items,
          ...(internal&&input.note?.trim()?{handling_note:input.note.trim()}:{})};
        const [row]=await m.query(`INSERT INTO shipping_shipment(id,order_id,store_id,return_request_id,leg,pickup_location_id,environment,account_key,shop_id,client_order_code,request_json,cod_vnd)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[id,orderId,order.store_id,input.return_request_id??null,leg,pickup.id,this.cfg.environment,this.cfg.accountKey,pickup.shop_id,clientCode,body,cod]);
        if(internal)await m.query("UPDATE shipping_shipment SET provider='PLATFORM',environment='production',account_key='platform-internal' WHERE id=$1",[id]);
        await m.query("INSERT INTO shipping_command(id,shipment_id,kind) VALUES($1,$2,'CREATE')",[input.operation_id,id]);
        await m.query('UPDATE "order" SET version=version+1 WHERE id=$1',[orderId]);
        await audit(m,'M2',auth.user_id,'ShippingShipment',id,'BOOK_SHIPMENT',trace,{}, {order_id:orderId,leg});
        const [current]=await m.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]);
        return shipmentView(m,current,true);
      });
    });
  }
  private async lockShipment(m:EntityManager,id:string,auth:any,scope:'STORE'|'ADMIN'){
    const [target]=await m.query('SELECT order_id FROM shipping_shipment WHERE id=$1',[id]);
    const [order]=target?await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]):[];authorizeShippingOrder(order,auth,scope);
    const [row]=await m.query('SELECT * FROM shipping_shipment WHERE id=$1 FOR UPDATE',[id]);return {row,order};
  }
  async command(id:string,input:OperationInputs['storeShippingCommand']['body'],auth:any,scope:'STORE'|'ADMIN',trace:string){
    return this.source.transaction(async m=>{
      const {row}=await this.lockShipment(m,id,auth,scope);
      return once(m,'M2.Shipping.command',input.operation_id,{id,input,actor:auth.user_id},async()=>{
        if(row.version!==input.expected_version)fail('VERSION_CONFLICT','Vận đơn đã thay đổi.');
        if(input.kind==='CANCEL'&&row.status==='CREATE_FAILED'&&!row.tracking_code){
          const cancelled=returnedRow<any>(await m.query("UPDATE shipping_shipment SET status='CANCELLED',last_error=NULL,version=version+1 WHERE id=$1 RETURNING *",[id]));
          await audit(m,'M2',auth.user_id,'ShippingShipment',id,'CANCEL_REJECTED_BOOKING',trace,{}, {order_id:row.order_id});
          return shipmentView(m,cancelled,true);
        }
        if(!['GHN','PLATFORM'].includes(row.provider)||!row.tracking_code)fail('SHIPMENT_NOT_READY','Chưa có mã vận đơn từ hãng.');
        const allowed=input.kind==='CANCEL'?row.status==='READY_FOR_PICKUP':row.provider==='PLATFORM'?row.status==='DELIVERY_ATTEMPT_FAILED':input.kind==='REDELIVER'?['storing','waiting_to_return'].includes(row.provider_status):['delivery_fail','storing','waiting_to_return','return'].includes(row.provider_status);
        if(!allowed)fail('SHIPPING_COMMAND_NOT_ALLOWED','Trạng thái hiện tại không cho phép yêu cầu này.');
        if((await m.query("SELECT id FROM shipping_command WHERE shipment_id=$1 AND status IN ('PENDING','UNKNOWN')",[id])).length)fail('SHIPPING_COMMAND_PENDING','Yêu cầu trước đang chờ hãng xác nhận.');
        await m.query('INSERT INTO shipping_command(id,shipment_id,kind) VALUES($1,$2,$3)',[input.operation_id,id,input.kind]);
        const updated=returnedRow<any>(await m.query('UPDATE shipping_shipment SET version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id]));
        await audit(m,'M2',auth.user_id,'ShippingShipment',id,'SHIPPING_'+input.kind,trace,{}, {order_id:row.order_id});
        return shipmentView(m,updated,true);
      });
    });
  }
  async label(id:string,auth:any,scope:'STORE'|'ADMIN'){
    const [row]=await this.source.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]);
    const [order]=row?await this.source.query('SELECT * FROM "order" WHERE id=$1',[row.order_id]):[];authorizeShippingOrder(order,auth,scope);
    if(!row.tracking_code||row.provider!=='GHN'||row.environment!==this.cfg.environment||row.account_key!==this.cfg.accountKey)fail('LABEL_NOT_AVAILABLE','Chưa có nhãn cho vận đơn này.');
    return {url:await this.carrier.label(row.shop_id,row.tracking_code)};
  }
  async confirmCod(id:string,input:OperationInputs['confirmShippingCod']['body'],auth:any,trace:string){
    return this.source.transaction(async m=>{
      const {row,order}=await this.lockShipment(m,id,auth,'ADMIN');
      if(row.provider==='PLATFORM')fail('CARRIER_EVIDENCE_REQUIRED','Hệ thống Delivery xác nhận thu hộ qua API.');
      return once(m,'M2.Shipping.cod',input.operation_id,{id,input,actor:auth.user_id},async()=>{
        if(row.version!==input.expected_version)fail('VERSION_CONFLICT','Vận đơn đã thay đổi.');
        if(!input.reference.trim())fail('COD_EVIDENCE_REQUIRED','Cần tham chiếu biên nhận thu hộ.',422);
        await applyCodEvidence(m,row,order,input.amount_vnd,'ADMIN',input.reference.trim(),auth.user_id,trace);
        await completeDeliveredOrder(m,row,trace);
        const [updated]=await m.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]);return shipmentView(m,updated,true);
      });
    });
  }
  async inspectExchange(id:string,input:OperationInputs['storeInspectExchangeReturn']['body'],auth:any,scope:'STORE'|'ADMIN',trace:string){
    return this.source.transaction(async m=>{
      const {row}=await this.lockShipment(m,id,auth,scope);
      return once(m,'M2.Shipping.exchange-receipt',input.operation_id,{id,input,actor:auth.user_id},async()=>{
        if(row.version!==input.expected_version)fail('VERSION_CONFLICT','Vận đơn đã thay đổi.');
        if(row.leg!=='EXCHANGE_OUTBOUND'||row.status!=='RETURNED')fail('EXCHANGE_RETURN_NOT_RECEIVED','Chỉ kiểm kiện đổi sau khi hãng xác nhận đã chuyển hoàn.');
        if((await m.query('SELECT shipment_id FROM shipping_exchange_receipt WHERE shipment_id=$1',[id])).length)fail('EXCHANGE_RECEIPT_EXISTS','Biên bản kiện đổi đã được chốt.');
        const view=await shipmentView(m,row,true),originals=view.exchange_items as Array<{variant_id:string;quantity:number}>;
        if(!input.note.trim()||!originals.length||input.lines.length!==originals.length||new Set(input.lines.map(l=>l.variant_id)).size!==originals.length)fail('INSPECTION_REQUIRED','Cần kiểm đủ từng phân loại của kiện đổi.');
        for(const line of input.lines){const original=originals.find(o=>o.variant_id===line.variant_id);
          if(!original||[line.received_quantity,line.resellable_quantity,line.damaged_quantity].some(n=>!Number.isSafeInteger(n)||n<0)||line.received_quantity!==original.quantity||line.resellable_quantity+line.damaged_quantity!==line.received_quantity)fail('EXCHANGE_RECEIPT_INCOMPLETE','Ghi đúng số lượng thực nhận. Chỉ đối soát khi đã nhận và phân loại đủ kiện đổi.');}
        const body={operation_id:commandId('exchange-return:'+id),receipt_id:id,dispatch_receipt_id:row.return_request_id,order_id:row.order_id,actor_user_id:auth.user_id,items:input.lines.filter(l=>l.resellable_quantity>0).map(l=>({variant_id:l.variant_id,store_id:row.store_id,quantity:l.resellable_quantity}))};
        await m.query('INSERT INTO shipping_exchange_receipt(shipment_id,inspection_json,note,command_json) VALUES($1,$2,$3,$4)',[id,JSON.stringify(input.lines),input.note.trim(),body]);
        await m.query('UPDATE shipping_shipment SET version=version+1 WHERE id=$1',[id]);
        await audit(m,'M2',auth.user_id,'ShippingShipment',id,'INSPECT_EXCHANGE_RETURN',trace,{}, {order_id:row.order_id,lines:input.lines});
        const [updated]=await m.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]);return shipmentView(m,updated,true);
      });
    });
  }
  async externalReturn(id:string,input:OperationInputs['registerReturnShipping']['body'],auth:any){
    return this.source.transaction(async m=>{
      const [target]=await m.query('SELECT order_id FROM order_return_request WHERE id=$1',[id]);
      const [order]=target?await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]):[];authorizeShippingOrder(order,auth,'CUSTOMER');
      const [request]=await m.query('SELECT * FROM order_return_request WHERE id=$1 FOR UPDATE',[id]);
      return once(m,'M2.Shipping.return',input.operation_id,{id,input,actor:auth.user_id},async()=>{
        if(request.version!==input.expected_version)fail('VERSION_CONFLICT','Yêu cầu đã thay đổi.');
        if(request.status!=='APPROVED')fail('RETURN_NOT_APPROVED','Chỉ gửi hàng sau khi yêu cầu được duyệt.');
        if((await m.query("SELECT id FROM shipping_shipment WHERE return_request_id=$1 AND leg='CUSTOMER_RETURN'",[id])).length)fail('SHIPMENT_ALREADY_EXISTS','Đã ghi nhận vận đơn trả hàng.');
        const [row]=await m.query(`INSERT INTO shipping_shipment(id,order_id,store_id,return_request_id,leg,provider,environment,account_key,client_order_code,tracking_code,status,request_json)
          VALUES($1,$2,$3,$4,'CUSTOMER_RETURN','EXTERNAL','staging','external',$5,$6,'MANUAL_IN_TRANSIT',$7) RETURNING *`,[randomUUID(),order.id,order.store_id,id,'external-'+input.operation_id,input.tracking_code,{carrier_name:input.carrier_name}]);
        await m.query("INSERT INTO shipping_event(shipment_id,status,source,occurred_at) VALUES($1,'MANUAL_IN_TRANSIT','MANUAL',now())",[row.id]);
        await m.query('UPDATE order_return_request SET version=version+1,updated_at=now() WHERE id=$1',[id]);return shipmentView(m,row);
      });
    });
  }
  async webhook(secret:unknown,body:any){
    const expected=Buffer.from(this.cfg.webhookSecret),given=Buffer.from(typeof secret==='string'?secret:'');
    if(expected.length<24||given.length!==expected.length||!timingSafeEqual(expected,given))fail('INVALID_WEBHOOK_SECRET','Không xác thực được webhook.',401);
    if(!body||!Number.isSafeInteger(body.ShopID)||body.ShopID<=0||typeof body.OrderCode!=='string'||!body.OrderCode||body.OrderCode.length>100||typeof body.Type!=='string'||body.Type.length>100||!body.Type||!validTime(body.Time)||new Date(body.Time).getTime()>Date.now()+300000||body.ClientOrderCode!=null&&(typeof body.ClientOrderCode!=='string'||body.ClientOrderCode.length>50)||body.Status!=null&&(typeof body.Status!=='string'||body.Status.length>100))fail('VALIDATION_FAILED','Callback không hợp lệ.',422);
    const [known]=await this.source.query('SELECT id FROM shipping_pickup_location WHERE environment=$1 AND account_key=$2 AND shop_id=$3',[this.cfg.environment,this.cfg.accountKey,body.ShopID]);
    if(!known)fail('UNKNOWN_SHIPPING_SHOP','ShopId chưa được đăng ký.',422);
    const key=createHash('sha256').update(JSON.stringify([this.cfg.environment,this.cfg.accountKey,body.ShopID,body.OrderCode,body.Type,body.Time])).digest('hex');
    await this.source.query(`INSERT INTO shipping_webhook_receipt(dedup_key,environment,account_key,shop_id,tracking_code,client_order_code,payload_json)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(dedup_key) DO NOTHING`,[key,this.cfg.environment,this.cfg.accountKey,body.ShopID,body.OrderCode,body.ClientOrderCode||null,body]);
    return {accepted:true};
  }
}
