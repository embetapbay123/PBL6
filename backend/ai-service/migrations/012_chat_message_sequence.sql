-- Preserve the previous deterministic order for legacy rows; timestamps alone
-- cannot recover the true order of old messages written in the same transaction.
ALTER TABLE chat_message ADD COLUMN message_sequence bigint;
WITH numbered AS (
  SELECT id,row_number() OVER(ORDER BY created_at,id) AS n FROM chat_message
) UPDATE chat_message m SET message_sequence=numbered.n FROM numbered WHERE m.id=numbered.id;
CREATE SEQUENCE chat_message_sequence OWNED BY chat_message.message_sequence;
SELECT setval('chat_message_sequence',coalesce((SELECT max(message_sequence) FROM chat_message),0)+1,false);
ALTER TABLE chat_message ALTER COLUMN message_sequence SET DEFAULT nextval('chat_message_sequence');
ALTER TABLE chat_message ALTER COLUMN message_sequence SET NOT NULL;
ALTER TABLE chat_message ADD CONSTRAINT chat_message_sequence_unique UNIQUE(message_sequence);
CREATE INDEX chat_message_session_sequence ON chat_message(session_id,message_sequence);
