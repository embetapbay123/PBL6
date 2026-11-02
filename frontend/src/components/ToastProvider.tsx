import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Check,X} from 'lucide-react';
const Context=createContext<(message:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<{id:string;message:string}[]>([]),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 const notify=useCallback((message:string)=>{const id=crypto.randomUUID();setItems(items=>[...items.slice(-2),{id,message}]);timers.current.push(setTimeout(()=>setItems(items=>items.filter(item=>item.id!==id)),6000));},[]);
 return <Context.Provider value={notify}>{children}<div className="toast-region" aria-live="polite" aria-relevant="additions" aria-label="Kết quả thao tác">{items.map(item=><div className="commerce-toast" key={item.id}><Check size={19}/><span>{item.message}</span><button type="button" aria-label="Đóng thông báo thao tác" onClick={()=>setItems(items=>items.filter(value=>value.id!==item.id))}><X size={18}/></button></div>)}</div></Context.Provider>;
}
export const useToast=()=>useContext(Context);
