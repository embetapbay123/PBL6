import { useState,FormEvent } from 'react';
import { BrowserRouter,NavLink,useRoutes } from 'react-router-dom';
import { QueryClient,QueryClientProvider,useQuery } from '@tanstack/react-query';
import { AuthProvider,useAuth } from '../api/auth-context';
import { api,ApiError } from '../api/client';
import './bootstrap.css';
import {customerRoutes} from '../features/customer/routes';
import {sellerRoutes} from '../features/seller/routes';
import {adminRoutes} from '../features/admin/routes';
import { ErrorView } from './components';
import { dataMode } from '../api/operations';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:15000}}});
function Login() {
  const auth=useAuth();const [email,setEmail]=useState('customer1@pbl6.test');const [password,setPassword]=useState('');const [error,setError]=useState<unknown>();const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError(undefined);try{await auth.login(email,password);queryClient.clear();}catch(e){setError(e);}finally{setBusy(false);}}
  if(auth.session)return <section className="boot-card"><h2>Đã đăng nhập</h2><p>{auth.session.context?.roles?.join(', ')}</p><button onClick={()=>auth.logout().then(()=>queryClient.clear()).catch(setError)}>Đăng xuất</button>{error!=null && <ErrorView error={error}/>}</section>;
  return <form onSubmit={submit} className="boot-card"><h2>Đăng nhập API thật</h2><p>Tài khoản seed: customer1@pbl6.test. Mật khẩu trong cấu hình local.</p><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label><label>Mật khẩu<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></label><button disabled={busy}>{busy?'Đang đăng nhập…':'Đăng nhập'}</button>{error!=null && <ErrorView error={error}/>}</form>;
}
function Profile(){const auth=useAuth();const {data,error,isLoading}=useQuery({queryKey:['profile',auth.session?.context?.user_id],queryFn:api.profile,enabled:!!auth.session});return <section className="boot-card"><h2>Hồ sơ từ M3</h2>{!auth.session?<p>Đăng nhập để xem hồ sơ.</p>:isLoading?<p>Đang tải…</p>:error?<ErrorView error={error}/>:<><p>{data?.display_name}</p><p>{data?.email}</p></>}</section>;}
function ApplicationRoutes(){return useRoutes([{path:'/login',element:<Login/>},{path:'/profile',element:<Profile/>},...customerRoutes,...sellerRoutes,...adminRoutes,{path:'*',element:<p>Không tìm thấy trang.</p>}]);}
export function BootstrapApp(){return <QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><div className="boot"><header><div><small>PBL6 · 4 SERVICE SOA</small><h1>Khung tích hợp API</h1><p>Luồng mẫu chạy thật; các module còn lại chờ thành viên triển khai.</p></div><a href="/?mode=mock">Mở giao diện demo mock</a></header><nav>{[['/','Sản phẩm'],['/login','Đăng nhập'],['/profile','Hồ sơ'],['/customer/cart','Giỏ hàng'],['/seller','Seller'],['/admin','Admin']].map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</nav><main>{dataMode==='fixture' && <p role="alert">Dữ liệu fixture · không thực hiện giao dịch.</p>}<ApplicationRoutes/></main><footer>API mode · Dữ liệu do backend cung cấp · Không mô phỏng giao dịch trên client</footer></div></BrowserRouter></AuthProvider></QueryClientProvider>;}
