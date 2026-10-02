#!/bin/sh
set -eu
for service in m1 m2 m3 m4; do
  case "$service" in
    m1) db_password="$M1_DB_PASSWORD";; m2) db_password="$M2_DB_PASSWORD";;
    m3) db_password="$M3_DB_PASSWORD";; m4) db_password="$M4_DB_PASSWORD";;
  esac
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -v app_user="$service" -v app_pass="$db_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_pass') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'app_user', :'app_user') \gexec
REVOKE CONNECT ON DATABASE :"app_user" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"app_user" TO :"app_user";
SQL
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$service" -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS vector;'
done
