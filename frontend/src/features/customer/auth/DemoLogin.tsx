import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {api} from '../../../api/client';
import type {OperationInputs} from '../../../api/operations.generated';
import {ErrorView} from '../../../bootstrap/components';
import {peekAuthReturn} from './auth-return';
import {useAuthCommand} from './useAuthCommand';
import './demo-login.css';

const accounts: {id:OperationInputs['demoLogin']['body']['account'];name:string;description:string;path:string}[]=[
 {id:'customerA',name:'Khách hàng A',description:'Đơn hàng tại An Nhiên',path:'/'},
 {id:'customerB',name:'Khách hàng B',description:'Đơn hàng tại Mây Xanh',path:'/'},
 {id:'ownerA',name:'Chủ Store An Nhiên',description:'Đầy đủ quyền cửa hàng',path:'/seller'},
 {id:'ownerB',name:'Chủ Store Mây Xanh',description:'Đầy đủ quyền cửa hàng',path:'/seller'},
 {id:'staffA',name:'Nhân viên An Nhiên',description:'Sản phẩm, kho và xử lý đơn',path:'/seller'},
 {id:'staffB',name:'Nhân viên kho Mây Xanh',description:'Chỉ có quyền quản lý kho',path:'/seller/inventory'},
 {id:'admin',name:'Quản trị viên',description:'Quản trị toàn sàn demo',path:'/admin'},
];
export function DemoLogin(){
 const cache=useQueryClient(),navigate=useNavigate(),command=useAuthCommand();
 if(import.meta.env.VITE_DEMO_LOGIN_ENABLED!=='1')return null;
 return <section className="boot-card demo-login" aria-labelledby="demo-login-heading">
  <h2 id="demo-login-heading">Đăng nhập nhanh demo</h2>
  <p>Chọn vai trò để thử với dữ liệu mẫu dùng chung. Các thao tác thay đổi dữ liệu demo.</p>
  <fieldset disabled={command.busy} aria-busy={command.busy}>
   <legend>Chọn tài khoản có sẵn</legend>
   <div className="demo-login-accounts">{accounts.map(account=><button type="button" key={account.id} onClick={()=>void command.run(async()=>{
    const pending=peekAuthReturn();
    await api.demoLogin(account.id);cache.clear();
    if(!pending||pending.expired)navigate(account.path,{replace:true});
   })}><strong>{account.name}</strong><span>{account.description}</span></button>)}</div>
  </fieldset>
  {command.busy&&<p role="status">Đang đăng nhập tài khoản demo…</p>}
  {command.error!=null&&<ErrorView error={command.error}/>}
 </section>;
}
