import type {OperationOutputs} from '../../api/operations.generated';

/** Management-only information; public Product responses intentionally omit this decision. */
export function ProductModerationNotice({product}:{product:OperationOutputs['getOwnStoreProduct']}){
 const decision=product.moderation_decision;
 if(!decision&&product.moderation_status!=='HIDDEN')return null;
 return <section aria-label="Quyết định kiểm duyệt sản phẩm" className="boot-card">
  <h3>{product.moderation_status==='HIDDEN'?'Sản phẩm đang bị ẩn':'Quyết định kiểm duyệt gần nhất'}</h3>
  {decision?<><p><strong>Lý do: </strong>{decision.reason}</p><p>Thời điểm: <time dateTime={decision.decided_at}>{new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(decision.decided_at))}</time> (giờ Việt Nam)</p></>:<p>Chưa có quyết định đủ căn cứ để hiển thị lý do. Không thể suy lý do từ trạng thái hiện tại.</p>}
  {product.moderation_status==='HIDDEN'&&<p>Sửa theo lý do bên dưới. Admin cần bỏ ẩn trước khi sản phẩm hiển thị lại.</p>}
  <p>Mã sản phẩm: <code>{product.id}</code></p>
 </section>;
}
