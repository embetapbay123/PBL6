import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView} from '../../bootstrap/components';

type Pickup=OperationOutputs['listShippingLocations']['items'][number];
export function PlatformPickupEditor({location,done}:{location?:Pickup;done:()=>Promise<unknown>}){
  const [id]=useState(()=>location?.id??crypto.randomUUID());
  const [store,setStore]=useState(location?.store_id??'');
  const [name,setName]=useState(location?.name??'');
  const [enabled,setEnabled]=useState(location?.enabled??true);
  const [address,setAddress]=useState(location?.address??{recipient_name:'',phone:'',line1:'',ward:'',district:'',city:''});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<unknown>();
  const stores=useQuery({queryKey:['shipping-store-options'],queryFn:({signal})=>callOperation('listStores',{query:{page:1,size:100}},{signal})});
  const fields=[['recipient_name','Người bàn giao'],['phone','Điện thoại'],['line1','Địa chỉ kho'],['city','Tỉnh / thành phố'],['ward','Phường / xã'],['district','Quận / huyện']] as const;
  return <form onSubmit={async event=>{
    event.preventDefault();if(busy)return;
    setBusy(true);setError(undefined);
    try{await callOperation('savePlatformPickup',{body:{id,store_id:store,name,address,enabled,expected_version:location?.version??0}});await done();}
    catch(cause){setError(cause);}finally{setBusy(false);}
  }}>
    <label>Cửa hàng<select required value={store} disabled={busy||!!location} onChange={event=>setStore(event.target.value)}><option value="">Chọn cửa hàng</option>{stores.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}{location&&!stores.data?.items.some(item=>item.id===store)&&<option value={store}>{store}</option>}</select></label>
    <label>Tên kho<input required maxLength={200} value={name} disabled={busy} onChange={event=>setName(event.target.value)}/></label>
    <div className="shipping-fields">{fields.map(([key,label])=><label key={key}>{label}<input required={key!=='district'} maxLength={key==='line1'?500:key==='phone'?20:200} value={address[key]??''} disabled={busy} onChange={event=>setAddress({...address,[key]:event.target.value})}/></label>)}</div>
    <label><span><input type="checkbox" checked={enabled} disabled={busy} onChange={event=>setEnabled(event.target.checked)}/> Dùng PBL6 Delivery cho đơn mới của cửa hàng</span></label>
    {stores.error&&<ErrorView error={stores.error}/>}{error!=null&&<ErrorView error={error}/>}
    <button disabled={busy||!store}>{busy?'Đang lưu…':'Lưu kho PBL6'}</button>
  </form>;
}
