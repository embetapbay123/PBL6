const message='Phạm vi Store đã thay đổi. Hãy kiểm tra Store hiện tại và mở lại công việc; yêu cầu cũ không tự được gửi lại.';
let notice:{userId:string;message:string;reviewPending:boolean}|undefined;
const listeners=new Set<()=>void>();
export const subscribeStoreContextNotice=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getStoreContextNotice=(userId?:string)=>notice?.userId===userId?notice?.message:undefined;
export function clearStoreContextNotice(){if(notice){notice=undefined;for(const listener of listeners)listener();}}
export function retainStoreContextNotice(userId?:string){if(notice?.userId!==userId)clearStoreContextNotice();}
export function markStoreContextChanged(userId:string){notice={userId,message,reviewPending:true};for(const listener of listeners)listener();}
export function takeStoreContextReview(userId?:string){if(!notice||notice.userId!==userId||!notice.reviewPending)return false;notice.reviewPending=false;return true;}
