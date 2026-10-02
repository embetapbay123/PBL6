import 'dotenv/config';
import { readFileSync } from 'node:fs';
export type ServiceId = 'M1' | 'M2' | 'M3';
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export function integer(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid configuration: ${name}`);
  return value;
}
export function config(id: ServiceId) {
  const internalKeys = Object.fromEntries(['M1', 'M2', 'M3', 'M4'].map(key => [key, required(`${key}_INTERNAL_KEY`)]));
  return {
    id, databaseUrl: required(`${id}_DATABASE_URL`), redisUrl: required('REDIS_URL'),
    identityUrl: required('IDENTITY_URL'), catalogUrl: required('CATALOG_URL'),
    publicKey: readFileSync(required('JWT_PUBLIC_KEY_FILE'), 'utf8'),
    internalKeys, audience: 'pbl6-clients', issuer: 'pbl6-identity',
    port: integer('PORT', { M1: 3101, M2: 3102, M3: 3103 }[id]),
    secureCookie: process.env.COOKIE_SECURE !== 'false', origin: required('WEB_ORIGIN'),
  };
}
