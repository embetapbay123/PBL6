-- Historical migration time is not a publication date. Leave old rows unknown.
ALTER TABLE product ADD COLUMN first_published_at timestamptz;
ALTER TABLE product ADD COLUMN publication_tracked boolean NOT NULL DEFAULT false;
CREATE INDEX product_new_publications ON product(store_id,first_published_at DESC,id)
 WHERE status='ACTIVE' AND moderation_status='VISIBLE' AND first_published_at IS NOT NULL;
