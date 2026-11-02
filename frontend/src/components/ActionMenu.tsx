import {useId,useRef,useState,type ReactNode} from 'react';
import {MoreHorizontal} from 'lucide-react';
/** Native popovers provide light dismissal, Escape and top-layer placement above scrollable tables. */
export function ActionMenu({label,children}:{label:string;children:ReactNode}){
 const id=useId(),ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({top:0,left:0});
 return <><button className="ui-button ui-button-secondary" aria-label={label} popoverTarget={id} onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();setPosition({top:Math.max(16,Math.min(rect.bottom+6,innerHeight-200)),left:Math.max(16,Math.min(rect.right-232,innerWidth-248))});}}><MoreHorizontal size={20}/></button><div ref={ref} id={id} popover="auto" className="action-menu-popover" style={position} onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled),a'))ref.current?.hidePopover();}}>{children}</div></>;
}
