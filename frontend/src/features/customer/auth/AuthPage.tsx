import {Link,useLocation} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../../api/auth-context';
import {ErrorView,ProtectedRoute} from '../../../bootstrap/components';
import {LoginForm} from './LoginForm';
import {RegisterForm} from './RegisterForm';
import {VerifyForm} from './VerifyForm';
import {ForgotPasswordForm} from './ForgotPasswordForm';
import {ResetPasswordForm} from './ResetPasswordForm';
import {ChangePasswordForm} from './ChangePasswordForm';
import {useAuthCommand} from './useAuthCommand';
export function AuthPage(){const {pathname}=useLocation(),auth=useAuth(),cache=useQueryClient(),command=useAuthCommand();const forms:Record<string,React.ReactNode>={'/register':<RegisterForm/>,'/verify-email':<VerifyForm/>,'/forgot-password':<ForgotPasswordForm/>,'/reset-password':<ResetPasswordForm/>,'/change-password':<ProtectedRoute><ChangePasswordForm/></ProtectedRoute>};
 const login=auth.session?<section className="boot-card"><h2>Đã đăng nhập</h2><p>{auth.session.context?.roles?.join(', ')}</p><button onClick={()=>void command.run(async()=>{await auth.logout();cache.clear()})}>Đăng xuất</button>{command.error!=null&&<ErrorView error={command.error}/>}<Link to="/change-password">Đổi mật khẩu</Link></section>:<LoginForm/>;
 return <section key={pathname}>{forms[pathname]??login}<p><Link to="/login">Đăng nhập</Link> · <Link to="/register">Đăng ký tài khoản</Link> · <Link to="/forgot-password">Quên mật khẩu</Link></p></section>;
}
