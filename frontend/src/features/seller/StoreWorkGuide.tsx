import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {ErrorView} from '../../bootstrap/components';
import type {OperationOutputs} from '../../api/operations.generated';
import {formatMoney,useStoreAccess} from '../../live/useLiveData';

/** Configuration checks explain prerequisites; they do not promise a product is purchasable. */
export function StoreSetupGuide({store}:{store:OperationOutputs['getOwnStore']}){
 const access=useStoreAccess(),ready=!!store.return_address&&(['recipient_name','phone','line1','ward','district','city'] as const).every(key=>!!store.return_address?.[key]?.trim());
 return <section className="boot-card mt-6" aria-label="Chuẩn bị nhận đơn mới"><h2>Chuẩn bị nhận đơn mới</h2>
  {!ready?<><p>Store chưa hoàn thiện địa chỉ nhận trả nên chưa thể nhận đơn mới. Các đơn đang mở vẫn tiếp tục được xử lý.</p>{access.owner?<Link to="/seller/settings">Hoàn thiện địa chỉ nhận trả</Link>:<p>Nhờ chủ Store hoàn thiện địa chỉ nhận trả trong thông tin gian hàng; nhân viên không có quyền sửa cấu hình này.</p>}</>:<p>Đã có địa chỉ nhận trả. Sản phẩm vẫn cần đủ thông tin, được phép bán và có tồn khả dụng để khách đặt hàng.</p>}
  <p>Phí giao hàng hiện tại: {store.shipping_fee_vnd===undefined?'Chưa có dữ liệu để kiểm tra':formatMoney(store.shipping_fee_vnd)}. {store.shipping_fee_vnd===0&&'Mức 0 đồng là miễn phí giao hàng; hãy kiểm tra đây có đúng ý định của Store không.'}</p>
  {access.owner&&<Link to="/seller/settings">Kiểm tra thông tin và phí giao hàng</Link>}
  <ol><li>{access.can('product.store.read_write')?<Link to="/seller/products">Kiểm tra sản phẩm và phân loại</Link>:'Người có quyền sản phẩm kiểm tra mô tả, phân loại, giá và trạng thái bán.'}</li>
   <li>{access.can('inventory.store.read_adjust')?<Link to="/seller/inventory">Kiểm tra tồn khả dụng</Link>:'Người có quyền kho kiểm tra đúng phân loại và tồn khả dụng.'}</li><li>Kiểm tra trang sản phẩm dành cho khách. Cấu hình đầy đủ chưa chứng minh khách có thể đặt mọi sản phẩm.</li></ol>
 </section>;
}
export function StoreWorkGuide(){
 const access=useStoreAccess(),{refreshContext}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[notice,setNotice]=useState(''),alive=useRef(true),flight=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function refresh(){if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');try{await refreshContext();if(alive.current)setNotice('Đã đọc lại quyền hiện hành.');}catch(cause){if(alive.current)setError(cause);}finally{flight.current=false;if(alive.current)setBusy(false);}}
 const work=[['product.store.read_write','Quản lý sản phẩm','/seller/products','Mở sản phẩm'],['inventory.store.read_adjust','Xem và điều chỉnh kho','/seller/inventory','Mở kho'],['order.store.read_status_cancel','Xem và xử lý đơn hàng','/seller/orders','Mở đơn hàng'],['cod.store.collect','Ghi nhận thu COD','/seller/orders','Mở đơn để ghi nhận COD']] as const;
 return <section className="boot-card mt-6" aria-label="Quyền công việc hiện tại"><h2>Quyền công việc hiện tại</h2>
  <p>{access.owner?'Bạn là chủ Store; có quyền quản lý Store và phân công nhân viên.':'Bạn là nhân viên Store. Các công việc chưa được cấp quyền sẽ không xuất hiện trong menu; nhờ chủ Store cấp quyền phù hợp. Thiếu quyền khác với Store chưa hoàn tất thiết lập.'}</p>
  <ul>{work.map(([permission,label,path,action])=>{const granted=access.can(permission),requiresOrders=permission==='cod.store.collect'&&!access.can('order.store.read_status_cancel');return <li key={permission}><strong>{label}</strong>: {granted?'Đã được cấp':'Chưa được cấp'}{granted&&!requiresOrders&&<> · <Link to={path}>{action}</Link></>}{granted&&requiresOrders&&' — cần thêm quyền xem và xử lý đơn hàng để thao tác từ danh sách đơn.'}</li>;})}</ul>
  <p>Quyền vừa thay đổi có thể làm đóng công việc đang mở. Kiểm tra quyền hiện hành trước khi tiếp tục.</p><button type="button" disabled={busy} onClick={()=>void refresh()}>Đọc lại quyền công việc</button>
  {access.owner?<p><Link to="/seller/staff">Quản lý nhân viên và quyền công việc</Link>. Cấp đúng việc cần làm; quyền ghi nhận COD cần được giao riêng cho nhân viên.</p>:<p>Chỉ chủ Store sửa cấu hình, quản lý nhân viên, xem báo cáo và nhật ký Store. Nhân viên không có quyền xác nhận hoàn COD.</p>}
  {error!=null&&<ErrorView error={error}/>} {notice&&<p role="status">{notice}</p>}
 </section>;
}
