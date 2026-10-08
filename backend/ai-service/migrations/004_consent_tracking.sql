CREATE TABLE event_entity_state (
  kind text NOT NULL, entity_id uuid NOT NULL, version bigint NOT NULL CHECK(version>=0),
  payload jsonb NOT NULL, PRIMARY KEY(kind,entity_id)
);
CREATE TABLE behavior_dataset_revision (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), version bigint NOT NULL DEFAULT 0
);
INSERT INTO behavior_dataset_revision(singleton) VALUES(true);
