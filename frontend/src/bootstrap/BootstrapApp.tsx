import { BrowserRouter,NavLink,useRoutes } from 'react-router-dom';
import { QueryClient,QueryClientProvider,useQuery } from '@tanstack/react-query';
import { AuthProvider,useAuth } from '../api/auth-context';
import { api } from '../api/client';
import './bootstrap.css';
import {customerRoutes} from '../features/customer/routes';
import {sellerRoutes} from '../features/seller/routes';
import {adminRoutes} from '../features/admin/routes';
import { ErrorView } from './components';
import { dataMode } from '../api/operations';
import {AuthPage} from '../features/customer/auth/AuthPage';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:15000}}});
function Profile(){const auth=useAuth();const {data,error,isLoading}=useQuery({queryKey:['profile',auth.session?.context?.user_id],queryFn:api.profile,enabled:!!auth.session});return <section className="boot-card"><h2>Hồ sơ từ M3</h2>{!auth.session?<p>Đăng nhập để xem hồ sơ.</p>:isLoading?<p>Đang tải…</p>:error?<ErrorView error={error}/>:<><p>{data?.display_name}</p><p>{data?.email}</p></>}</section>;}
function ApplicationRoutes(){return useRoutes([...['/login','/auth','/register','/verify-email','/forgot-password','/reset-password','/change-password'].map(path=>({path,element:<AuthPage/>})),{path:'/profile',element:<Profile/>},...customerRoutes,...sellerRoutes,...adminRoutes,{path:'*',element:<p>Không tìm thấy trang.</p>}]);}
export function BootstrapApp(){return <QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><div className="boot"><header><div><small>PBL6 · 4 SERVICE SOA</small><h1>Khung tích hợp API</h1><p>Luồng mẫu chạy thật; các module còn lại chờ thành viên triển khai.</p></div><span>Mode: {dataMode.toUpperCase()}</span></header><nav>{[['/','Sản phẩm'],['/login','Đăng nhập'],['/profile','Hồ sơ'],['/cart','Giỏ hàng'],['/customer/invitations','Lời mời Store'],['/customer/store-applications','Đăng ký Store'],['/seller','Seller'],['/seller/products','Store products'],['/seller/staff','Nhân viên Store'],['/admin','Admin'],['/admin/store-applications','Duyệt hồ sơ']].map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</nav><main>{dataMode==='fixture' && <p role="alert">Dữ liệu fixture · không thực hiện giao dịch.</p>}<ApplicationRoutes/></main><footer>{dataMode === 'fixture' ? 'Fixture mode · Browser mock data only · No server transactions' : 'API mode · Data and transactions are provided by the backend'}</footer></div></BrowserRouter></AuthProvider></QueryClientProvider>;}
