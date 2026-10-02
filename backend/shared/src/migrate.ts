import { Client } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { required } from './config';
const services: Record<string,string>={M1:'catalog-service',M2:'commerce-service',M3:'identity-store-service',M4:'ai-service'};
async function main() {
  for(const id of ['M3','M1','M2','M4']) {
    const client=new Client({connectionString:required(`${id}_DATABASE_URL`)}); await client.connect();
    await client.query('CREATE TABLE IF NOT EXISTS schema_migration(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    await client.query('SELECT pg_advisory_lock(721602)');
    try {
      const folder=resolve(process.cwd(),services[id],'migrations');
      for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort()) {
        if((await client.query('SELECT 1 FROM schema_migration WHERE version=$1',[file])).rowCount) continue;
        await client.query('BEGIN');
        try {await client.query(readFileSync(resolve(folder,file),'utf8')); await client.query('INSERT INTO schema_migration(version) VALUES($1)',[file]); await client.query('COMMIT'); console.log(`${id}: applied ${file}`);}
        catch(error) {await client.query('ROLLBACK'); throw error;}
      }
    } finally {await client.query('SELECT pg_advisory_unlock(721602)'); await client.end();}
  }
}
main().catch(error=>{console.error('Migration failed:',error instanceof Error ? error.message : 'unknown');process.exit(1);});
