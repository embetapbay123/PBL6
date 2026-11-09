import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import type {OperationOutputs} from '../../../shared/src/operations.generated';
import {shippingConfig,type ShippingConfig} from './ghn.adapter';

type StoreContext = {user_id?:string;store_membership?:{store_id?:string;status?:string}};

export async function getStorePickupStatus(
  auth:StoreContext|undefined,
  source:Pick<DataSource,'query'>=database,
  config:Pick<ShippingConfig,'environment'|'accountKey'>=shippingConfig(),
):Promise<OperationOutputs['getStorePickupStatus']>{
  const member=auth?.store_membership;
  if(!auth?.user_id||member?.status!=='ACTIVE'||!member.store_id){
    throw new ApiError(403,'FORBIDDEN','Tài khoản không thuộc gian hàng đang hoạt động.');
  }
  const [row]=await source.query(`SELECT EXISTS (
    SELECT 1 FROM shipping_pickup_location WHERE store_id=$1 AND enabled AND (
      (provider='PLATFORM' AND environment='production' AND account_key='platform-internal') OR
      (provider='GHN' AND environment=$2 AND account_key=$3)
    )
  ) AS configured`,[member.store_id,config.environment,config.accountKey]);
  return {configured:row.configured};
}
