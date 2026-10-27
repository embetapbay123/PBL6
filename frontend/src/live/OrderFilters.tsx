import { FormEvent,useState } from 'react';
import type { OperationInputs } from '../api/operations.generated';
import { orderLabel } from './OrderFacts';
export type OrderQuery=Pick<OperationInputs['listOwnOrders']['query'],'q'|'status'|'from'|'to'>;
export const orderCode=(id:string)=>'PBL-'+id.replace(/-/g,'').slice(-8).toUpperCase();
export function OrderFilters({apply}:{apply:(query:OrderQuery)=>void}){
  const [q,setQ]=useState(''),[status,setStatus]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[error,setError]=useState('');
  function submit(event:FormEvent){
    event.preventDefault();setError('');
    if(from&&to&&from>to){setError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');return}
    if(q.trim()&&!/^[0-9a-f]{8,32}$/i.test(q.trim().replace(/^PBL-/i,'').replace(/-/g,''))){setError('Nhập mã đơn hoặc ít nhất 8 ký tự của UUID.');return}
    const end=to?new Date(to+'T00:00:00'):undefined;if(end)end.setDate(end.getDate()+1);
    apply({...(q.trim()?{q:q.trim().toUpperCase()}:{}),...(status?{status:status as OrderQuery['status']}:{}),...(from?{from:new Date(from+'T00:00:00').toISOString()}:{}),...(end?{to:end.toISOString()}:{} )});
  }
  return <form className="boot-card" onSubmit={submit} aria-label="Bộ lọc đơn hàng">
    <div className="market-form-grid">
      <label>Mã đơn<input value={q} onChange={e=>setQ(e.target.value)} placeholder="PBL-12345678 hoặc UUID" maxLength={40}/></label>
      <label>Trạng thái đơn<select aria-label="Trạng thái đơn" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(orderLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Ngày tạo từ<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>Đến ngày (bao gồm)<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
    </div>
    {error&&<p role="alert">{error}</p>}
    <button type="submit">Lọc đơn hàng</button>
    <button type="button" onClick={()=>{setQ('');setStatus('');setFrom('');setTo('');setError('');apply({})}}>Xóa bộ lọc</button>
  </form>;
}
