import {callOperation} from './operations';
import type {OperationInputs} from './operations.generated';
export const getCustomerRecommendations=()=>callOperation('getForYou');
export const getRelatedProducts=(id:string,page=1)=>callOperation('getRelatedProducts',{path:{id},query:{page,size:4}});
export const createChatSession=()=>callOperation('createChatSession',{body:{}});
export const listOwnChatSessions=(query:OperationInputs['listOwnChatSessions']['query'])=>callOperation('listOwnChatSessions',{query});
export const sendChatMessage=(id:string,content:string,key?:string)=>callOperation('sendChatMessage',{path:{id},body:{content},...(key?{headers:{'X-Chat-Key':key}}:{})});
