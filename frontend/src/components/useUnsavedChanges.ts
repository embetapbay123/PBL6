import {useCallback,useContext,useEffect,useRef} from 'react';
import {UnsavedChangesContext} from './UnsavedChangesBoundary';
const editors=new Set<symbol>();
const unload=(event:BeforeUnloadEvent)=>{if(editors.size){event.preventDefault();event.returnValue='';}};
const navigate=(event:MouseEvent)=>{
 if(!editors.size||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const link=(event.target as Element)?.closest?.('a[href]');if(!(link instanceof HTMLAnchorElement)||link.target==='_blank'||link.hasAttribute('download'))return;
 const url=new URL(link.href);if(url.pathname===location.pathname&&url.search===location.search&&url.origin===location.origin)return;
 if(!window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')){event.preventDefault();event.stopPropagation();}
};
/** Live app uses one router guard; development API tools retain their native/link fallback. */
export function useUnsavedChanges(dirty:boolean){const register=useContext(UnsavedChangesContext),key=useRef(Symbol());
 const release=useCallback(()=>{if(register)register(key.current,false);else{editors.delete(key.current);if(!editors.size){window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);}}},[register]);
 useEffect(()=>{
 if(!dirty)return;
 if(register){register(key.current,true);return release;}
 editors.add(key.current);
 if(editors.size===1){window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);}
 return release;
},[dirty,register,release]);return release;}
