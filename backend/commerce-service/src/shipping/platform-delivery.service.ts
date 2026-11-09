import {randomUUID} from 'node:crypto';
import {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {once} from '../../../shared/src/idempotency';
import {audit} from '../../../shared/src/audit';
import type {OperationInputs} from '../../../shared/src/operations.generated';
import {authorizeShippingOrder,shipmentView,shippingScope} from './shipping.service';
import {deliveryApiConfigured} from './delivery-api';

export class PlatformDeliveryService {
  constructor(private readonly source:DataSource=database){}

  async savePickup(input:OperationInputs['savePlatformPickup']['body'],auth:any,trace:string){
    shippingScope(auth,'ADMIN');
    return this.source.transaction(async manager=>{
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))',['shipping-location:'+input.store_id]);
      const [old]=await manager.query('SELECT * FROM shipping_pickup_location WHERE id=$1 FOR UPDATE',[input.id]);
      if(old&&(old.provider!=='PLATFORM'||old.store_id!==input.store_id))throw new ApiError(409,'PICKUP_IDENTITY_IMMUTABLE','Kho không thuộc hệ thống giao hàng này.');
      if((old?.version??0)!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Kho đã thay đổi.');
      const [other]=await manager.query('SELECT id FROM shipping_pickup_location WHERE store_id=$1 AND enabled AND id<>$2',[input.store_id,input.id]);
      if(input.enabled&&other)throw new ApiError(409,'PICKUP_ALREADY_ASSIGNED','Cửa hàng đã có kho đang hoạt động. Tắt kho đó trước khi thay đổi.');
      const [row]=await manager.query(`INSERT INTO shipping_pickup_location(id,store_id,name,environment,account_key,address_json,enabled,provider)
        VALUES($1,$2,$3,'production','platform-internal',$4,$5,'PLATFORM') ON CONFLICT(id) DO UPDATE SET name=excluded.name,address_json=excluded.address_json,enabled=excluded.enabled,version=shipping_pickup_location.version+1,updated_at=now() RETURNING *`,
        [input.id,input.store_id,input.name,input.address,input.enabled]);
      await audit(manager,'M2',auth.user_id,'ShippingPickup',row.id,'SAVE_PLATFORM_PICKUP',trace,{}, {store_id:row.store_id,enabled:row.enabled});
      return {id:row.id,store_id:row.store_id,name:row.name,environment:row.environment,address:row.address_json,enabled:row.enabled,version:row.version,provider:row.provider};
    });
  }

  async requestReturnPickup(id:string,input:OperationInputs['requestPlatformReturnPickup']['body'],auth:any){
    return this.source.transaction(async manager=>{
      const [target]=await manager.query('SELECT order_id FROM order_return_request WHERE id=$1',[id]);
      const [order]=target?await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]):[];
      authorizeShippingOrder(order,auth,'CUSTOMER');
      const [request]=await manager.query('SELECT * FROM order_return_request WHERE id=$1 FOR UPDATE',[id]);
      return once(manager,'M2.PlatformDelivery.return-pickup',input.operation_id,{id,input,actor:auth.user_id},async()=>{
        if(!deliveryApiConfigured())throw new ApiError(503,'DELIVERY_NOT_CONFIGURED','Chưa kết nối hệ thống giao hàng.');
        if(order.shipping_mode!=='PLATFORM'||request.status!=='APPROVED')throw new ApiError(409,'RETURN_PICKUP_NOT_ALLOWED','Chỉ đặt lấy hàng cho yêu cầu trả hàng đã được duyệt.');
        if(request.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Yêu cầu đã thay đổi.');
        const [existing]=await manager.query("SELECT id FROM shipping_shipment WHERE return_request_id=$1 AND leg='CUSTOMER_RETURN' AND status NOT IN ('CANCELLED','RETURNED')",[id]);
        if(existing)throw new ApiError(409,'RETURN_PICKUP_EXISTS','Đã có lịch lấy hàng trả.');
        const [pickup]=await manager.query("SELECT * FROM shipping_pickup_location WHERE store_id=$1 AND provider='PLATFORM' AND enabled",[order.store_id]);
        const destination=order.return_policy_snapshot?.return_address??pickup?.address_json;
        if(!destination)throw new ApiError(409,'RETURN_ADDRESS_MISSING','Cần địa chỉ nhận hàng trả để đặt lịch.');
        const shipmentId=randomUUID(),code='pbl6-'+shipmentId;
        const [row]=await manager.query(`INSERT INTO shipping_shipment(id,order_id,store_id,return_request_id,leg,provider,environment,account_key,client_order_code,status,request_json)
          VALUES($1,$2,$3,$4,'CUSTOMER_RETURN','PLATFORM','production','platform-internal',$5,'CREATING',$6) RETURNING *`,
          [shipmentId,order.id,order.store_id,id,code,{from:order.address_snapshot,to:destination}]);
        await manager.query("INSERT INTO shipping_command(id,shipment_id,kind) VALUES($1,$2,'CREATE')",[input.operation_id,shipmentId]);
        await manager.query('UPDATE order_return_request SET version=version+1,updated_at=now() WHERE id=$1',[id]);
        return shipmentView(manager,row);
      });
    });
  }
}
