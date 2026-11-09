import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import {ErrorView} from '../../bootstrap/components';
import type {OperationOutputs} from '../../api/operations.generated';
import {formatMoney,useStoreAccess} from '../../live/useLiveData';

function StorePickupStatus(){
 const {id}=useStoreAccess();
 const pickup=useQuery({queryKey:['store-pickup-status',id],enabled:!!id,retry:1,refetchInterval:60000,queryFn:({signal})=>callOperation('getStorePickupStatus',{}, {signal})});
 return <p className="store-pickup-status" role="status"><strong>Điểm lấy hàng:</strong>{' '}
  {pickup.error?<>Chưa đọc được trạng thái. <button type="button" disabled={pickup.isFetching} onClick={()=>void pickup.refetch()}>Thử lại</button></>:!pickup.data?'Đang kiểm tra…':pickup.data.configured?'Đã cấu hình':'Chưa có điểm lấy hàng · Liên hệ quản trị'}
 </p>;
}

/** Configuration checks explain prerequisites; they do not promise a product is purchasable. */
export function StoreSetupGuide({store}:{store:OperationOutputs['getOwnStore']}){
 const access=useStoreAccess(),ready=!!store.return_address&&(['recipient_name','phone','line1','ward','district','city'] as const).every(key=>!!store.return_address?.[key]?.trim());
 return <section className="boot-card store-setup-guide" aria-label="Chuẩn bị nhận đơn mới"><h2>Thiết lập shop</h2>
  <StorePickupStatus />
  {!ready?<><p>Thêm địa chỉ nhận trả để nhận đơn mới.</p>{access.owner?<Link to="/seller/settings">Hoàn thiện địa chỉ nhận trả</Link>:<p>Nhờ chủ cửa hàng bổ sung địa chỉ nhận trả.</p>}</>:<p>Đã có địa chỉ nhận trả.</p>}
  <p>Phí giao hàng hiện tại: {store.shipping_fee_vnd===undefined?'Chưa có dữ liệu để kiểm tra':formatMoney(store.shipping_fee_vnd)}. {store.shipping_fee_vnd===0&&'Miễn phí giao hàng.'}</p>
  {access.owner&&<Link to="/seller/settings">Kiểm tra thông tin và phí giao hàng</Link>}
  <details><summary>Kiểm tra sản phẩm và tồn kho</summary><ol><li>{access.can('product.store.read_write')?<Link to="/seller/products">Kiểm tra sản phẩm và phân loại</Link>:'Người có quyền sản phẩm kiểm tra mô tả, phân loại, giá và trạng thái bán.'}</li>
   <li>{access.can('inventory.store.read_adjust')?<Link to="/seller/inventory">Kiểm tra tồn khả dụng</Link>:'Người có quyền kho kiểm tra đúng phân loại và tồn khả dụng.'}</li><li>Kiểm tra sản phẩm trên trang mua sắm.</li></ol>
 </details></section>;
}
export function StoreWorkGuide(){
 const access=useStoreAccess(),{refreshContext}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[notice,setNotice]=useState(''),alive=useRef(true),flight=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function refresh(){if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');try{await refreshContext();if(alive.current)setNotice('Đã đọc lại quyền hiện hành.');}catch(cause){if(alive.current)setError(cause);}finally{flight.current=false;if(alive.current)setBusy(false);}}
 const work=[['product.store.read_write','Quản lý sản phẩm','/seller/products','Mở sản phẩm'],['inventory.store.read_adjust','Xem và điều chỉnh kho','/seller/inventory','Mở kho'],['order.store.read_status_cancel','Xem và xử lý đơn hàng','/seller/orders','Mở đơn hàng'],['cod.store.collect','Ghi nhận thu COD','/seller/orders','Mở đơn để ghi nhận COD']] as const;
 return <section className="boot-card mt-6" aria-label="Quyền công việc hiện tại"><h2>Quyền công việc hiện tại</h2>
  <p>{access.owner?'Bạn là chủ cửa hàng.':'Nhờ chủ cửa hàng cấp thêm quyền khi cần.'}</p>
  <ul>{work.map(([permission,label,path,action])=>{const granted=access.can(permission),requiresOrders=permission==='cod.store.collect'&&!access.can('order.store.read_status_cancel');return <li key={permission}><strong>{label}</strong>: {granted?'Đã được cấp':'Chưa được cấp'}{granted&&!requiresOrders&&<> · <Link to={path}>{action}</Link></>}{granted&&requiresOrders&&' — cần thêm quyền xem và xử lý đơn hàng để thao tác từ danh sách đơn.'}</li>;})}</ul>
  <button type="button" disabled={busy} onClick={()=>void refresh()}>Làm mới quyền</button>
  {access.owner?<p><Link to="/seller/staff">Quản lý nhân viên và quyền công việc</Link>. Quyền ghi nhận COD được cấp riêng.</p>:<p>Cấu hình, báo cáo và hoàn COD do chủ cửa hàng quản lý.</p>}
  {error!=null&&<ErrorView error={error}/>} {notice&&<p role="status">{notice}</p>}
 </section>;
}
