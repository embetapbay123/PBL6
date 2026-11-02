import {useEffect,useRef,useState} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';

/** Follow explicit deep links once their asynchronous content exists, without following polling. */
export function RouteFocus(){
 const location=useLocation(),navigation=useNavigationType(),previous=useRef<{path:string;hash:string;screen:string}|undefined>(undefined),[notice,setNotice]=useState('');
 useEffect(()=>{
  const screen=location.pathname==='/admin'?location.pathname+'?tab='+(new URLSearchParams(location.search).get('tab')??'dashboard'):location.pathname;
  const before=previous.current,mark=()=>{previous.current={path:location.pathname,hash:location.hash,screen};};setNotice('');
  const routeChanged=!!before&&before.screen!==screen,hashChanged=!before||before.hash!==location.hash;
  const active=document.activeElement;
  const clickedAgain=active instanceof HTMLAnchorElement&&active.hash===location.hash&&active.pathname===location.pathname;
  if(!location.hash&&(!routeChanged||navigation==='POP')){mark();return;}
  if(location.hash&&!routeChanged&&!hashChanged&&!clickedAgain){mark();return;}
  const main=document.getElementById('main-content');if(!main)return;
  let id:string|undefined;
  if(location.hash){try{id=decodeURIComponent(location.hash.slice(1));}catch{setNotice('Liên kết đến phần nội dung không hợp lệ.');return;}}
  let frame:number|undefined;
  let stopped=false,observer:MutationObserver|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{stopped=true;observer?.disconnect();if(frame!==undefined)cancelAnimationFrame(frame);if(timer)clearTimeout(timer);document.removeEventListener('pointerdown',interrupted,true);document.removeEventListener('keydown',interrupted,true);document.removeEventListener('wheel',interrupted,true);document.removeEventListener('touchstart',interrupted,true);};
  const interrupted=(event:Event)=>{if(event.isTrusted){mark();stop();}};
  const follow=()=>{
   if(stopped||document.querySelector('dialog[open][aria-modal="true"]'))return false;
   const target=id?document.getElementById(id):(main.querySelector<HTMLElement>('.admin-workspace > section h1,.admin-workspace > section h2,.admin-workspace > section h3')??main.querySelector<HTMLElement>('h1,h2'));
   if(!target||!(target instanceof HTMLElement)||!main.contains(target)&&target!==main||!target.getClientRects().length)return false;
   const heading=target.matches('form')?target.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)'):target.matches('h1,h2,h3,h4')?target:target.querySelector<HTMLElement>('h1,h2,h3,h4,legend');
   const focus=heading??target;
   if(!focus.matches('a[href],input,select,textarea,button,[tabindex]'))focus.setAttribute('tabindex','-1');
   focus.focus({preventScroll:true});
   if(id)target.scrollIntoView({block:'start',behavior:'instant'});else window.scrollTo({top:0,left:0,behavior:'instant'});
   mark();stop();return true;
  };
  const schedule=()=>{if(frame!==undefined)cancelAnimationFrame(frame);frame=requestAnimationFrame(follow);};
  schedule();
  observer=new MutationObserver(schedule);observer.observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style','id']});
  document.addEventListener('pointerdown',interrupted,true);document.addEventListener('keydown',interrupted,true);document.addEventListener('wheel',interrupted,{capture:true,passive:true});document.addEventListener('touchstart',interrupted,{capture:true,passive:true});
  timer=setTimeout(()=>{mark();if(id&&!stopped)setNotice('Phần được liên kết hiện chưa sẵn sàng. Kiểm tra trạng thái hoặc các thao tác được phép trên màn hình này.');stop();},10000);
  return stop;
 },[location.key,location.pathname,location.hash,navigation]);
 return notice?<p className="route-focus-notice" role="status">{notice}</p>:null;
}
