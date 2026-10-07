process.env.SERVICE_ID='M2';
import { initializeDatabase,database } from '../../../shared/src/database';
import { RefundRunner,DisabledRefundProvider } from './refund.runner';

async function main() {
  if((process.env.REFUND_PROVIDER ?? 'disabled')!=='disabled')throw new Error('REFUND_PROVIDER_NOT_IMPLEMENTED');
  await initializeDatabase();
  const runner=new RefundRunner(database,new DisabledRefundProvider());
  if(process.argv.includes('--once')) {
    try {console.log(JSON.stringify({service:'M2',worker:'refund',status:await runner.tick()}));}
    finally {await database.destroy();}
    return;
  }
  let running=false,closing=false;
  const tick=async()=>{if(running || closing)return;running=true;try {await runner.tick();}catch {console.error(JSON.stringify({service:'M2',worker:'refund',code:'REFUND_WORKER_FAILED'}));}finally {running=false;}};
  const timer=setInterval(tick,1000);await tick();
  console.log(JSON.stringify({service:'M2',worker:'refund',provider:'DISABLED',status:'RECONCILIATION_READY'}));
  const close=async()=>{closing=true;clearInterval(timer);while(running)await new Promise(r=>setTimeout(r,20));await database.destroy();process.exit(0);};
  process.once('SIGTERM',close);process.once('SIGINT',close);
}
main().catch(()=>{console.error('Refund worker startup failed: check migrations/configuration.');process.exitCode=1;});
