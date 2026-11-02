import {createContext,useCallback,useEffect,useRef,type ReactNode} from 'react';
import {useBlocker} from 'react-router-dom';

export const UnsavedChangesContext=createContext<((key:symbol,dirty:boolean)=>void)|null>(null);
const message='Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?';

/** One router blocker for all dirty product sections, including Back/Forward navigation. */
export function UnsavedChangesBoundary({children}:{children:ReactNode}){
 const editors=useRef(new Set<symbol>());
 const register=useCallback((key:symbol,dirty:boolean)=>{if(dirty)editors.current.add(key);else editors.current.delete(key);},[]);
 const blocker=useBlocker(useCallback(({currentLocation,nextLocation}: {currentLocation:{pathname:string;search:string};nextLocation:{pathname:string;search:string}})=>editors.current.size>0&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search),[]));
 const prompted=useRef<string|undefined>(undefined);
 useEffect(()=>{
  if(blocker.state!=='blocked'){prompted.current=undefined;return;}
  if(prompted.current===blocker.location.key)return;
  prompted.current=blocker.location.key;
  if(window.confirm(message))blocker.proceed();else blocker.reset();
 },[blocker]);
 useEffect(()=>{
  const beforeUnload=(event:BeforeUnloadEvent)=>{if(editors.current.size){event.preventDefault();event.returnValue='';}};
  // Router handles in-app links and POP; this also protects native reload/close and external links.
  const external=(event:MouseEvent)=>{
   if(!editors.current.size||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element)?.closest?.('a[href]');
   if(!(link instanceof HTMLAnchorElement)||link.target==='_blank'||link.hasAttribute('download')||new URL(link.href).origin===location.origin)return;
   if(!window.confirm(message)){event.preventDefault();event.stopPropagation();}
  };
  window.addEventListener('beforeunload',beforeUnload);document.addEventListener('click',external,true);
  return()=>{window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',external,true);};
 },[]);
 return <UnsavedChangesContext.Provider value={register}>{children}</UnsavedChangesContext.Provider>;
}
