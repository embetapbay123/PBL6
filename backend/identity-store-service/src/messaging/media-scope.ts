import {isIP} from 'node:net';
import {createHmac} from 'node:crypto';
import type {EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';

export type ChatSide='CUSTOMER'|'STORE';
export interface ChatMediaActor {user_id:string;store_membership?:{store_id:string;role:string;status?:string;permissions?:string[]}}
export async function chatParticipant(manager:EntityManager,id:string,actor:ChatMediaActor,side:ChatSide,write=false){
  if(!actor?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
  const member=actor.store_membership;
  if(side==='STORE'&&(!member||member.status!=='ACTIVE'||!['OWNER','SELLER'].includes(member.role)||member.role!=='OWNER'&&!member.permissions?.includes('order.store.read_status_cancel')))
    throw new ApiError(403,'FORBIDDEN','Bạn chưa có quyền truy cập tin nhắn của gian hàng.');
  const [thread]=await manager.query('SELECT c.id,c.customer_user_id,c.store_id,s.status AS store_status FROM store_conversation c JOIN store s ON s.id=c.store_id WHERE c.id=$1',[id]);
  if(!thread||(side==='CUSTOMER'?thread.customer_user_id!==actor.user_id:thread.store_id!==member!.store_id))
    throw new ApiError(404,'NOT_FOUND','Không tìm thấy hội thoại của bạn.');
  if(write&&thread.store_status!=='ACTIVE')throw new ApiError(409,'STORE_UNAVAILABLE','Gian hàng hiện không nhận tin nhắn.');
  return thread;
}

/** A /64 shares IPv6 quota; IPv4-mapped forms share the same IPv4 quota. */
export function chatIpScope(address:string){
  if(isIP(address)===4)return address;
  if(isIP(address)!==6)throw new ApiError(503,'CHAT_CLIENT_IP_UNAVAILABLE','Chưa thể xác định nguồn tải tệp. Hãy thử lại.');
  const expanded=address.toLowerCase().replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/,(_,a,b,c,d)=>(Number(a)*256+Number(b)).toString(16)+':'+(Number(c)*256+Number(d)).toString(16));
  const halves=expanded.split('::'),left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
  const parts=halves.length===1?left:[...left,...Array(8-left.length-right.length).fill('0'),...right];
  const numbers=parts.map(p=>parseInt(p,16));
  if(numbers.slice(0,5).every(n=>n===0)&&numbers[5]===65535)return [numbers[6]>>8,numbers[6]&255,numbers[7]>>8,numbers[7]&255].join('.');
  return numbers.slice(0,4).map(n=>n.toString(16)).join(':')+'::/64';
}
export function chatIpHash(address:string,key:string){
  if(key.length<32)throw new Error('CHAT_IP_SIGNING_KEY_REQUIRED');
  return createHmac('sha256',key).update('chat-upload:'+chatIpScope(address)).digest('hex');
}
