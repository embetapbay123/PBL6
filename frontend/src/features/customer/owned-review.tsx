import {ApiError} from '../../api/client';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {variantLabel} from '../../components/variant-identity';

export type OwnedReview=OperationOutputs['listOwnReviews']['items'][number];

export function reviewItemLabel(orderId:string,item:Record<string,unknown>){
 const value=item.product_snapshot,snapshot=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const raw=snapshot.variant_values,values=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const title=typeof snapshot.title==='string'&&snapshot.title.trim()?snapshot.title:'Chưa có tên món khi đặt';
 const variant=variantLabel(values,'')||(typeof snapshot.variant_title==='string'&&snapshot.variant_title.trim()?snapshot.variant_title:'Chưa lưu phân loại');
 return `${title} · ${variant} · SL ${Number.isSafeInteger(item.quantity)?item.quantity:'chưa có dữ liệu'} · Đơn #${orderId.slice(-8).toUpperCase()}${typeof item.sku_snapshot==='string'?' · SKU khi đặt: '+item.sku_snapshot:''}`;
}

/** Read the purchased item, never reconstruct a write version from the public list. */
export async function readOwnedReview(orderItemId:string,productId:string,reviewId?:string){
 const result=await callOperation('listOwnReviews',{query:{order_item_id:orderItemId,page:1,size:1}}),current=result.items[0];
 if(result.total>1||result.items.length>1||!current&&result.total!==0||current&&(result.total!==1||current.order_item_id!==orderItemId||current.product_id!==productId||reviewId&&current.id!==reviewId||!Number.isSafeInteger(current.version)||current.version<0)){
  throw new ApiError(503,'REVIEW_CONTEXT_INVALID','Kết quả đọc không khớp đánh giá cần đối chiếu. Bản nháp được giữ nguyên.');
 }
 return current;
}

export function reviewMatches(current:OwnedReview,rating:number,body:string){
 return current.rating===rating&&(current.body??'')===body.trim();
}

export function LatestSavedReview({review}:{review:OwnedReview}){
 return <section role="region" aria-label="Nội dung đã lưu mới nhất" className="boot-card"><h3>Nội dung đã lưu mới nhất</h3><p>{review.rating} / 5 sao · {review.status==='HIDDEN'?'Đang bị ẩn':'Đang hiển thị'}</p><p className="whitespace-pre-wrap break-words">{review.body??'Chưa có nội dung chữ.'}</p><p>Bản nháp bên dưới được giữ nguyên. Chỉ lưu tiếp nếu bạn muốn thay nội dung đã đọc này.</p></section>;
}
