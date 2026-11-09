import {useLayoutEffect,useRef,type ReactNode} from 'react';

/** Native modal dialogs keep background content inert and restore the opener's focus. */
export function Modal({children,onClose,busy=false,label,labelledBy,variant='dialog'}:{children:ReactNode;onClose:()=>void;busy?:boolean;label?:string;labelledBy?:string;variant?:'dialog'|'drawer'}){
  const ref=useRef<HTMLDialogElement>(null);
  useLayoutEffect(()=>{
    const dialog=ref.current;if(!dialog)return;
    if(!dialog.open)dialog.showModal();
    return()=>{if(dialog.open)dialog.close();};
  },[]);
  return <dialog ref={ref} tabIndex={-1} className={'market-native-dialog '+(variant==='drawer'?'market-drawer':'')} aria-label={labelledBy?undefined:label} aria-labelledby={labelledBy} aria-modal="true" aria-busy={busy||undefined}
    onKeyDown={event=>{
      if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;
      const dialog=event.currentTarget;
      const items=Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex]')).filter(element=>element.tabIndex>=0&&!element.matches(':disabled')&&element.getClientRects().length>0);
      const first=items[0],last=items.at(-1),active=document.activeElement;
      if(!first){event.preventDefault();dialog.focus();}
      else if(event.shiftKey&&(active===first||active===dialog)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(active===last||active===dialog)){event.preventDefault();first.focus();}
    }}
    onCancel={event=>{event.preventDefault();if(!busy)onClose();}}
    onMouseDown={event=>{if(busy||event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}>
    {children}
  </dialog>;
}
