import type {EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';
// Callers already hold the Order lock, shared with case creation and settlement.
export async function assertDeliveryNotReturning(manager:EntityManager,orderId:string) {
 if((await manager.query("SELECT id FROM delivery_return_case WHERE order_id=$1 AND status<>'CLOSED'",[orderId])).length)
  throw new ApiError(409,'DELIVERY_RETURN_IN_PROGRESS','Đơn đang xử lý giao thất bại/hoàn về; không giao thành công hoặc ghi thu COD.');
}
