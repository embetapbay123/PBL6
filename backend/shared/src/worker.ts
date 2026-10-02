import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import { initializeDatabase,database } from './database';
import { required } from './config';
import { applyEvent,validSampleEnvelope } from './events';
async function main() {
  await initializeDatabase();
  const id=required('SERVICE_ID');const connection=await amqp.connect(required('RABBITMQ_URL'));
  const channel=await connection.createConfirmChannel();
  await channel.assertExchange('pbl6.events','topic',{durable:true});
  const queue=`pbl6.${id.toLowerCase()}.bootstrap.v1`;
  await channel.assertExchange('pbl6.dead','direct',{durable:true});
  await channel.assertQueue(queue+'.dead',{durable:true});await channel.bindQueue(queue+'.dead','pbl6.dead',queue);
  await channel.assertQueue(queue,{durable:true,arguments:{'x-dead-letter-exchange':'pbl6.dead','x-dead-letter-routing-key':queue}});await channel.bindQueue(queue,'pbl6.events','bootstrap.example.v1');await channel.prefetch(1);
  const returned=new Set<string>();channel.on('return',message=>{if(message.properties.messageId)returned.add(message.properties.messageId);});
  await channel.consume(queue,async message=>{
    if(!message) return;
    try {
      let event:any;
      try {event=JSON.parse(message.content.toString());} catch {channel.nack(message,false,false);return;}
      if(!validSampleEnvelope(event)) {channel.nack(message,false,false);return;}
      await database.transaction(m=>applyEvent(m,event.producer,event.event_id,async()=>{await m.query('INSERT INTO bootstrap_effect(event_id) VALUES($1) ON CONFLICT DO NOTHING',[event.event_id]);}));
      channel.ack(message);
    } catch {await new Promise(r=>setTimeout(r,1000));channel.nack(message,false,true);}
  },{noAck:false});
  let running=false;
  const tick=async()=>{
    if(running) return;running=true;
    try {
      await database.transaction(async m=>{
        const rows=await m.query('SELECT * FROM outbox WHERE published_at IS NULL AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20');
        for(const row of rows) {
          try {
            const event={event_id:row.id,event_type:row.event_type,schema_version:'1.0',producer:id,occurred_at:row.created_at,correlation_id:row.correlation_id,payload:row.payload};
            returned.delete(row.id);
            channel.publish('pbl6.events',row.event_type,Buffer.from(JSON.stringify(event)),{persistent:true,mandatory:true,messageId:row.id});
            await channel.waitForConfirms();
            if(returned.has(row.id)) throw new Error('No consumer route');
            await m.query('UPDATE outbox SET published_at=now() WHERE id=$1',[row.id]);
          } catch {
            const delay=Math.min(300,2**Math.min(row.attempts,8))+Math.random();
            await m.query("UPDATE outbox SET attempts=attempts+1,next_attempt_at=now()+$2*interval '1 second' WHERE id=$1",[row.id,delay]);
            process.stdout.write(JSON.stringify({level:'warn',service:id,code:'OUTBOX_RETRY',correlation_id:row.correlation_id})+'\n');
          }
        }
      });
    } catch {console.error(JSON.stringify({service:id,code:'WORKER_DEPENDENCY_UNAVAILABLE'}));} finally {running=false;}
  };
  const timer=setInterval(tick,1000);await tick();
  const close=async()=>{clearInterval(timer);while(running) await new Promise(r=>setTimeout(r,20));await channel.close();await connection.close();await database.destroy();process.exit(0);};
  process.on('SIGTERM',close);process.on('SIGINT',close);
  console.log(JSON.stringify({service:id,status:'worker-ready',run_id:randomUUID()}));
}
main().catch(()=>{console.error('Worker startup failed: check configuration/dependencies');process.exit(1);});
