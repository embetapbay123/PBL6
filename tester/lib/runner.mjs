import { writeSuiteReport } from './report.mjs';

/** Chạy một test có giới hạn thời gian. */
function withTimeout(promise, ms, label) {
  if (!ms) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: quá thời gian ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Chạy danh sách test tuần tự, ghi nhận thời gian và sinh báo cáo.
 * Mỗi test: { id, group, name, expected, knownIssue, timeoutMs, run(ctx) }
 */
export async function runTestList({ suite, title, config, outputDir, tests, meta = {}, reportHref }) {
  const startedAt = new Date();
  const started = Date.now();
  const results = [];

  for (const test of tests) {
    const testStarted = Date.now();
    const base = {
      id: test.id,
      group: test.group || 'Khác',
      name: test.name,
      expected: test.expected,
      knownIssue: test.knownIssue,
    };
    try {
      const outcome = (await withTimeout(Promise.resolve(test.run()), test.timeoutMs || config.http.testTimeoutMs || 60000, test.id)) || {};
      if (outcome.skipped) {
        results.push({ ...base, status: 'skipped', durationMs: Date.now() - testStarted, notes: outcome.notes || 'Bỏ qua' });
        process.stdout.write(`  ~ ${test.id} bỏ qua\n`);
        continue;
      }
      results.push({
        ...base,
        status: 'passed',
        durationMs: Date.now() - testStarted,
        actual: outcome.actual,
        notes: outcome.notes,
      });
      process.stdout.write(`  ✓ ${test.id} ${test.name}\n`);
    } catch (error) {
      const failed = {
        ...base,
        durationMs: Date.now() - testStarted,
        error: String(error?.message || error),
        actual: error?.closed ? 'Kết nối bị đóng' : undefined,
      };
      if (test.knownIssue) {
        results.push({ ...failed, status: 'known' });
        process.stdout.write(`  ! ${test.id} lỗi đã biết\n`);
      } else {
        results.push({ ...failed, status: 'failed' });
        process.stdout.write(`  ✗ ${test.id} ${test.name}\n    ${failed.error.slice(0, 220)}\n`);
      }
    }
  }

  const durationMs = Date.now() - started;
  const { summary } = writeSuiteReport({
    outputDir,
    suite,
    title,
    target: config.target.webBaseUrl,
    startedAt,
    durationMs,
    tests: results,
    meta,
    reportHref,
  });
  return { summary, tests: results, durationMs };
}

export { writeSuiteReport };
