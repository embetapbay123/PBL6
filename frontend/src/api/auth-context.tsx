import {createContext,useContext,useEffect,useSyncExternalStore,type ReactNode} from 'react';
import {api,getAuthSession,subscribeAuth,startAuthSync,refreshAuthContext,type AuthTokens} from './client';
const Context=createContext<{session?:AuthTokens;login:(email:string,password:string)=>Promise<void>;logout:()=>Promise<void>;refreshContext:()=>Promise<void>}>({login:async()=>{},logout:async()=>{},refreshContext:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}) {
  const session=useSyncExternalStore(subscribeAuth,getAuthSession,getAuthSession);
  useEffect(()=>{
    const stop=startAuthSync();
    if(document.cookie.split('; ').some(value=>value.startsWith('pbl6_csrf=')))void api.restore().catch(()=>{});
    return stop;
  },[]);
  return <Context.Provider value={{session,refreshContext:refreshAuthContext,login:async(email,password)=>{await api.login(email,password);},logout:api.logout}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
