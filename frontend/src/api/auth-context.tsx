import { createContext,useContext,useState,useEffect,useRef,ReactNode } from 'react';
import { api,setAccessToken,AuthTokens } from './client';
import {callOperation} from './operations';
const Context=createContext<{session?:AuthTokens;login:(email:string,password:string)=>Promise<void>;logout:()=>Promise<void>;refreshContext:()=>Promise<void>}>({login:async()=>{},logout:async()=>{},refreshContext:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<AuthTokens>();const epoch=useRef(0),mounted=useRef(true);
  useEffect(()=>{
    mounted.current=true;const attempt=epoch.current;
    if(document.cookie.split('; ').some(value=>value.startsWith('pbl6_csrf=')))api.restore().then(value=>{if(mounted.current&&attempt===epoch.current)setSession(value);}).catch(()=>{if(mounted.current&&attempt===epoch.current)setAccessToken();});
    return ()=>{mounted.current=false;epoch.current++};
  },[]);
  const refreshContext=async()=>{const attempt=epoch.current;const context=await callOperation('getAuthContext');if(mounted.current&&attempt===epoch.current)setSession(current=>current?.context?.user_id===context.user_id?{...current,context}:current)};
  return <Context.Provider value={{session,refreshContext,login:async(email,password)=>{const attempt=++epoch.current;const value=await api.login(email,password);if(mounted.current&&attempt===epoch.current){setAccessToken(value.access_token);setSession(value);}},logout:async()=>{const attempt=++epoch.current;try{await api.logout();}finally{if(mounted.current&&attempt===epoch.current){setAccessToken();setSession(undefined);}}}}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
