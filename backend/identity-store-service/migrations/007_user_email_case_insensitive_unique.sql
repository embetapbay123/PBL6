-- AUTH-01: prevent case-variant duplicate account creation during concurrent registrations.
CREATE UNIQUE INDEX user_email_lower_unique ON "user" (lower(email));
