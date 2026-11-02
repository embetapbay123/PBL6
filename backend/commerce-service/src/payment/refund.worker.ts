import {IntegrationRefundProvider} from './integration-provider';
process.env.SERVICE_ID='M2';
import { initializeDatabase,database } from '../../../shared/src/database';
import { RefundRunner,DisabledRefundProvider } from './refund.runner';

async function main() {
  const mode=process.env.REFUND_PROVIDER??'disabled';
  if(!['disabled','integration'].includes(mode))throw new Error('REFUND_PROVIDER_NOT_IMPLEMENTED');
  const provider=mode==='integration'?new IntegrationRefundProvider():new DisabledRefundProvider();
  await initializeDatabase();
  const runner=new RefundRunner(database,provider);
  if(process.argv.includes('--once')) {
    try {await runner.enqueueDeliveryRefunds();await runner.enqueueReturnRefunds();console.log(JSON.stringify({service:'M2',worker:'refund',status:await runner.tick()}));}
    finally {await database.destroy();}
    return;
  }
  let running=false,closing=false;
  const tick=async()=>{if(running || closing)return;running=true;try {await runner.enqueueDeliveryRefunds();await runner.enqueueReturnRefunds();await runner.tick();}catch {console.error(JSON.stringify({service:'M2',worker:'refund',code:'REFUND_WORKER_FAILED'}));}finally {running=false;}};
  const timer=setInterval(tick,1000);await tick();
  console.log(JSON.stringify({service:'M2',worker:'refund',provider:provider.name,status:'RECONCILIATION_READY'}));
  const close=async()=>{closing=true;clearInterval(timer);while(running)await new Promise(r=>setTimeout(r,20));await database.destroy();process.exit(0);};
  process.once('SIGTERM',close);process.once('SIGINT',close);
}
main().catch(()=>{console.error('Refund worker startup failed: check migrations/configuration.');process.exitCode=1;});
