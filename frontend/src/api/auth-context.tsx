import { createContext,useContext,useState,useEffect,ReactNode } from 'react';
import { api,setAccessToken,AuthTokens } from './client';
const Context=createContext<{session?:AuthTokens;login:(email:string,password:string)=>Promise<void>;logout:()=>Promise<void>}>({login:async()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<AuthTokens>();
  useEffect(()=>{
    let active=true;
    if(document.cookie.split('; ').some(value=>value.startsWith('pbl6_csrf=')))api.restore().then(value=>{if(active)setSession(value);}).catch(()=>{setAccessToken();});
    return ()=>{active=false;};
  },[]);
  return <Context.Provider value={{session,login:async(email,password)=>{const value=await api.login(email,password);setAccessToken(value.access_token);setSession(value);},logout:async()=>{try{await api.logout();}finally{setAccessToken();setSession(undefined);}}}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
