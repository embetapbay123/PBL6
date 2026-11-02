import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {MessageCircle,Minus,X,Bot,Store,ArrowUpRight} from 'lucide-react';
import {useChat} from './ChatProvider';
import {useAuth} from '../api/auth-context';
import {AiChatPanel} from '../features/customer/CustomerChatWidget';
import {MessagesWorkspace} from './ConversationWorkspace';

export function ChatCenter(){
 const chat=useChat(),{ui}=chat,{session}=useAuth(),location=useLocation(),navigate=useNavigate(),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
 const [mobile,setMobile]=useState(()=>matchMedia('(max-width:767px)').matches);
 const [visible,setVisible]=useState(()=>document.visibilityState==='visible');
 const customer=!!session?.context?.roles.includes('CUSTOMER'),excluded=/^\/(seller|admin|customer\/messages)(\/|$)/.test(location.pathname)||!!session&&!customer;
 const open=ui.status==='open'&&!excluded;
 useEffect(()=>{const media=matchMedia('(max-width:767px)'),change=()=>setMobile(media.matches),visibility=()=>setVisible(document.visibilityState==='visible');media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{const element=dialog.current;if(!element)return;if(element.open)element.close();if(open){if(!opener.current)opener.current=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:Array.from(document.querySelectorAll<HTMLElement>('[data-chat-opener]')).find(element=>element.getClientRects().length>0)??null;if(mobile)element.showModal();else element.show();}else if(opener.current){const target=opener.current.isConnected&&opener.current.getClientRects().length>0?opener.current:Array.from(document.querySelectorAll<HTMLElement>('[data-chat-opener]')).find(element=>element.getClientRects().length>0);target?.focus();opener.current=null;}},[open,mobile]);
 useEffect(()=>{if(!mobile||!window.visualViewport)return;const viewport=window.visualViewport,update=()=>{dialog.current?.style.setProperty('--chat-viewport-height',viewport.height+'px');dialog.current?.style.setProperty('--chat-viewport-top',viewport.offsetTop+'px');};update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);dialog.current?.style.removeProperty('--chat-viewport-height');dialog.current?.style.removeProperty('--chat-viewport-top');};},[mobile]);
 const close=()=>chat.closeChat();
 return <div className={'chat-center'+(/^\/(cart|checkout|products)(\/|$)/.test(location.pathname)?' chat-center-purchase':'')} hidden={excluded}>
  <dialog id="chat-center-dialog" ref={dialog} className="chat-dialog" aria-label="Trung tâm chat" aria-modal={open&&mobile?true:undefined} onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}}>
   <header className="chat-header"><div><MessageCircle size={21}/><strong>Trung tâm chat</strong></div><div><button aria-label="Mở trang Tin nhắn" title="Mở trang Tin nhắn" onClick={()=>{chat.closeChat();navigate(ui.tab==='store'&&ui.conversationId?'/customer/messages/'+ui.conversationId:'/customer/messages');}}><ArrowUpRight size={19}/></button><button aria-label="Thu nhỏ chat" title="Thu nhỏ" onClick={()=>chat.minimizeChat()}><Minus size={19}/></button><button aria-label="Đóng chat" title="Đóng" onClick={close}><X size={21}/></button></div></header>
   <div className="chat-tabs" role="tablist" aria-label="Kênh trò chuyện" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tab=event.key==='Home'?'ai':event.key==='End'?'store':ui.tab==='ai'?'store':'ai';chat.openChat({tab});document.getElementById('chat-tab-'+tab)?.focus();}}><button id="chat-tab-ai" role="tab" tabIndex={ui.tab==='ai'?0:-1} aria-controls="chat-ai" aria-selected={ui.tab==='ai'} onClick={()=>chat.openChat({tab:'ai'})}><Bot size={18}/>Trợ lý AI</button><button id="chat-tab-store" role="tab" tabIndex={ui.tab==='store'?0:-1} aria-controls="chat-store" aria-selected={ui.tab==='store'} onClick={()=>chat.openChat({tab:'store'})}><Store size={18}/>Gian hàng</button></div>
   <section role="tabpanel" id="chat-ai" aria-labelledby="chat-tab-ai" hidden={ui.tab!=='ai'}><AiChatPanel active={open&&visible&&ui.tab==='ai'}/></section>
   <section role="tabpanel" id="chat-store" aria-labelledby="chat-tab-store" hidden={ui.tab!=='store'}>{customer?<MessagesWorkspace scope="CUSTOMER" id={ui.conversationId} compact active={open&&visible&&ui.tab==='store'} onSelect={conversationId=>chat.openChat({tab:'store',conversationId})}/>:<div className="chat-signin"><Store size={32}/><h2>Trao đổi với gian hàng</h2><p>Đăng nhập để hỏi về sản phẩm và xem các hội thoại của bạn.</p><Link className="ui-button ui-button-primary" to="/login" onClick={close}>Đăng nhập để nhắn tin</Link></div>}</section>
  </dialog>
 </div>;
}
