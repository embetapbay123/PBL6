import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Only load the seed password for test input; never log config/secrets.
try {
  const env=readFileSync(resolve(process.cwd(),'../infrastructure/.env'),'utf8');
  process.env.SEED_PASSWORD ??= env.match(/^SEED_PASSWORD=(.+)$/m)?.[1].trim();
} catch { /* CI can supply SEED_PASSWORD directly. */ }
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,retries:0,reporter:'list',use:{baseURL:process.env.WEB_TEST_URL ?? 'http://localhost:8080',browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL,viewport:{width:1280,height:800},screenshot:'only-on-failure',trace:'off'}});
