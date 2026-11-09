import {useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ExchangeReceiptForm} from './ExchangeReceiptForm';
import {useAuth} from '../../api/auth-context';
import {ErrorView,Loading} from '../../bootstrap/components';
import './shipping.css';

export type Shipment=OperationOutputs['getStoreShipping']['items'][number];
export const shippingLabels:Record<string,string>={CREATING:'Đang tạo vận đơn',CREATE_UNKNOWN:'Đang xác minh vận đơn',CREATE_FAILED:'Chưa tạo được vận đơn',READY_FOR_PICKUP:'Chờ lấy hàng',PICKED_UP:'Đã lấy hàng',IN_TRANSIT:'Đang vận chuyển',OUT_FOR_DELIVERY:'Đang giao',DELIVERY_ATTEMPT_FAILED:'Giao chưa thành công',DELIVERED:'Đã giao',RETURN_PENDING:'Chờ quyết định giao lại',RETURNING:'Đang chuyển hoàn',RETURN_ATTEMPT_FAILED:'Chưa giao được hàng hoàn',RETURNED:'Đã giao trả về kho',CANCELLED:'Đã hủy vận đơn',EXCEPTION:'Cần hỗ trợ',MANUAL_IN_TRANSIT:'Khách đã gửi trả',MANUAL_RECEIVED:'Đã nhận hàng trả'};
const legLabels:Record<string,string>={OUTBOUND:'Giao hàng',EXCHANGE_OUTBOUND:'Gửi hàng đổi',CUSTOMER_RETURN:'Gửi trả hàng'};
export function shipmentStatusLabel(leg:string,status:string){
  if(leg==='CUSTOMER_RETURN'){
    if(status==='RETURNED')return 'Đã trả lại khách';
    if(status==='RETURNING')return 'Đang trả lại khách';
    if(status==='RETURN_ATTEMPT_FAILED')return 'Chưa trả lại được cho khách';
  }
  return shippingLabels[status]??'Đang cập nhật';
}
const date=(value:string)=>new Date(value).toLocaleString('vi-VN');
const money=(value:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
export function ShippingTimeline({shipment}:{shipment:OperationOutputs['getOwnShipping']['items'][number]}){
  return <article className="shipping-card">
    <div className="shipping-title"><strong>{legLabels[shipment.leg]}</strong><span className="shipping-status">{shipmentStatusLabel(shipment.leg,shipment.status)}</span></div>
    <p>{shipment.provider==='PLATFORM'?'PBL6 Delivery':shipment.provider==='GHN'?'GHN':'Hãng do khách tự gửi'}{shipment.tracking_code&&<> · <strong>{shipment.tracking_code}</strong></>}</p>
    {shipment.expected_delivery_at&&!['DELIVERED','RETURNED','CANCELLED'].includes(shipment.status)&&<p>Dự kiến giao {date(shipment.expected_delivery_at)}</p>}
    {shipment.events.length>0&&<details><summary>Xem hành trình ({shipment.events.length})</summary><ol className="shipping-timeline">{shipment.events.map((e,i)=><li key={i}><span>{shipmentStatusLabel(shipment.leg,e.status)}</span><time dateTime={e.occurred_at}>{date(e.occurred_at)}</time></li>)}</ol></details>}
  </article>;
}
export function ShipmentControls({shipment,admin=false,refresh}:{shipment:Shipment;admin?:boolean;refresh:()=>Promise<unknown>}){
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[label,setLabel]=useState(''),[reference,setReference]=useState('');
  const inFlight=useRef(false);
  async function run(action:()=>Promise<unknown>){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError(undefined);try{await action();await refresh();}catch(e){setError(e);await refresh().catch(()=>{});}finally{inFlight.current=false;setBusy(false);}}
  const command=(kind:'CANCEL'|'REDELIVER'|'RETURN')=>run(()=>callOperation(admin?'adminShippingCommand':'storeShippingCommand',{path:{id:shipment.id},body:{operation_id:crypto.randomUUID(),expected_version:shipment.version,kind}}));
  const pending=!!shipment.pending_command;
  const managed=['GHN','PLATFORM'].includes(shipment.provider);
  const canRedeliver=shipment.provider==='PLATFORM'?shipment.status==='DELIVERY_ATTEMPT_FAILED':shipment.provider==='GHN'&&['storing','waiting_to_return'].includes(shipment.provider_status??'');
  const canReturn=shipment.provider==='PLATFORM'?shipment.status==='DELIVERY_ATTEMPT_FAILED':shipment.provider==='GHN'&&['delivery_fail','storing','waiting_to_return'].includes(shipment.provider_status??'');
  return <div className="shipping-controls">
    {shipment.provider==='PLATFORM'&&admin&&<p><a href="/delivery/ops" target="_blank" rel="noopener noreferrer">Mở cổng điều phối Delivery ↗</a></p>}
    {shipment.last_error&&<p role="status">{shipment.status==='CREATE_FAILED'?'Chưa tạo được kiện. Hủy yêu cầu lỗi để sửa và đặt lại.':shipment.last_error==='EXCHANGE_RETURN_RECONCILIATION_REQUIRED'?'Cần kiểm tra kiện đổi đã hoàn về.':'Đang kiểm tra vận đơn với hãng.'}</p>}
    {pending&&<p role="status">{shipment.pending_command_status==='UNKNOWN'?'Đang xác minh kết quả với hãng.':'Đang gửi yêu cầu tới hãng.'}</p>}
    {shipment.status==='DELIVERED'&&shipment.cod_vnd>0&&!shipment.cod_collected_at&&<p role="status">Đã giao · Chờ nền tảng xác nhận thu hộ {money(shipment.cod_vnd)}</p>}
    <div className="ui-actions">
      {shipment.label_available&&<button disabled={busy} onClick={()=>void run(async()=>{const result=await callOperation(admin?'adminShippingLabel':'storeShippingLabel',{path:{id:shipment.id}});setLabel(result.url);})}>Lấy nhãn</button>}
      {label&&<a href={label} target="_blank" rel="noopener noreferrer">In nhãn</a>}
      {managed&&['READY_FOR_PICKUP','CREATE_FAILED'].includes(shipment.status)&&<button disabled={busy||pending} onClick={()=>void command('CANCEL')}>{shipment.status==='CREATE_FAILED'?'Hủy yêu cầu':'Hủy lịch'}</button>}
      {canRedeliver&&<button disabled={busy||pending} onClick={()=>void command('REDELIVER')}>Giao lại</button>}
      {canReturn&&<button disabled={busy||pending} onClick={()=>void command('RETURN')}>Chuyển hoàn</button>}
    </div>
    {admin&&shipment.provider==='GHN'&&shipment.status==='DELIVERED'&&shipment.cod_vnd>0&&!shipment.cod_collected_at&&<details><summary>Đối soát thu hộ</summary><form onSubmit={e=>{e.preventDefault();void run(()=>callOperation('confirmShippingCod',{path:{id:shipment.id},body:{operation_id:crypto.randomUUID(),expected_version:shipment.version,amount_vnd:shipment.cod_vnd,reference}}));}}><label>Tham chiếu biên nhận thu đủ {money(shipment.cod_vnd)}<input required maxLength={200} value={reference} onChange={e=>setReference(e.target.value)} /></label><button disabled={busy||!reference.trim()}>Xác nhận COD</button></form></details>}
    {shipment.leg==='EXCHANGE_OUTBOUND'&&shipment.status==='RETURNED'&&(shipment.exchange_receipt_status?<p>{shipment.exchange_receipt_status==='APPLIED'?'Đã đối soát kiện đổi. Chờ khách phản hồi đề nghị hoàn tiền.':'Đang đối chiếu tồn của kiện đổi.'}</p>:<ExchangeReceiptForm shipment={shipment} admin={admin} refresh={refresh}/>)}
    {error!=null&&<ErrorView error={error}/>}
  </div>;
}
const parcelPresets = {
  small: {label:'Hàng nhỏ',weight:500,length:20,width:15,height:8},
  large: {label:'Hàng to',weight:5000,length:50,width:35,height:30},
};

function BookingForm({order,locations,returnRequestId,onBooked}:{order:OperationOutputs['getStoreOrder'];locations:OperationOutputs['getStoreShipping']['locations'];returnRequestId?:string;onBooked:()=>Promise<unknown>}){
  const [pickup,setPickup]=useState(locations[0]?.id??''),[weight,setWeight]=useState(''),[length,setLength]=useState(''),[width,setWidth]=useState(''),[height,setHeight]=useState(''),[note,setNote]=useState('');
  const [size,setSize]=useState<keyof typeof parcelPresets>();
  const [fragile,setFragile]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  const operation=useRef<string|undefined>(undefined),inFlight=useRef(false);
  const delivery=order.shipping_mode==='PLATFORM';
  const selectedPickup=locations.find(location=>location.id===pickup);
  async function book(){
    if(inFlight.current||!selectedPickup||(delivery&&!size))return;
    const parcel=size?parcelPresets[size]:{weight:Number(weight),length:Number(length),width:Number(width),height:Number(height)};
    inFlight.current=true;
    setBusy(true);
    setError(undefined);
    operation.current??=crypto.randomUUID();
    try{
      await callOperation('bookStoreShipment',{path:{id:order.id},body:{
        operation_id:operation.current,expected_order_version:order.version,pickup_location_id:pickup,
        weight:parcel.weight,length:parcel.length,width:parcel.width,height:parcel.height,
        note:delivery?(fragile?'Hàng dễ vỡ':''):note,
        ...(returnRequestId?{return_request_id:returnRequestId}:{}),
      }});
      await onBooked();
    }catch(cause){setError(cause);}finally{setBusy(false);inFlight.current=false;}
  }
  return <form className="shipping-booking" onSubmit={e=>{e.preventDefault();void book();}}>
    <h3>{returnRequestId?'Kiện hàng đổi':'Thông tin kiện hàng'}</h3>
    {delivery&&locations.length===1?<small className="shipping-muted">{locations[0].name}</small>:
      <label>Kho lấy hàng<select required value={pickup} disabled={busy} onChange={e=>{setPickup(e.target.value);operation.current=undefined;}}><option value="" disabled>Chọn kho</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
    {delivery?<fieldset className="shipping-parcel-options" disabled={busy}>
      <legend>Cỡ kiện</legend>
      <div className="shipping-parcel-sizes">
        {(Object.keys(parcelPresets) as Array<keyof typeof parcelPresets>).map(value=>{
          const {label,weight,length,width,height}=parcelPresets[value];
          return <label key={value}>
            <input type="radio" name="parcel-size" required checked={size===value} aria-label={label} aria-describedby={`parcel-specs-${order.id}-${value}`} onChange={()=>{setSize(value);operation.current=undefined;}}/>
            <span>{label}<br/><small id={`parcel-specs-${order.id}-${value}`}>{weight.toLocaleString('vi-VN')} g · {length} × {width} × {height} cm</small></span>
          </label>;
        })}
      </div>
      <label className="shipping-fragile">
        <input type="checkbox" checked={fragile} onChange={e=>{setFragile(e.target.checked);operation.current=undefined;}}/>
        Dễ vỡ
      </label>
    </fieldset>:<>
      <div className="shipping-dimensions">{[['Khối lượng (g)',weight,setWeight,19999],['Dài (cm)',length,setLength,200],['Rộng (cm)',width,setWidth,200],['Cao (cm)',height,setHeight,200]].map(([label,value,set,max])=><label key={String(label)}>{String(label)}<input type="number" inputMode="numeric" required min={1} max={Number(max)} step={1} value={String(value)} disabled={busy} onChange={e=>{(set as (v:string)=>void)(e.target.value);operation.current=undefined;}}/></label>)}</div>
      <details><summary>Ghi chú lấy hàng</summary><label>Lời nhắn cho tài xế<input maxLength={500} value={note} disabled={busy} onChange={e=>{setNote(e.target.value);operation.current=undefined;}}/></label></details>
      <small className="shipping-muted">Một kiện dưới 20 kg.</small>
    </>}
    {error!=null&&<ErrorView error={error}/>}
    <button disabled={busy||!selectedPickup||(delivery&&!size)}>{busy?'Đang đặt lịch…':delivery?'Gọi Delivery':'Đặt lịch'}</button>
  </form>;
}
export function StoreShippingPanel({order,onChanged,returnRequestId,exchangeReady=false}:{order:OperationOutputs['getStoreOrder'];onChanged:()=>Promise<unknown>;returnRequestId?:string;exchangeReady?:boolean}){
  const {session}=useAuth();
  const query=useQuery({queryKey:['store-shipping',session?.context?.user_id,order.store_id,order.id,order.version],queryFn:({signal})=>callOperation('getStoreShipping',{path:{id:order.id}},{signal}),enabled:['GHN','PLATFORM'].includes(order.shipping_mode??''),refetchInterval:15000});
  if(!['GHN','PLATFORM'].includes(order.shipping_mode??''))return null;
  if(query.error)return <ErrorView error={query.error} onRetry={()=>void query.refetch()}/>;
  if(!query.data)return <Loading/>;
  const relevant=query.data.items.filter(s=>returnRequestId?s.return_request_id===returnRequestId:s.leg==='OUTBOUND');
  const active=relevant.some(s=>s.status!=='CANCELLED'&&s.leg===(returnRequestId?'EXCHANGE_OUTBOUND':'OUTBOUND'));
  const refresh=async()=>{await query.refetch();await onChanged();};
  return <section className="shipping-panel" aria-label="Giao hàng qua nền tảng">
    <h3>Giao hàng qua nền tảng</h3>
    {!returnRequestId&&order.shipping_mode==='PLATFORM'&&<>
      <p><a href="/delivery/ops" target="_blank" rel="noopener noreferrer">Delivery ↗</a></p>
      {['PENDING','CONFIRMED'].includes(order.status)&&<p className="shipping-muted">Chuẩn bị hàng, sau đó gọi Delivery lấy kiện.</p>}
      {relevant.some(s=>s.status==='READY_FOR_PICKUP')&&<p role="status">Chờ Delivery lấy hàng.</p>}
    </>}
    {relevant.map(s=><div key={s.id}><ShippingTimeline shipment={s}/><ShipmentControls shipment={s} refresh={refresh}/></div>)}
    {!active&&(returnRequestId?exchangeReady:order.status==='PROCESSING')&&(query.data.booking_enabled&&query.data.locations.length>0?<BookingForm key={order.version} order={order} locations={query.data.locations} returnRequestId={returnRequestId} onBooked={refresh}/>:<p role="status">Chưa thể đặt lịch. Nhờ quản trị bật kho và kết nối vận chuyển.</p>)}
  </section>;
}
export function CustomerShippingPanel({orderId}:{orderId:string}){
  const {session}=useAuth();
  const query=useQuery({queryKey:['own-shipping',session?.context?.user_id,orderId],queryFn:({signal})=>callOperation('getOwnShipping',{path:{id:orderId}},{signal}),refetchInterval:30000});
  if(query.error)return <ErrorView error={query.error} onRetry={()=>void query.refetch()}/>;
  if(!query.data)return <Loading/>;
  if(!query.data.items.length)return query.data.mode!=='LEGACY_MANUAL'?<p>Chờ cửa hàng đặt lịch giao hàng.</p>:null;
  return <section className="shipping-panel" aria-label="Hành trình giao hàng"><h2>Hành trình giao hàng</h2>{query.data.items.map(s=><ShippingTimeline key={s.id} shipment={s}/>)}</section>;
}
