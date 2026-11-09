import {useRef,useState} from 'react';
import {callOperation} from '../../api/operations';
import {ErrorView} from '../../bootstrap/components';
import type {Shipment} from './ShippingPanel';

export function ExchangeReceiptForm({shipment,admin,refresh}:{shipment:Shipment;admin:boolean;refresh:()=>Promise<unknown>}){
  const [lines,setLines]=useState(()=>(shipment.exchange_items??[]).map(i=>({variant_id:i.variant_id,received_quantity:0,resellable_quantity:0,damaged_quantity:0})));
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  const operation=useRef<string|undefined>(undefined);
  return <details><summary>Kiểm kiện đổi</summary><form className="shipping-booking" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError(undefined);operation.current??=crypto.randomUUID();try{
    await callOperation(admin?'adminInspectExchangeReturn':'storeInspectExchangeReturn',{path:{id:shipment.id},body:{operation_id:operation.current,expected_version:shipment.version,lines,note}});await refresh();
  }catch(cause){setError(cause);}finally{setBusy(false);}}}>
    <p>Kiểm số thực nhận. Chỉ hàng bán lại được mới cộng tồn.</p>
    {lines.map((line,index)=>{const item=shipment.exchange_items![index];return <fieldset key={line.variant_id} disabled={busy}><legend>{item.name} · Đã gửi {item.quantity}</legend><div className="shipping-dimensions">{[['received_quantity','Thực nhận'],['resellable_quantity','Bán lại được'],['damaged_quantity','Hỏng']] .map(([field,label])=><label key={field}>{label}<input type="number" required min={0} max={item.quantity} step={1} value={line[field as keyof typeof line]} onChange={e=>{setLines(lines.map((v,i)=>i===index?{...v,[field]:Number(e.target.value)}:v));operation.current=undefined;}}/></label>)}</div></fieldset>;})}
    <label>Kết quả kiểm hàng<textarea required maxLength={2000} value={note} disabled={busy} onChange={e=>{setNote(e.target.value);operation.current=undefined;}}/></label>
    {error!=null&&<ErrorView error={error}/>}<button disabled={busy||!lines.length}>Lưu kiểm hàng</button>
  </form></details>;
}
