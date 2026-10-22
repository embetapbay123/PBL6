// Transport controls use actual producer outbox envelopes from the private acceptance stack.
const amqp = require('amqplib');
function envelope(row, producer) {
  return { event_id: row.id, event_type: row.event_type, schema_version: '1.0', producer,
    occurred_at: row.created_at.toISOString(), correlation_id: row.correlation_id, payload: row.payload };
}
async function broker(work) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  try {
    const channel = await connection.createConfirmChannel();
    let returned = false;
    channel.on('return', () => { returned = true; });
    const publish = async (event, route = event.event_type) => {
      channel.publish('pbl6.events', route, Buffer.from(JSON.stringify(event)), {
        persistent: true, mandatory: true, messageId: event.event_id,
      });
      await channel.waitForConfirms();
      if (returned) throw new Error('CHECK_FAILED:Acceptance event was not routed');
    };
    await work({ channel, publish });
    await channel.close();
  } finally { await connection.close(); }
}
module.exports = { envelope, broker };
