import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link,useSearchParams} from 'react-router-dom';
import {callOperation} from '../../api/operations';
import {ApiError} from '../../api/client';
import type {OperationInputs,OperationOutputs} from '../../api/operations.generated';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {useAuth} from '../../api/auth-context';
import {Button} from '../../components/ui/Button';
import {ShipmentControls,shipmentStatusLabel} from './ShippingPanel';
import {PlatformPickupEditor} from './PlatformPickupEditor';
import './shipping.css';

type Pickup=OperationOutputs['listShippingLocations']['items'][number];
function PickupEditor({location,environment,configured,done}:{location?:Pickup;environment:'staging'|'production';configured:boolean;done:()=>Promise<unknown>}){
  const [store,setStore]=useState(location?.store_id??''),[name,setName]=useState(location?.name??''),[shop,setShop]=useState(String(location?.shop_id??'')),[enabled,setEnabled]=useState(location?.enabled??false);
  const [address,setAddress]=useState(location?.address??{recipient_name:'',phone:'',line1:'',ward:'',district:'',city:'',new_address:false});
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[id]=useState(()=>location?.id??crypto.randomUUID());
  const stores=useQuery({queryKey:['shipping-store-options'],queryFn:({signal})=>callOperation('listStores',{query:{page:1,size:100}},{signal})});
  const fields=[['recipient_name','Người bàn giao'],['phone','Số điện thoại'],['line1','Địa chỉ lấy và nhận hoàn'],['city','Tỉnh / thành phố'],['ward','Phường / xã'],['district','Quận / huyện (địa chỉ cũ)']] as const;
  return <form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError(undefined);try{
    const body:OperationInputs['saveShippingLocation']['body']={id,store_id:store,name,shop_id:Number(shop),environment:location?.environment??environment,address,enabled,expected_version:location?.version??0};
    await callOperation('saveShippingLocation',{body});await done();
  }catch(cause){setError(cause);}finally{setBusy(false);}}}>
    <div className="shipping-fields"><label>Cửa hàng<select required disabled={busy||!!location} value={store} onChange={e=>setStore(e.target.value)}><option value="">Chọn cửa hàng</option>{stores.data?.items.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{location&&!stores.data?.items.some(s=>s.id===store)&&<option value={store}>{store}</option>}</select></label>
    <label>Tên kho<input required maxLength={200} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
    <label>ShopId trên GHN<input required type="number" min={1} max={2147483647} value={shop} disabled={busy||!!location} onChange={e=>setShop(e.target.value)}/></label>
    <p>Môi trường {location?.environment??environment}</p>
    {fields.map(([key,label])=><label key={key}>{label}<input required={key!=='district'} maxLength={key==='line1'?500:key==='phone'?20:200} value={address[key]??''} disabled={busy} onChange={e=>setAddress({...address,[key]:e.target.value})}/></label>)}</div>
    <label><span><input type="checkbox" checked={address.new_address??false} disabled={busy} onChange={e=>setAddress({...address,new_address:e.target.checked})}/> Địa chỉ mới có tỉnh/thành và phường/xã</span></label>
    <label><span><input type="checkbox" checked={enabled} disabled={busy||!configured&&!enabled} onChange={e=>setEnabled(e.target.checked)}/> Áp dụng GHN cho đơn mới của cửa hàng</span></label>
    {!configured&&<p>Có thể lưu kho trước. Bật nhận đơn GHN sau khi cấu hình kết nối trên server.</p>}
    {stores.error&&<ErrorView error={stores.error}/>}{error!=null&&<ErrorView error={error}/>}
    <button disabled={busy||!store}>{busy?'Đang lưu…':'Lưu kho'}</button>
  </form>;
}
const shipmentGroups = [
  { key: 'pickup', label: 'Chuẩn bị lấy hàng', statuses: ['CREATING', 'CREATE_UNKNOWN', 'READY_FOR_PICKUP'] },
  { key: 'transit', label: 'Đang vận chuyển', statuses: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'MANUAL_IN_TRANSIT'] },
  { key: 'attention', label: 'Cần xử lý', statuses: ['CREATE_FAILED', 'DELIVERY_ATTEMPT_FAILED', 'RETURN_PENDING', 'RETURN_ATTEMPT_FAILED', 'EXCEPTION'] },
  { key: 'returned', label: 'Chuyển hoàn', statuses: ['RETURNING', 'RETURNED'] },
  { key: 'delivered', label: 'Đã giao / đã nhận', statuses: ['DELIVERED', 'MANUAL_RECEIVED'] },
  { key: 'cancelled', label: 'Đã hủy', statuses: ['CANCELLED'] },
];
const shipmentPageSize = 20;
const orderUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const shipmentLegLabel = { OUTBOUND: 'Giao hàng', EXCHANGE_OUTBOUND: 'Gửi hàng đổi', CUSTOMER_RETURN: 'Gửi trả hàng' };

