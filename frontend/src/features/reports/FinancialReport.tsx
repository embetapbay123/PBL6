import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';

type Scope='STORE'|'ADMIN';
type Summary=Pick<OperationOutputs['getStoreReport'],'period_start'|'period_end'|'order_value_vnd'|'completed_goods_revenue_vnd'|'collected_vnd'|'refunded_vnd'|'shipping_fee_vnd'|'order_count'>&Partial<Pick<OperationOutputs['getStoreReport'],'store_id'|'timezone'|'unresolved_collected_vnd'|'unresolved_refunded_vnd'|'cash_series'|'low_stock_variant_ids'|'revenue_series'>>;
const money=(value:number)=>value.toLocaleString('vi-VN')+' ₫';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
function day(value:Date){const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).map(part=>[part.type,part.value]));return parts.year+'-'+parts.month+'-'+parts.day;}
function dateValid(value:string){return /^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
const sources:Record<string,string>={OWNER_ATTESTED:'Thời điểm biên nhận do Owner xác nhận thủ công; không phải ngân hàng kiểm chứng',SYSTEM_RECEIVED:'Thời điểm hệ thống tiếp nhận; chưa có timestamp giao dịch được provider xác minh',SYSTEM_CONFIRMED:'Thời điểm hệ thống xác nhận giao dịch'};
const countLabels={order_count:'Số đơn tạo trong kỳ',order_value_vnd:'Giá trị đơn tạo trong kỳ',completed_goods_revenue_vnd:'Giá trị hàng hoàn tất của đơn tạo trong kỳ',shipping_fee_vnd:'Phí giao của đơn tạo trong kỳ',collected_vnd:'Tiền xác nhận thu trong kỳ',refunded_vnd:'Tiền xác nhận hoàn trong kỳ'} as const;

export function FinancialReport({scope='STORE'}:{scope?:Scope}){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),context=session?.context,cache=useQueryClient();
 const [reading,setReading]=useState(false),flight=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const allowed=scope==='ADMIN'?!!context?.roles.includes('ADMIN')&&!!context.role_permissions?.includes('platform.admin'):!!context?.roles.includes('STORE_OWNER')&&context.store_membership?.role==='OWNER'&&context.store_membership.status==='ACTIVE';
 const today=day(new Date()),tomorrow=day(new Date(Date.now()+86400000));
 const from=params.get('from')??today.slice(0,7)+'-01',to=params.get('to')??tomorrow,store=scope==='ADMIN'?params.get('store_id')??'':'';
 const granularity=params.get('granularity')==='MONTH'?'MONTH':'DAY';
 const [draftFrom,setFrom]=useState(from),[draftTo,setTo]=useState(to),[draftStore,setStore]=useState(store),[draftUnit,setUnit]=useState(granularity),[showGaps,setShowGaps]=useState(false);
 useEffect(()=>{setFrom(from);setTo(to);setStore(store);setUnit(granularity);},[from,to,store,granularity]);
 const valid=dateValid(from)&&dateValid(to)&&from<to&&(!store||uuid.test(store));
 const period:{from:string;to:string;granularity:'DAY'|'MONTH'}={from:from+'T00:00:00+07:00',to:to+'T00:00:00+07:00',granularity};
 const query=useQuery<Summary>({queryKey:['financial-report',scope,period,store],staleTime:0,enabled:allowed&&valid,queryFn:async({signal})=>scope==='ADMIN'?callOperation('getPlatformMoneyReport',{query:{...period,...(store?{store_id:store}:{})}},{signal}):callOperation('getStoreReport',{query:period},{signal})});
 async function reload(){
  if(flight.current||!allowed||!valid)return;flight.current=true;setReading(true);
  try{await cache.refetchQueries({type:'active',predicate:q=>['financial-report','report-money-entries','report-unresolved'].includes(String(q.queryKey[0]))});}
  finally{flight.current=false;if(alive.current)setReading(false);}
 }
 if(!allowed)return <ErrorView error={new ApiError(403,'FORBIDDEN',scope==='ADMIN'?'Cần quyền quản trị báo cáo.':'Báo cáo dành cho Owner hiện hành.')}/>;
 return <section><h1>{scope==='ADMIN'?'Báo cáo thu / hoàn toàn sàn':'Báo cáo gian hàng'}</h1><p>Kỳ theo giờ Việt Nam (Asia/Ho_Chi_Minh): gồm đầu ngày bắt đầu, không gồm đầu ngày kết thúc. Thu / hoàn tính theo sự kiện tiền đã xác nhận, độc lập ngày tạo đơn. Giá trị đơn và hàng hoàn tất là nhóm đơn tạo trong kỳ; các số này không phải lợi nhuận hoặc tiền chi trả Owner.</p>
  <button type="button" disabled={!valid||reading||query.isFetching} onClick={()=>void reload()}>Đọc lại báo cáo</button>{reading&&<p role="status">Đang đọc lại tổng hợp và các danh sách đang mở…</p>}
  <form className="market-form-grid" onSubmit={event=>{event.preventDefault();if(reading||!dateValid(draftFrom)||!dateValid(draftTo)||draftFrom>=draftTo||draftStore&&!uuid.test(draftStore))return;if(draftFrom===from&&draftTo===to&&draftStore===store&&draftUnit===granularity){void reload();return;}setParams(current=>{const next=new URLSearchParams(current);next.set('from',draftFrom);next.set('to',draftTo);next.set('granularity',draftUnit);if(scope==='ADMIN'){draftStore?next.set('store_id',draftStore):next.delete('store_id');}next.delete('money_page');next.delete('gap_page');return next;});}}>
   <label>Từ ngày (bao gồm)<input required type="date" value={draftFrom} max={draftTo||undefined} onChange={event=>setFrom(event.target.value)}/></label><label>Đến trước ngày (không bao gồm)<input required type="date" value={draftTo} min={draftFrom||undefined} onChange={event=>setTo(event.target.value)}/></label><label>Nhóm theo<select value={draftUnit} onChange={event=>setUnit(event.target.value as 'DAY'|'MONTH')}><option value="DAY">Ngày</option><option value="MONTH">Tháng</option></select></label>
   {scope==='ADMIN'&&<label>Mã Store (để trống xem toàn sàn)<input value={draftStore} maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" onChange={event=>setStore(event.target.value.trim())}/></label>}<button disabled={reading||!dateValid(draftFrom)||!dateValid(draftTo)||draftFrom>=draftTo||!!draftStore&&!uuid.test(draftStore)}>Xem báo cáo</button>
  </form>
  {!valid?<p role="alert">Cần khoảng ngày hợp lệ với ngày bắt đầu trước ngày kết thúc và mã Store đúng định dạng.</p>:query.error?<ErrorView error={query.error} onRetry={()=>void reload()} retryBusy={reading}/>:query.isPending?<Loading/>:query.data&&<>
   <p role="status">Phạm vi: {scope==='STORE'?context?.store_membership?.store_id:store||'Toàn sàn'} · {from} đến trước {to} · giờ Việt Nam</p>
   <p>Tổng hợp được đọc lúc {time(new Date(query.dataUpdatedAt).toISOString())} (giờ Việt Nam). Giao dịch mới có thể làm thay đổi dữ liệu; đọc lại toàn bộ báo cáo trước khi đối chiếu.</p>
   <dl className="financial-summary">{Object.entries(countLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{key==='order_count'?query.data!.order_count:money(query.data![key as keyof typeof countLabels])}</dd></div>)}</dl>
   <h2>Thu / hoàn theo {granularity==='DAY'?'ngày':'tháng'} phát sinh</h2>{query.data.cash_series?.length?<div className="market-table-scroll" role="region" aria-label="Thu hoàn theo thời gian" tabIndex={0}><table><thead><tr><th>Đầu kỳ nhỏ (giờ Việt Nam)</th><th>Đã thu</th><th>Đã hoàn</th></tr></thead><tbody>{query.data.cash_series.map(row=><tr key={row.bucket_start}><td>{time(row.bucket_start)}</td><td>{money(row.collected_vnd)}</td><td>{money(row.refunded_vnd)}</td></tr>)}</tbody></table></div>:<p>{query.data.cash_series?'Không có sự kiện tiền đã xác nhận trong kỳ.':'Bản đọc chưa cung cấp chuỗi sự kiện tiền.'}</p>}
   <h2>Đường đối chiếu từng khoản tiền</h2><MoneyEntries key={scope+from+to+store} scope={scope} from={period.from} to={period.to} store={store}/>
   <h2>Lịch sử chưa xác định được ngày</h2><p>Các khoản bên dưới nằm ngoài kỳ đã chọn, vì chưa có sự kiện tiền với timestamp được đối chiếu. Không gán ngày tạo đơn cho ngày thu hoặc hoàn.</p><p>Đã thu chưa rõ ngày: {query.data.unresolved_collected_vnd===undefined?'Chưa có dữ liệu':money(query.data.unresolved_collected_vnd)} · Đã hoàn chưa rõ ngày: {query.data.unresolved_refunded_vnd===undefined?'Chưa có dữ liệu':money(query.data.unresolved_refunded_vnd)}</p><button aria-expanded={showGaps} onClick={()=>setShowGaps(value=>!value)}>{showGaps?'Đóng danh sách khoản chưa rõ ngày':'Xem khoản chưa rõ ngày'}</button>{showGaps&&<UnresolvedEntries key={scope+store} scope={scope} store={store}/>}
   {query.data.low_stock_variant_ids&&<p>Biến thể sắp hết hàng: {query.data.low_stock_variant_ids.length}. Đây là dữ liệu kho hiện hành, không suy tồn lịch sử từ kỳ báo cáo tiền.</p>}
  </>}
 </section>;
}
function orderLink(scope:Scope,id:string){return (scope==='STORE'?'/seller/orders?':'/admin?tab=orders&')+'q='+encodeURIComponent(id);}
function useEntryPage(key:'money_page'|'gap_page'){
 const [params,setParams]=useSearchParams(),raw=Number(params.get(key)),page=Number.isSafeInteger(raw)&&raw>0?raw:1;
 return {page,set:(value:number,options?:{replace?:boolean})=>setParams(current=>{const next=new URLSearchParams(current);next.set(key,String(value));return next;},options)};
}
function MoneyEntries({scope,from,to,store}:{scope:Scope;from:string;to:string;store:string}){
 const paging=useEntryPage('money_page');
 const query=useQuery<OperationOutputs['listStoreMoneyMovements']>({queryKey:['report-money-entries',scope,from,to,store,paging.page],staleTime:0,queryFn:async({signal})=>scope==='ADMIN'?callOperation('listAdminMoneyMovements',{query:{from,to,page:paging.page,size:20,...(store?{store_id:store}:{})}},{signal}):callOperation('listStoreMoneyMovements',{query:{from,to,page:paging.page,size:20}},{signal})});
 useEffect(()=>{if(query.data&&!query.isFetching&&!query.error&&paging.page>Math.max(1,Math.ceil(query.data.total/query.data.size)))paging.set(Math.max(1,Math.ceil(query.data.total/query.data.size)),{replace:true});},[query.data,query.isFetching,query.error,paging.page]);
 return <section aria-label="Sự kiện tiền đã xác nhận">{query.isFetching&&query.data&&<Loading/>}{query.isPending?<Loading/>:query.error?<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>:query.data&&<>{!query.data.items.length?(!query.isFetching&&<p>Không có sự kiện tiền đã xác nhận trong khoảng này.</p>):<ul className="financial-money-list">{query.data.items.map(row=><li key={row.id}><strong>{row.kind==='COLLECTION'?'Thu':'Hoàn'} {money(row.amount_vnd)}</strong> · <time dateTime={row.occurred_at}>{time(row.occurred_at)}</time><p>{sources[row.time_source]??row.time_source}</p><Link to={orderLink(scope,row.order_id)}>Đối chiếu đơn {row.order_id}</Link>{scope==='ADMIN'&&<p>Store: {row.store_id}</p>}<details><summary>Nguồn đối chiếu khoản tiền</summary><p>Nguồn: {row.source_type} · {row.source_id}</p><p>Payment: {row.payment_id}</p><p>Journal: {row.id}</p><p>Hệ thống ghi nhận lúc {time(row.recorded_at)}; mốc này có thể khác thời điểm phát sinh.</p></details></li>)}</ul>}<Pagination page={paging.page} size={query.data.size} total={query.data.total} onPage={paging.set}/></>}</section>;
}
function UnresolvedEntries({scope,store}:{scope:Scope;store:string}){
 const paging=useEntryPage('gap_page');
 const query=useQuery<OperationOutputs['listStoreUnresolvedMoneyMovements']>({queryKey:['report-unresolved',scope,store,paging.page],staleTime:0,queryFn:async({signal})=>scope==='ADMIN'?callOperation('listAdminUnresolvedMoneyMovements',{query:{page:paging.page,size:20,...(store?{store_id:store}:{})}},{signal}):callOperation('listStoreUnresolvedMoneyMovements',{query:{page:paging.page,size:20}},{signal})});
 useEffect(()=>{if(query.data&&!query.isFetching&&!query.error&&paging.page>Math.max(1,Math.ceil(query.data.total/query.data.size)))paging.set(Math.max(1,Math.ceil(query.data.total/query.data.size)),{replace:true});},[query.data,query.isFetching,query.error,paging.page]);
 return <section aria-label="Khoản lịch sử chưa rõ ngày">{query.isFetching&&query.data&&<Loading/>}{query.isPending?<Loading/>:query.error?<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>:query.data&&<>{!query.data.items.length?(!query.isFetching&&<p>Không có khoản lịch sử thiếu mốc tiền trong phạm vi này.</p>):<ul className="financial-money-list">{query.data.items.map(row=><li key={row.payment_id+row.kind}><strong>{row.kind==='COLLECTION'?'Thu':'Hoàn'} {money(row.amount_vnd)}</strong> · {row.payment_method}<p>Chưa có mốc tiền được xác minh. Cần đối chiếu nguồn; không cộng khoản này vào kỳ đang xem.</p><Link to={orderLink(scope,row.order_id)}>Đối chiếu đơn {row.order_id}</Link><p>Payment: {row.payment_id}</p>{scope==='ADMIN'&&<p>Store: {row.store_id}</p>}</li>)}</ul>}<Pagination page={paging.page} size={query.data.size} total={query.data.total} onPage={paging.set}/></>}</section>;
}
