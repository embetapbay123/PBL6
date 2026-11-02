import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import {callOperation} from '../../api/operations';

/** Exact bounded directory reads, one request per entity kind for the whole visible page. */
export function useAdminParties(storeIds:(string|undefined)[],userIds:(string|undefined)[]=[],enabled=true){
 const {session}=useAuth(),allowed=enabled&&!!session?.context?.roles.includes('ADMIN')&&!!session.context.role_permissions?.includes('platform.admin');
 const stores=[...new Set(storeIds.filter((id):id is string=>!!id))].sort(),users=[...new Set(userIds.filter((id):id is string=>!!id))].sort();
 const query=useQuery({queryKey:['admin-parties',stores,users],enabled:allowed&&(stores.length>0||users.length>0),retry:false,refetchOnWindowFocus:false,queryFn:async({signal})=>{
  if(stores.length>100||users.length>100)throw new ApiError(422,'IDENTITY_BATCH_LIMIT','Trang hiện tại có quá nhiều đối tượng để đối chiếu trong một lượt.');
  const [storeRows,userRows]=await Promise.all([stores.length?callOperation('listStores',{query:{page:1,size:100,ids:stores.join(',')}},{signal}):Promise.resolve({items:[],total:0}),users.length?callOperation('listUsers',{query:{page:1,size:100,ids:users.join(',')}},{signal}):Promise.resolve({items:[],total:0})]);
  for(const [result,ids]of [[storeRows,stores],[userRows,users]]as const)if(result.total!==result.items.length||result.items.some(row=>!ids.includes(row.id))||new Set(result.items.map(row=>row.id)).size!==result.items.length)throw new ApiError(503,'IDENTITY_READ_INCOMPLETE','Kết quả danh tính chưa đầy đủ hoặc sai phạm vi. Đọc lại trước khi quyết định.');
  return {stores:storeRows.items,users:userRows.items};
 }});
 const data=allowed&&!query.error?query.data:undefined;
 return {...query,stores:new Map(data?.stores.map(row=>[row.id,row])??[]),users:new Map(data?.users.map(row=>[row.id,row])??[])};
}
export function AdminStoreIdentity({id,parties}:{id?:string;parties:ReturnType<typeof useAdminParties>}){
 const store=id?parties.stores.get(id):undefined;
 return <div>{store?<><Link to={'/admin?tab=stores&q='+encodeURIComponent(store.id)}>{store.name}</Link><p>{store.status==='LOCKED'?'Đã khóa':'Đang hoạt động'} · Tên/trạng thái Store hiện tại</p></>:<p>{parties.error?'Chưa đọc được danh tính Store':parties.isFetching?'Đang đối chiếu Store…':'Chưa có dữ liệu danh tính Store; không tự suy từ món hàng'}</p>}{id&&<small style={{overflowWrap:'anywhere'}}>Mã Store: {id}</small>}</div>;
}
export function AdminCustomerIdentity({id,parties}:{id?:string;parties:ReturnType<typeof useAdminParties>}){
 const user=id?parties.users.get(id):undefined;
 return <div>{user?<><Link to={'/admin?tab=users&q='+encodeURIComponent(user.id)}>{user.display_name||user.email}</Link><p>{user.email} · {user.status==='LOCKED'?'Đã khóa':'Đang hoạt động'} · Tài khoản hiện tại</p></>:<p>{parties.error?'Chưa đọc được danh tính khách':parties.isFetching?'Đang đối chiếu khách…':'Chưa có dữ liệu danh tính khách; giữ mã đơn để đối chiếu'}</p>}{id&&<small style={{overflowWrap:'anywhere'}}>Mã khách: {id}</small>}</div>;
}
