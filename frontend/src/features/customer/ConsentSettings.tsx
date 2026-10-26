import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import {getPersonalizationConsent,updatePersonalizationConsent,type PersonalizationConsentView} from '../../api/consent';
import {ErrorView,Loading} from '../../bootstrap/components';
export function ConsentSettings(){const {session}=useAuth();return <Consent key={session?.context?.user_id??'guest'}/>}
function Consent(){
 const [data,setData]=useState<PersonalizationConsentView>(),[error,setError]=useState<unknown>(),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[stale,setStale]=useState(false),[retry,setRetry]=useState(0),[notice,setNotice]=useState('');const alive=useRef(true),flight=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{let active=true;setLoading(true);setData(undefined);setError(undefined);getPersonalizationConsent().then(v=>{if(active){setData(v);setStale(false)}}).catch(e=>{if(active)setError(e)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[retry]);
 async function toggle(){if(!data||stale||flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');try{const value=await updatePersonalizationConsent({status:data.status==='GRANTED'?'WITHDRAWN':'GRANTED',expected_version:data.version});if(alive.current){setData(value);setNotice('Đã lưu quyền cá nhân hóa qua API.')}}catch(e){if(alive.current){setError(e);if(e instanceof ApiError&&e.status===409)setStale(true)}}finally{flight.current=false;if(alive.current)setBusy(false)}}
 return <section className="boot-card"><h2>Quyền cá nhân hóa AI</h2><p>Bạn có thể cấp hoặc thu hồi quyền sử dụng hành vi để cá nhân hóa gợi ý.</p>
 {loading?<Loading/>:<>{error!=null&&<ErrorView error={error} onRetry={()=>setRetry(n=>n+1)}/>} {data&&<><p>Trạng thái hiện tại: {data.status} · phiên bản {data.version}</p><button disabled={busy||stale} onClick={()=>void toggle()}>{busy?'Đang lưu…':data.status==='GRANTED'?'Thu hồi (Revoke)':'Cấp quyền (Grant)'}</button></>}{stale&&<p>Tải lại trạng thái trước khi thay đổi tiếp.</p>}</>}{notice&&<p role="status">{notice}</p>}</section>;
}
export default ConsentSettings;
