"""Durable event ingress. Invalid payloads go to DLQ; database failures requeue without PII logs."""
import json, os, logging
import pika
from sqlalchemy import create_engine
from .service import TrackingService, InvalidEvent
from ..runtime_contracts import BUNDLE
from ..consent.domain import retain_recent
log=logging.getLogger('pbl6.tracking')

def main():
    log.setLevel(logging.INFO)
    if not log.handlers:
        handler=logging.StreamHandler();handler.setFormatter(logging.Formatter('%(message)s'));log.addHandler(handler)
    log.propagate=False
    engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1),pool_size=5,max_overflow=0)
    parameters=pika.URLParameters(os.environ['RABBITMQ_URL']);parameters.heartbeat=30;parameters.blocked_connection_timeout=5
    connection=pika.BlockingConnection(parameters);ch=connection.channel()
    queue='pbl6.m4.tracking.v1'
    ch.exchange_declare(exchange='pbl6.events',exchange_type='topic',durable=True)
    ch.exchange_declare(exchange='pbl6.dead',exchange_type='direct',durable=True)
    ch.queue_declare(queue=queue+'.dead',durable=True);ch.queue_bind(queue=queue+'.dead',exchange='pbl6.dead',routing_key=queue)
    ch.queue_declare(queue=queue,durable=True,arguments={'x-dead-letter-exchange':'pbl6.dead','x-dead-letter-routing-key':queue})
    for name in BUNDLE['events']:ch.queue_bind(queue=queue,exchange='pbl6.events',routing_key=name)
    ch.basic_qos(prefetch_count=1)
    service=TrackingService(engine)
    def retention():
        try:
            with engine.begin() as db:retain_recent(db)
        except Exception:log.warning(json.dumps({'service':'M4','code':'RETENTION_RETRY'}))
        connection.call_later(600,retention)
    connection.call_later(1,retention)
    def consume(channel,method,properties,body):
        try:
            if len(body)>262144:raise InvalidEvent()
            event=json.loads(body)
            if event.get('event_type')!=method.routing_key:raise InvalidEvent()
            result=service.ingest(event)
            log.info(json.dumps({'service':'M4','code':result,'correlation_id':event['correlation_id']}))
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except (ValueError,InvalidEvent,AttributeError):channel.basic_nack(delivery_tag=method.delivery_tag,requeue=False)
        except Exception:
            log.warning(json.dumps({'service':'M4','code':'TRACKING_RETRY'}))
            connection.sleep(1);channel.basic_nack(delivery_tag=method.delivery_tag,requeue=True)
    ch.basic_consume(queue=queue,on_message_callback=consume,auto_ack=False)
    try:ch.start_consuming()
    finally:
        if connection.is_open:connection.close()
        engine.dispose()

if __name__=='__main__':main()
