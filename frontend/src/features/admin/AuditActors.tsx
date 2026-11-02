import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import {Link} from 'react-router-dom';
import type {OperationOutputs} from '../../api/operations.generated';
type Account=OperationOutputs['lookupAdminAuditActors']['users'][number];
const system='00000000-0000-0000-0000-000000000000';
export function useAuditActorLabels(scope:'STORE'|'ADMIN',ids:(string|undefined)[]){
 const unique=[...new Set(ids.filter((id):id is string=>!!id&&id!==system))].sort();
 const query=useQuery({queryKey:['audit-actors',scope,unique],enabled:unique.length>0,queryFn:()=>scope==='STORE'?callOperation('lookupStoreAuditActors',{body:{user_ids:unique}}):callOperation('lookupAdminAuditActors',{body:{user_ids:unique}})});
 const data=query.error?undefined:query.data;
 return {...query,labels:new Map(data?.users.map(row=>[row.id,row.label])??[]),accounts:new Map<string,Account>(data?.users.map(row=>[row.id,row])??[])};
}
export function AuditActor({id,labels,loading,error,admin=false,accounts}:{id?:string;labels:Map<string,string>;loading:boolean;error:unknown;admin?:boolean;accounts?:Map<string,Account>}){
 if(!id)return <span>Chưa có thông tin người thực hiện</span>;
 if(id===system)return <span>Hệ thống</span>;
 const label=labels.get(id),account=admin?accounts?.get(id):undefined;
 return <span>{admin&&label?<Link to={'/admin?tab=users&q='+encodeURIComponent(id)}>{label}</Link>:label??(loading?'Đang đọc nhãn tài khoản…':error?'Chưa đọc được nhãn tài khoản':'Chưa có nhãn tài khoản trong phạm vi này')}{account?.email&&<><br/>{account.email}</>}{account?.status&&<><br/>{account.status==='LOCKED'?'Đã khóa':'Đang hoạt động'}</>}<br/><small style={{overflowWrap:'anywhere'}}>{id}</small>{admin&&!label&&<><br/><Link to={'/admin?tab=users&q='+encodeURIComponent(id)}>Tra theo mã tài khoản</Link></>}</span>;
}
