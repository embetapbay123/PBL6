-- Store staff share one inbox. Existing messages are initialized as read because
-- historical per-Store read state was never recorded. No message is removed.
ALTER TABLE store_conversation ADD COLUMN store_message_sequence bigint NOT NULL DEFAULT 0;
ALTER TABLE store_conversation ADD COLUMN store_read_sequence bigint NOT NULL DEFAULT 0;
ALTER TABLE store_conversation ADD COLUMN store_archived_at timestamptz;
ALTER TABLE store_message ADD COLUMN store_sequence bigint;

WITH ranked AS (
  SELECT id, conversation_id, row_number() OVER (PARTITION BY conversation_id ORDER BY created_at,id) AS seq
  FROM store_message
)
UPDATE store_message m SET store_sequence=ranked.seq FROM ranked WHERE m.id=ranked.id;

UPDATE store_conversation c SET store_message_sequence=v.max_seq,store_read_sequence=v.max_seq
FROM (SELECT conversation_id,max(store_sequence) AS max_seq FROM store_message GROUP BY conversation_id) v
WHERE c.id=v.conversation_id;

CREATE UNIQUE INDEX store_message_sequence_unique ON store_message(conversation_id,store_sequence) WHERE store_sequence IS NOT NULL;
CREATE INDEX store_message_unread_customer ON store_message(conversation_id,store_sequence) WHERE sender_side='CUSTOMER';

-- The trigger also protects messages written by an older application instance
-- during a rolling deployment. The conversation row serializes read/send order.
CREATE FUNCTION assign_store_message_sequence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE store_conversation SET store_message_sequence=store_message_sequence+1,
    store_archived_at=CASE WHEN NEW.sender_side='CUSTOMER' THEN NULL ELSE store_archived_at END
  WHERE id=NEW.conversation_id RETURNING store_message_sequence INTO NEW.store_sequence;
  RETURN NEW;
END $$;
CREATE TRIGGER store_message_assign_sequence BEFORE INSERT ON store_message
FOR EACH ROW EXECUTE FUNCTION assign_store_message_sequence();
ALTER TABLE store_message ALTER COLUMN store_sequence SET NOT NULL;
