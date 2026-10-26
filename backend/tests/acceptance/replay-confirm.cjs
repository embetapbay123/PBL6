// Test driver only. Application request clients do not retry commands automatically.
module.exports=async function replayConfirm(request,{token,body,key},{timeoutMs=45000,delayMs=250}={}){
 const deadline=Date.now()+timeoutMs;
 const original=JSON.parse(JSON.stringify(body));
 for(;;){
  try{return await request('confirmCheckout',{token,body:original,headers:{'idempotency-key':key}})}
  catch(error){
   if(error.status!==503||error.code!=='ORDER_RECOVERY_PENDING'||Date.now()>=deadline)throw error;
   await new Promise(resolve=>setTimeout(resolve,delayMs));
  }
 }
};
