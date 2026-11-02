import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useNavigate,type RouteObject} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ProtectedRoute,ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {listOwnStoreApplications,submitStoreApplication} from '../../api/store-applications';
import {dataMode} from '../../api/operations';
import {getAuthSession,isUncertainMutation} from '../../api/client';
import {useAuth} from '../../api/auth-context';
import type {StoreApplication} from '../../api/store-application.mock';
import {CustomerSubNav} from './CustomerSubNav';

const labels:Record<string,string>={PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Từ chối'};
function CustomerStoreApplicationPage(){
 const {session,refreshContext}=useAuth(),cache=useQueryClient(),navigate=useNavigate();
 const [page,setPage]=useState(1),[name,setName]=useState(''),[contact,setContact]=useState('');
 const [busy,setBusy]=useState(false),[readRequired,setReadRequired]=useState(false),[error,setError]=useState<unknown>(),[notice,setNotice]=useState('');
 const alive=useRef(true),flight=useRef(false),nameInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const user=session?.context?.user_id,member=session?.context?.store_membership,active=member?.status==='ACTIVE';
 const query=(p:number)=>({queryKey:['own-store-applications',user,p],queryFn:()=>listOwnStoreApplications(p,10)});
 const history=useQuery(query(page)),data=history.data;
 const pending=!!data?.status_counts?.PENDING||!!data?.items.some(a=>a.status==='PENDING');
 const approved=!!data?.status_counts?.APPROVED||!!data?.items.some(a=>a.status==='APPROVED');
 const blocked=busy||history.isFetching||!!history.error||readRequired;
 async function readFirst(){
  setPage(1);const value=await cache.fetchQuery({...query(1),staleTime:0});
  if(alive.current)setReadRequired(false);return value;
 }
 async function refresh(){
  if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);
  try{await readFirst();if(alive.current)setNotice('Đã đọc lại trạng thái. Đối chiếu hồ sơ bên dưới trước khi thao tác tiếp.');}
  catch(cause){if(alive.current){setError(cause);setReadRequired(true);}}
  finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 async function submit(event:FormEvent){
  event.preventDefault();if(flight.current||blocked||pending||active||!name.trim()||!contact.trim())return;
  flight.current=true;setBusy(true);setError(undefined);setNotice('');
  try{
   const created=await submitStoreApplication({proposed_name:name.trim(),contact:contact.trim()});
   if(!alive.current)return;
   setReadRequired(true);setNotice(dataMode==='fixture'?`Đã tạo hồ sơ fixture “${created.proposed_name}” trong trình duyệt; chưa gửi lên máy chủ.`:`Đã gửi hồ sơ “${created.proposed_name}”. Chờ Admin xét duyệt; việc gửi hồ sơ chưa cấp quyền bán hàng.`);
   setName('');setContact('');await readFirst();
  }catch(cause){if(alive.current){setError(cause);setReadRequired(true);if(isUncertainMutation(cause))setNotice('Chưa rõ kết quả gửi hồ sơ. Đọc lại trạng thái trước khi thao tác tiếp; yêu cầu không tự được gửi lại.');}}
  finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 async function enter(){
  if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');
  try{
   await refreshContext();const current=getAuthSession()?.context,m=current?.store_membership;
   if(current?.user_id===user&&m?.status==='ACTIVE'&&m.role==='OWNER'&&current?.roles.includes('STORE_OWNER'))navigate('/seller');
   else if(alive.current)setNotice('Quyền hiện hành chưa cho phép vào Store với vai trò chủ Store. Hồ sơ cũ không tự cấp lại quyền; hãy liên hệ quản trị để kiểm tra.');
  }catch(cause){if(alive.current)setError(cause);}
  finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 function reuse(app:StoreApplication){setName(app.proposed_name);setContact(app.contact);setNotice('Đã điền lại thông tin. Bổ sung theo lý do từ chối rồi kiểm tra trước khi gửi hồ sơ mới; hồ sơ cũ được giữ lại.');nameInput.current?.focus();}
 return <section className="store-app-page"><CustomerSubNav/>
  <header className="store-app-page-heading"><p className="store-app-eyebrow">DÀNH CHO NHÀ BÁN HÀNG</p><h1>Bắt đầu bán hàng cùng PBL6</h1><p>Gửi hồ sơ → chờ Admin xét duyệt → cập nhật quyền → hoàn thiện Store trước khi nhận đơn.</p></header>
  {dataMode==='fixture'&&<p className="store-app-demo-banner">FIXTURE: hồ sơ chỉ lưu trong trình duyệt, không tạo Store hoặc cấp quyền thật.</p>}
  {notice&&<p className="store-app-notice" role="status">{notice}</p>}{error!=null&&<ErrorView error={error}/>}
  <section className="boot-card store-app-card" aria-label="Trạng thái và bước tiếp">
   <h2>Theo dõi hồ sơ và tiếp tục</h2><p>Admin xét duyệt hồ sơ. Dùng nút dưới đây để kiểm tra quyết định khi trang đang mở; không cần đăng xuất.</p>
   <button type="button" disabled={busy||history.isFetching} onClick={()=>void refresh()}>Đọc lại trạng thái hồ sơ</button>
   {pending&&<p>Hồ sơ đang chờ Admin. Không gửi thêm hồ sơ trong lúc chờ; nếu bị từ chối, xem lý do rồi bổ sung và gửi hồ sơ mới.</p>}
   {approved&&!active&&dataMode!=='fixture'&&<><p>Hồ sơ đã được duyệt. Cập nhật quyền hiện hành để mở Store; lịch sử duyệt không thay thế quyền truy cập hiện tại.</p><button type="button" disabled={blocked} onClick={()=>void enter()}>Cập nhật quyền và vào Store</button></>}
   {active&&<p>{member.role==='OWNER'?'Bạn đang có quyền chủ Store.':'Bạn đang là nhân viên của một Store, chưa phải chủ Store.'} <Link to="/seller">Mở Store hiện tại</Link>. Mỗi tài khoản chỉ tham gia một Store đang hoạt động.</p>}
  </section>
  {!active&&<section className="boot-card store-app-card"><h2>Đăng ký mở cửa hàng</h2><p>Kiểm tra tên và thông tin liên hệ trước khi gửi. Hồ sơ bị từ chối được giữ trong lịch sử; gửi lại tạo một hồ sơ mới.</p>
   <form onSubmit={submit} className="store-app-form"><fieldset disabled={blocked||pending}><legend>Thông tin đề nghị mở Store</legend>
    <label>Tên cửa hàng <span aria-hidden="true">*</span><input ref={nameInput} value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Cửa hàng Minh An" required minLength={2} maxLength={200}/></label>
    <label>Email hoặc số điện thoại liên hệ <span aria-hidden="true">*</span><input value={contact} onChange={e=>setContact(e.target.value)} placeholder="email@example.com hoặc 0901234567" required minLength={3} maxLength={200}/></label>
    <button className="store-app-button store-app-button--primary">{busy?'Đang xử lý…':dataMode==='fixture'?'Tạo hồ sơ fixture':'Gửi hồ sơ đăng ký'}</button>
   </fieldset></form>{readRequired&&<p>Đang khóa việc gửi mới cho đến khi đọc lại được trạng thái hồ sơ.</p>}
  </section>}
  <section className="boot-card store-app-card"><h2>Hồ sơ của bạn</h2>
   {history.error!=null&&<ErrorView error={history.error}/>}{history.isFetching&&<Loading/>}
   {!history.error&&data&&<>{!data.items.length?<p>Chưa có hồ sơ đăng ký.</p>:<div className="store-app-list">{data.items.map((app,i)=><article className="store-app-row" key={app.id??i}>
    <div className="store-app-row-main"><div><h3>{app.proposed_name}</h3><p>{app.contact}</p></div><span className={`store-app-status store-app-status--${(app.status??'unknown').toLowerCase()}`}>{labels[app.status??'']??'Chưa rõ trạng thái'}</span></div>
    {app.decision_reason&&<p className="store-app-reason"><strong>Lý do từ chối:</strong> {app.decision_reason}</p>}
    {app.status==='REJECTED'&&!active&&<button type="button" disabled={blocked||pending} onClick={()=>reuse(app)}>Bổ sung và gửi hồ sơ mới</button>}
    {app.id&&<small>Mã hồ sơ: <code>{app.id}</code></small>}
   </article>)}</div>}<fieldset disabled={blocked}><legend>Trang hồ sơ</legend><Pagination page={data.page} size={data.size} total={data.total} onPage={setPage}/></fieldset></>}
  </section>
 </section>;
}
export const storeApplicationCustomerRoutes:RouteObject[]=[{path:'/customer/store-applications',element:<ProtectedRoute roles={['CUSTOMER']}><CustomerStoreApplicationPage/></ProtectedRoute>}];
