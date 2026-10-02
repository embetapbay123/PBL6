import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { required } from './config';
import { entities as catalogEntities } from '../../catalog-service/src/entities';
import { entities as commerceEntities } from '../../commerce-service/src/entities';
import { entities as identityEntities } from '../../identity-store-service/src/entities';
export let database: DataSource;
export async function initializeDatabase() {
  if (!database) database = new DataSource({ type: 'postgres', url: required(`${process.env.SERVICE_ID}_DATABASE_URL`),
    synchronize: false, entities: ({M1:catalogEntities,M2:commerceEntities,M3:identityEntities} as Record<string,any[]>)[process.env.SERVICE_ID!] ?? [], extra: { max: 10, statement_timeout: 3000 }, logging: false });
  if (!database.isInitialized) await database.initialize();
}
