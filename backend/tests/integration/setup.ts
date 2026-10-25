import Redis from 'ioredis';

if (process.env.PBL6_REQUIRE_M3_INTEGRATION === '1') {
  const required = ['M3_DATABASE_URL', 'M3_TEST_DATABASE_URL', 'TEST_API_URL', 'SEED_PASSWORD', 'M4_DATABASE_URL', 'REDIS_URL', 'SEED_ADMIN_USER_ID'];
  const missing = required.filter(name => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Required M3 integration prerequisites are missing: ${missing.join(', ')}`);
  let testDb: URL;
  try { testDb = new URL(process.env.M3_TEST_DATABASE_URL!); }
  catch { throw new Error('M3_TEST_DATABASE_URL must be a valid PostgreSQL URL for the isolated m3_test database'); }
  if (testDb.hostname !== 'm3-test-postgres' || testDb.pathname !== '/m3_test' || testDb.username !== 'm3_test') {
    throw new Error('M3_TEST_DATABASE_URL must target the isolated m3_test database on m3-test-postgres as m3_test');
  }
  if (process.env.M3_DATABASE_URL !== process.env.M3_TEST_DATABASE_URL) {
    throw new Error('M3_DATABASE_URL must point to M3_TEST_DATABASE_URL during isolated integration runs');
  }
  if (process.env.TEST_API_URL !== 'http://gateway/api/v1') {
    throw new Error('TEST_API_URL must point to the isolated Compose gateway at http://gateway/api/v1');
  }
}

// CI creates its own disposable Redis. Independent suites must not consume each other's
// brute-force budget; leave the actual application limiter and all other Redis data intact.
// This opt-in must never be used against a shared/demo Redis instance.
beforeAll(async () => {
  if (process.env.PBL6_ISOLATED_TEST_REDIS !== '1') return;
  if (!process.env.REDIS_URL) throw new Error('Isolated integration Redis requires REDIS_URL');
  const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 });
  try {
    await redis.connect();
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'rate:M3:login:*', 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } finally {
    redis.disconnect();
  }
});