export function ShippingQueue({admin = false}: {admin?: boolean}) {
  const {session} = useAuth();
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  useLayoutEffect(() => { latestParams.current = params; }, [params]);
  const code = (params.get('shipment_q') ?? '').trim().slice(0, 100);
  const group = shipmentGroups.find(item => item.key === params.get('shipment_status'));
  const requestedPage = Number(params.get('shipment_page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 50000000 ? requestedPage : 1;
  const [draft, setDraft] = useState(code);
  useEffect(() => setDraft(code), [code]);
  const term = code.replace(/^#\s*/, '').toUpperCase();
  const orderId = orderUuid.test(term) ? term.toLowerCase() : undefined;
  const status = group?.statuses.length === 1 ? group.statuses[0] : undefined;
  const needsScan = (!!term && !orderId) || (group?.statuses.length ?? 0) > 1;
  const operation = admin ? 'adminShippingShipments' : 'storeShippingShipments';
  const query = useQuery({
    queryKey: ['shipping-queue', admin, session?.context?.user_id, session?.context?.store_membership?.store_id, needsScan ? null : page, term, group?.key],
    queryFn: async ({signal}) => {
      const read = (page: number, size: number) => callOperation(operation, {
        query: {page, size, ...(status ? {status} : {}), ...(orderId ? {order_id: orderId} : {})},
      }, {signal});
      if (!needsScan) return read(page, shipmentPageSize);

      // The list API accepts one status or an exact order UUID. Read every page for the other filters.
      const matches: OperationOutputs['storeShippingShipments']['items'] = [];
      const seen = new Set<string>();
      const changed = () => new ApiError(409, 'SHIPMENT_LIST_CHANGED', 'Danh sách vận đơn vừa thay đổi. Hãy thử lại.');
      let total = 0;
      for (let readPage = 1; readPage === 1 || seen.size < total; readPage++) {
        const batch = await read(readPage, 100);
        if (readPage === 1) total = batch.total;
        if (batch.page !== readPage || batch.total !== total || (!batch.items.length && seen.size < total)) {
          throw changed();
        }
        for (const shipment of batch.items) {
          if (seen.has(shipment.id)) throw changed();
          seen.add(shipment.id);
          if (group && !group.statuses.includes(shipment.status)) continue;
          if (!term || orderId || shipment.order_id.toUpperCase().endsWith(term) || shipment.tracking_code?.toUpperCase().includes(term)) {
            matches.push(shipment);
          }
        }
      }
      return {items: matches, total: matches.length, page: 1, size: shipmentPageSize};
    },
    refetchInterval: ({state}) => !needsScan || state.data?.items.some(item => item.pending_command) ? 20000 : false,
    refetchOnWindowFocus: !needsScan,
    retry: needsScan ? false : undefined,
  });
  function update(changes: Record<string, string>) {
    // Keep the latest filter when a search is submitted before a select navigation renders.
    const next = new URLSearchParams(latestParams.current);
    next.delete('shipment_page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    latestParams.current = next;
    setParams(next);
  }
  const rows = needsScan ? query.data?.items.slice((page - 1) * shipmentPageSize, page * shipmentPageSize) : query.data?.items;
  return (
    <section className="shipping-panel shipping-queue" aria-label="Danh sách vận đơn">
      <h2>Vận đơn</h2>
      <form className="shipping-queue-filters" onSubmit={event => {
        event.preventDefault();
        const value = draft.trim().replace(/^#\s*/, '');
        setDraft(value);
        if (value === code && page === 1 && latestParams.current === params) void query.refetch();
        else update({shipment_q: value});
      }}>
        <label>Mã đơn hoặc mã vận đơn
          <input type="search" value={draft} maxLength={100} onChange={event => setDraft(event.target.value)} />
        </label>
        <Button type="submit">Tìm</Button>
        <label>Nhóm trạng thái
          <select value={group?.key ?? ''} onChange={event => update({shipment_status: event.target.value})}>
            <option value="">Tất cả</option>
            {shipmentGroups.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </form>
      {query.error ? <ErrorView error={query.error} onRetry={() => void query.refetch()} retryBusy={query.isFetching} /> : !query.data ? <Loading /> : <>
        {!!query.data.total && <p className="shipping-muted" role="status">{query.data.total.toLocaleString('vi-VN')} vận đơn</p>}
        {!rows?.length ? (
          <p>{code || group ? 'Không tìm thấy vận đơn phù hợp.' : 'Chưa có vận đơn.'}</p>
        ) : (
          <div className="shipping-table-scroll" tabIndex={0} role="region" aria-label="Bảng vận đơn">
            <table className="shipping-table">
              <thead><tr><th>Đơn / vận đơn</th><th className="shipping-queue-leg">Chặng</th><th>Trạng thái</th><th>Xử lý</th></tr></thead>
              <tbody>{rows.map(shipment => (
                <tr key={shipment.id}>
                  <td>
                    <Link className="shipping-order-link" to={`${admin ? '/admin?tab=orders&' : '/seller/orders?'}q=${encodeURIComponent(shipment.order_id)}`} state={{openOrderId: shipment.order_id}}>
                      #{shipment.order_id.slice(-8).toUpperCase()}
                    </Link><br />
                    <span>{shipment.tracking_code ?? 'Đang cấp mã'}</span><br />
                    <small>{new Date(shipment.created_at).toLocaleString('vi-VN')}</small>
                    <small className="shipping-queue-mobile-leg">{shipmentLegLabel[shipment.leg]}</small>
                  </td>
                  <td className="shipping-queue-leg">{shipmentLegLabel[shipment.leg]}</td>
                  <td>{shipmentStatusLabel(shipment.leg, shipment.status)}{admin && <><br /><small>{shipment.environment}</small></>}</td>
                  <td><ShipmentControls shipment={shipment} admin={admin} refresh={() => query.refetch()} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <Pagination page={page} size={shipmentPageSize} total={query.data.total} showTotal={false} onPage={next => update({shipment_page: next > 1 ? String(next) : ''})} />
      </>}
    </section>
  );
}
export function ShippingAdmin(){
  const connection=useQuery({queryKey:['shipping-connection'],queryFn:({signal})=>callOperation('getShippingConnection',{}, {signal})});
  const locations=useQuery({queryKey:['shipping-locations'],queryFn:({signal})=>callOperation('listShippingLocations',{}, {signal})});
  const [editing,setEditing]=useState<string>();
  return <section className="shipping-admin"><h1>Giao nhận hàng</h1>
    <p>Kết nối Delivery qua API · Theo dõi vận đơn và đối soát kết quả giao nhận.</p>
    <p><a href="/delivery/ops" target="_blank" rel="noopener noreferrer">Delivery ↗</a></p>
    <details><summary>Kho giao hàng PBL6</summary>
      {locations.error?<ErrorView error={locations.error}/>:locations.data?.items.filter(location=>location.provider==='PLATFORM').map(location=><article key={location.id} className="shipping-card"><div className="shipping-title"><strong>{location.name}</strong><span>{location.enabled?'Đang hoạt động':'Đã tắt'}</span><button onClick={()=>setEditing(editing===location.id?undefined:location.id)}>Sửa kho</button></div>{editing===location.id&&<PlatformPickupEditor key={location.id+':'+location.version} location={location} done={async()=>{await locations.refetch();setEditing(undefined);}}/>}</article>)}
      <details><summary>Thêm kho PBL6</summary><PlatformPickupEditor done={()=>locations.refetch()}/></details>
    </details>
    <details><summary>Kết nối hãng GHN</summary>
    {connection.error?<ErrorView error={connection.error}/>:!connection.data?<Loading/>:<>
      <p>GHN · {connection.data.environment==='staging'?'Môi trường thử nghiệm':'Môi trường thật'} · {connection.data.booking_enabled?'Đã bật đặt lịch':'Chưa bật đặt lịch'}</p>
      <details><summary>Kho lấy hàng</summary>
        <p>Nền tảng quản lý tài khoản GHN. Mỗi cửa hàng dùng một điểm lấy và nhận hoàn đang hoạt động.</p>
        {locations.error?<ErrorView error={locations.error}/>:locations.data?.items.filter(location=>location.provider!=='PLATFORM').map(l=><article key={l.id} className="shipping-card"><div className="shipping-title"><strong>{l.name}</strong><span>{l.enabled?'Đang áp dụng':'Đã tắt'} · ShopId {l.shop_id}</span><button onClick={()=>setEditing(editing===l.id?undefined:l.id)}>Chỉnh sửa</button></div>{editing===l.id&&<PickupEditor key={l.id+':'+l.version} location={l} environment={connection.data!.environment} configured={connection.data!.booking_enabled} done={async()=>{await locations.refetch();setEditing(undefined);}}/>}</article>)}
        <details><summary>Thêm kho</summary><PickupEditor environment={connection.data.environment} configured={connection.data.booking_enabled} done={async()=>{await locations.refetch();}}/></details>
      </details>
    </>}
    </details>
    <ShippingQueue admin/>
  </section>;
}
