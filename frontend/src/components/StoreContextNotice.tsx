import {useEffect,useSyncExternalStore} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../api/auth-context';
import {clearStoreContextNotice,getStoreContextNotice,subscribeStoreContextNotice,takeStoreContextReview} from '../api/store-context-notice';
export function StoreContextNotice(){
 const {session}=useAuth(),location=useLocation(),navigate=useNavigate(),notice=useSyncExternalStore(subscribeStoreContextNotice,()=>getStoreContextNotice(session?.context?.user_id));
 const active=session?.context?.store_membership?.status==='ACTIVE';
 useEffect(()=>{if(notice&&takeStoreContextReview(session?.context?.user_id)&&/^\/seller(?:\/|$)/.test(location.pathname))navigate(active?'/seller':'/profile',{replace:true});},[notice,session?.context?.user_id,location.pathname,active,navigate]);
 if(!notice)return null;
 return <aside className="boot-card" aria-label="Phạm vi Store đã thay đổi"><p role="status">{notice}</p><Link to={active?'/seller':'/profile'} onClick={clearStoreContextNotice}>{active?'Xem Store hiện tại':'Xem quyền hiện tại'}</Link><button type="button" onClick={clearStoreContextNotice}>Đã hiểu</button></aside>;
}
