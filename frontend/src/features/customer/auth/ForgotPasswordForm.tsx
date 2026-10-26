import {useState} from 'react';
import {Link} from 'react-router-dom';
import {callOperation} from '../../../api/operations';
import {ErrorView} from '../../../bootstrap/components';
import {useAuthCommand} from './useAuthCommand';
export function ForgotPasswordForm(){const command=useAuthCommand(),[email,setEmail]=useState('');return <form className="boot-card" onSubmit={e=>{e.preventDefault();void command.run(async()=>{const result=await callOperation('resetPassword',{body:{email}});return result.message??'Nếu tài khoản phù hợp, liên kết đặt lại sẽ được gửi đến email.'})}}><h2>Quên mật khẩu</h2><label>Email<input type="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={command.busy}>Gửi yêu cầu đặt lại</button>{command.error!=null&&<ErrorView error={command.error}/>} {command.notice&&<p role="status">{command.notice}</p>}<Link to="/reset-password">Tôi đã có mã đặt lại</Link></form>}
