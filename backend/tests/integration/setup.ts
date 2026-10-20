import Redis from 'ioredis';

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
