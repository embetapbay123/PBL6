import {Button as UiButton} from '../components/ui/Button';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Store} from 'lucide-react';
import {callOperation} from '../api/operations';
import {useRef} from 'react';
export function StoreLabel({id,prefix='',className='cart-store-label'}:{id:string;prefix?:string;className?:string}){
 const link=useRef<HTMLAnchorElement>(null),query=useQuery({queryKey:['public-store',id],queryFn:()=>callOperation('getPublicStore',{path:{id}}),retry:false});
 const failed=query.isError||!query.isPending&&!query.data?.name?.trim();
 return <>
  <Link ref={link} className={className} to={'/stores/'+id} aria-busy={query.isFetching}><Store size={18}/>{prefix}{failed?'Chưa đọc được tên gian hàng':query.data?.name??'Đang tải gian hàng…'}</Link>
  {failed&&<UiButton type="button" variant="secondary" aria-label="Đọc lại tên gian hàng" disabled={query.isFetching} onClick={async event=>{
   const trigger=event.currentTarget,result=await query.refetch();
   if(!result.error&&(document.activeElement===trigger||document.activeElement===document.body&&!trigger.isConnected))link.current?.focus();
  }}>Thử lại tên gian hàng</UiButton>}
 </>;
}
