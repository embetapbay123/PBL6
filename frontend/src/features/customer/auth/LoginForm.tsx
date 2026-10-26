import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../../api/auth-context';
import {ErrorView} from '../../../bootstrap/components';
import {useAuthCommand} from './useAuthCommand';
export function LoginForm(){const auth=useAuth(),cache=useQueryClient(),command=useAuthCommand();const [email,setEmail]=useState('customer1@pbl6.test'),[password,setPassword]=useState('');
 return <form className="boot-card" onSubmit={e=>{e.preventDefault();void command.run(async()=>{await auth.login(email,password);cache.clear();setPassword('')})}}><h2>Đăng nhập</h2>
 <label>Email<input type="email" required maxLength={254} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Mật khẩu<input type="password" required maxLength={72} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={command.busy}>Đăng nhập</button>{command.error!=null&&<ErrorView error={command.error}/>}<p><Link to="/register">Đăng ký tài khoản</Link> · <Link to="/forgot-password">Quên mật khẩu</Link></p></form>;
}
