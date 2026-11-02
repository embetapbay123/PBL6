import {ReturnActions} from "./ReturnActions";
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../api/auth-context';
import { ApiError } from '../../api/client';
import { callOperation } from '../../api/operations';
import { Empty, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { ReturnRequestView, type ReturnRequest } from './ReturnRequestView';
import {useAdminParties} from '../admin/AdminParties';
import {AdminReturnContext} from './AdminReturnContext';
type Scope='CUSTOMER'|'STORE'|'ADMIN';
export function ReturnsPage({scope}:{scope:Scope}){
  const {session}=useAuth(),cache=useQueryClient(),[page,setPage]=useState(1),[error,setError]=useState<unknown>(),[busy,setBusy]=useState('');
  const member=session?.context?.store_membership;
  const allowed=scope==='CUSTOMER'?!!session?.context?.roles.includes('CUSTOMER'):scope==='ADMIN'?!!session?.context?.role_permissions?.includes('platform.admin'):!!member&&(member.role==='OWNER'||!!member.permissions?.includes('order.store.read_status_cancel'));
  const [polling,setPolling]=useState(true);
  useEffect(()=>{if(!polling)return;const timer=setTimeout(()=>setPolling(false),60000);return()=>clearTimeout(timer);},[polling]);
  const query=useQuery({refetchInterval:q=>polling&&q.state.data?.items.some(row=>row.status==='RECEIVED'||row.status==='APPROVED'&&row.conversion_status==='PROPOSED')?3000:false,queryKey:['return-requests',scope,page],enabled:allowed,refetchOnWindowFocus:false,queryFn:()=>scope==='CUSTOMER'?callOperation('listOwnReturnRequests',{query:{page,size:20}}):scope==='STORE'?callOperation('listStoreReturnRequests',{query:{page,size:20}}):callOperation('listAdminReturnRequests',{query:{page,size:20}})});
  const parties=useAdminParties(query.data?.items.map(r=>r.admin_context?.store_id)??[],query.data?.items.map(r=>r.admin_context?.customer_user_id)??[],scope==='ADMIN'&&allowed&&!query.error);
  async function confirm(request:ReturnRequest){
    if(busy)return;setBusy(request.id);setError(undefined);
    try{await callOperation('confirmExchangeReceived',{path:{id:request.id},body:{expected_version:request.version}});await Promise.all([cache.invalidateQueries({queryKey:['return-requests']}),cache.invalidateQueries({queryKey:['notifications']})]);}
    catch(e){setError(e);if(e instanceof ApiError&&e.status===409)await query.refetch();}finally{setBusy('');}
  }
  if(!allowed)return <ErrorView error={new ApiError(403,'FORBIDDEN','Bạn chưa có quyền xử lý đổi trả.')}/>;
  return <section><h1>{scope==='CUSTOMER'?'Yêu cầu đổi trả của tôi':'Quản lý yêu cầu đổi trả'}</h1>{query.isLoading&&<Loading/>}{query.error&&<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>}{error!==undefined&&<ErrorView error={error}/>}
    {scope==='ADMIN'&&parties.error&&<ErrorView error={parties.error} onRetry={()=>void parties.refetch()}/>}{query.data&&!query.error&&<>{!query.data.items.length&&<Empty>Chưa có yêu cầu đổi trả ở trang này.</Empty>}{query.data.items.map(request=><ReturnRequestView key={request.id} request={request} scope={scope} showOrderLink={scope==='CUSTOMER'} context={scope==='ADMIN'?<AdminReturnContext request={request} parties={parties}/>:undefined}>{scope==='CUSTOMER'&&request.type==='EXCHANGE'&&request.status==='EXCHANGE_SENT'&&<button disabled={!!busy} onClick={()=>void confirm(request)}>Xác nhận đã nhận hàng đổi</button>}{(scope!=='ADMIN'||!!request.admin_context&&parties.stores.has(request.admin_context.store_id)&&parties.users.has(request.admin_context.customer_user_id)&&!parties.isFetching)&&<ReturnActions key={request.id} request={request} scope={scope} refresh={async()=>{await cache.invalidateQueries({queryKey:['return-requests']},{throwOnError:true});}}/>}</ReturnRequestView>)}<Pagination page={page} size={query.data.size} total={query.data.total} onPage={setPage}/></>}
    <button disabled={query.isFetching} onClick={()=>{setPolling(true);void query.refetch();}}>Làm mới yêu cầu</button>{!polling&&<p>Đã dừng tự làm mới sau 60 giây; có thể đọc lại thủ công.</p>}
  </section>;
}
