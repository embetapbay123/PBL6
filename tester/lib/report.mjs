import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './config.mjs';

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPE[ch]);

const STATUS_LABEL = {
  passed: 'ĐẠT',
  failed: 'LỖI',
  skipped: 'BỎ QUA',
  known: 'LỖI ĐÃ BIẾT',
};

export function summarize(tests) {
  const counts = { total: tests.length, passed: 0, failed: 0, skipped: 0, known: 0 };
  for (const test of tests) {
    if (counts[test.status] !== undefined) counts[test.status] += 1;
  }
  counts.passRate = counts.total ? Number((((counts.passed + counts.known) / counts.total) * 100).toFixed(2)) : 0;
  return counts;
}

export function formatDuration(ms) {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function badge(status) {
  return `<span class="badge ${status}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

function testRow(test, index) {
  const detail =
    test.error || test.actual || test.notes
      ? `<details class="detail"><summary>Chi tiết</summary>
          ${test.expected ? `<p><strong>Mong đợi:</strong> ${esc(test.expected)}</p>` : ''}
          ${test.actual ? `<p><strong>Thực tế:</strong> ${esc(test.actual)}</p>` : ''}
          ${test.notes ? `<p><strong>Ghi chú:</strong> ${esc(test.notes)}</p>` : ''}
          ${test.error ? `<pre class="error">${esc(test.error)}</pre>` : ''}
          ${test.knownIssue ? `<p><strong>Lỗi đã biết:</strong> ${esc(test.knownIssue)}</p>` : ''}
        </details>`
      : '';
  return `<tr data-status="${esc(test.status)}">
    <td class="num">${index + 1}</td>
    <td class="mono">${esc(test.id)}</td>
    <td>${esc(test.group)}</td>
    <td class="name">${esc(test.name)}${detail}</td>
    <td class="center">${badge(test.status)}</td>
    <td class="right mono">${formatDuration(test.durationMs)}</td>
  </tr>`;
}

function htmlTemplate({ suite, title, target, startedAt, durationMs, summary, tests, meta, reportHref }) {
  const rows = tests.map(testRow).join('\n');
  const metaRows = Object.entries(meta || {})
    .map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`)
    .join('');
  const failureCount = summary.failed;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} | PBL6 Testing</title>
<style>
  :root {
    --bg: #f6f7fb; --card: #ffffff; --ink: #16202f; --muted: #5d6b7f;
    --line: #e3e8f0; --brand: #0f5c9c; --pass: #1a7f4b; --fail: #c0392b;
    --skip: #8a6d1d; --known: #b26a00;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
    font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 20px 60px; }
  header.hero { background: linear-gradient(135deg, #0b2e4f, #0f5c9c 55%, #1d7fb8);
    color: #fff; border-radius: 16px; padding: 26px 30px; box-shadow: 0 12px 30px rgba(15,92,156,.18); }
  header.hero h1 { margin: 0 0 6px; font-size: 25px; letter-spacing: .2px; }
  header.hero p { margin: 2px 0; opacity: .92; font-size: 14px; }
  .hero-grid { display: flex; flex-wrap: wrap; gap: 18px 34px; margin-top: 16px; font-size: 13.5px; }
  .hero-grid b { font-weight: 600; opacity: .75; display: block; font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 20px 0; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .card .label { color: var(--muted); font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; }
  .card .value { font-size: 25px; font-weight: 700; margin-top: 4px; }
  .card.pass .value { color: var(--pass); } .card.fail .value { color: var(--fail); }
  .card.skip .value { color: var(--skip); } .card.rate .value { color: var(--brand); }
  .progress { height: 10px; border-radius: 99px; background: #e6ebf3; overflow: hidden; display: flex; }
  .progress span { display: block; height: 100%; }
  .progress .p { background: #22a06b; } .progress .k { background: #e8a33d; } .progress .f { background: #d64541; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 18px 0 10px; }
  .toolbar button { border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 999px;
    padding: 7px 14px; font-size: 13px; cursor: pointer; }
  .toolbar button.active { background: var(--brand); border-color: var(--brand); color: #fff; }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line);
    border-radius: 12px; overflow: hidden; font-size: 13.5px; }
  thead th { background: #eef3f9; text-align: left; padding: 11px 12px; font-size: 12px;
    text-transform: uppercase; letter-spacing: .06em; color: #35506d; }
  tbody td { border-top: 1px solid var(--line); padding: 11px 12px; vertical-align: top; }
  tbody tr:hover { background: #f8fbff; }
  td.num, td.right { text-align: right; } td.center { text-align: center; }
  td.mono, .mono { font-family: "Cascadia Code", Consolas, monospace; font-size: 12.5px; }
  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .03em; }
  .badge.passed { background: #e3f5ec; color: var(--pass); }
  .badge.failed { background: #fde8e6; color: var(--fail); }
  .badge.skipped { background: #fbf1d8; color: var(--skip); }
  .badge.known { background: #fff0d6; color: var(--known); }
  .name { max-width: 560px; }
  details.detail { margin-top: 6px; color: var(--muted); }
  details.detail summary { cursor: pointer; font-size: 12.5px; color: var(--brand); }
  details.detail p { margin: 5px 0; font-size: 12.5px; }
  pre.error { white-space: pre-wrap; background: #fff5f5; border: 1px solid #f3c9c5; color: #8f2c22;
    padding: 8px 10px; border-radius: 8px; font-size: 12px; margin: 6px 0 0; }
  .meta { margin-top: 26px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
  .meta dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px 24px; margin: 0; }
  .meta dt { color: var(--muted); font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; }
  .meta dd { margin: 2px 0 0; font-size: 13px; word-break: break-all; }
  footer { margin-top: 22px; color: var(--muted); font-size: 12.5px; }
  .hidden { display: none !important; }
  @media print { body { background: #fff; } header.hero { box-shadow: none; } .toolbar { display: none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1>${esc(title)}</h1>
    <p>PBL6 Multi-Store Marketplace · Báo cáo kiểm thử tự động</p>
    <div class="hero-grid">
      <div><b>Mã suite</b>${esc(suite)}</div>
      <div><b>Server kiểm thử</b>${esc(target)}</div>
      <div><b>Bắt đầu</b>${esc(startedAt)}</div>
      <div><b>Thời gian</b>${esc(formatDuration(durationMs))}</div>
      <div><b>Tỷ lệ đạt</b>${esc(summary.passRate)}%</div>
    </div>
  </header>

  <section class="cards">
    <div class="card"><div class="label">Tổng test case</div><div class="value">${summary.total}</div></div>
    <div class="card pass"><div class="label">Đạt</div><div class="value">${summary.passed}</div></div>
    <div class="card fail"><div class="label">Lỗi</div><div class="value">${summary.failed}</div></div>
    <div class="card skip"><div class="label">Bỏ qua</div><div class="value">${summary.skipped}</div></div>
    <div class="card"><div class="label">Lỗi đã biết</div><div class="value">${summary.known}</div></div>
    <div class="card rate"><div class="label">Đạt + đã biết</div><div class="value">${summary.passRate}%</div></div>
  </section>

  <div class="progress" aria-label="Tiến độ">
    <span class="p" style="width:${summary.total ? (summary.passed / summary.total) * 100 : 0}%"></span>
    <span class="k" style="width:${summary.total ? (summary.known / summary.total) * 100 : 0}%"></span>
    <span class="f" style="width:${summary.total ? (summary.failed / summary.total) * 100 : 0}%"></span>
  </div>

  <div class="toolbar">
    <button class="active" data-filter="all">Tất cả (${summary.total})</button>
    <button data-filter="passed">Đạt (${summary.passed})</button>
    <button data-filter="failed">Lỗi (${summary.failed})</button>
    <button data-filter="skipped">Bỏ qua (${summary.skipped})</button>
    <button data-filter="known">Lỗi đã biết (${summary.known})</button>
    ${reportHref ? `<a href="${esc(reportHref)}" style="margin-left:auto;font-size:13px">Báo cáo chi tiết khác →</a>` : ''}
  </div>

  <table id="tests">
    <thead><tr>
      <th style="width:44px">#</th><th style="width:120px">Mã</th><th style="width:180px">Nhóm</th>
      <th>Nội dung kiểm thử</th><th style="width:120px" class="center">Kết quả</th>
      <th style="width:92px" class="right">Thời gian</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Không có test case.</td></tr>'}</tbody>
  </table>

  ${
    metaRows
      ? `<section class="meta"><h3 style="margin:0 0 12px;font-size:15px">Thông tin cấu hình</h3><dl>${metaRows}</dl></section>`
      : ''
  }
  <footer>${failureCount > 0 ? '⚠ Có test case thất bại — xem chi tiết ở cột Nội dung kiểm thử.' : '✓ Không có test case thất bại.'} Báo cáo sinh tự động bởi <span class="mono">tester/lib/report.mjs</span>.</footer>
</div>
<script>
  const buttons = document.querySelectorAll('.toolbar button[data-filter]');
  const rows = Array.from(document.querySelectorAll('#tests tbody tr'));
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    buttons.forEach((b) => b.classList.toggle('active', b === btn));
    const filter = btn.dataset.filter;
    rows.forEach((row) => row.classList.toggle('hidden', filter !== 'all' && row.dataset.status !== filter));
  }));
</script>
</body>
</html>`;
}

function junitEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function junitXml({ suite, title, tests, summary, durationMs }) {
  const cases = tests
    .map((test) => {
      const time = ((test.durationMs || 0) / 1000).toFixed(3);
      const body =
        test.status === 'failed'
          ? `<failure message="${junitEscape(test.error || 'failed').slice(0, 900)}">${junitEscape(test.error || '')}</failure>`
          : test.status === 'skipped'
            ? '<skipped />'
            : '';
      return `  <testcase classname="${junitEscape(`${suite}.${test.group}`)}" name="${junitEscape(`[${test.id}] ${test.name}`)}" time="${time}">${body}</testcase>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${junitEscape(title)}" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${(durationMs / 1000).toFixed(3)}">
<testsuite name="${junitEscape(title)}" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" errors="0" time="${(durationMs / 1000).toFixed(3)}">
${cases}
</testsuite>
</testsuites>
`;
}

/**
 * Ghi báo cáo JSON + HTML + JUnit cho một suite.
 * `tests`: [{ id, group, name, status, durationMs, expected, actual, notes, error, knownIssue }]
 */
export function writeSuiteReport({
  outputDir,
  suite,
  title,
  target,
  startedAt = new Date(),
  durationMs,
  tests,
  meta = {},
  reportHref,
  writeHtml = true,
}) {
  ensureDir(outputDir);
  const summary = summarize(tests);
  const iso =
    startedAt instanceof Date ? startedAt.toISOString() : new Date(startedAt).toISOString();
  const result = {
    suite,
    title,
    target,
    startedAt: iso,
    finishedAt: new Date().toISOString(),
    durationMs,
    summary,
    report: reportHref || `${suite}.html`,
    tests,
  };
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(outputDir, `${suite}-junit.xml`),
    junitXml({ suite, title, tests, summary, durationMs }),
    'utf8',
  );
  if (writeHtml) {
    fs.writeFileSync(
      path.join(outputDir, `${suite}.html`),
      htmlTemplate({
        suite,
        title,
        target,
        startedAt: iso.replace('T', ' ').slice(0, 19),
        durationMs,
        summary,
        tests,
        meta,
        reportHref,
      }),
      'utf8',
    );
  }
  return { summary, result };
}

/** Sinh trang tổng hợp từ tất cả result.json đã có. */
export function writeIndex(reportsDir, { title = 'PBL6 Testing — Tổng hợp kết quả' } = {}) {
  if (!fs.existsSync(reportsDir)) return null;
  const entries = [];
  for (const name of fs.readdirSync(reportsDir)) {
    const file = path.join(reportsDir, name, 'result.json');
    if (!fs.existsSync(file)) continue;
    try {
      entries.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch {
      /* bỏ qua file hỏng */
    }
  }
  const order = ['unit', 'api', 'web', 'load', 'security'];
  entries.sort((a, b) => order.indexOf(a.suite) - order.indexOf(b.suite));
  const totals = entries.reduce(
    (acc, entry) => {
      for (const key of ['total', 'passed', 'failed', 'skipped', 'known']) acc[key] += entry.summary[key] || 0;
      return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, known: 0 },
  );
  totals.passRate = totals.total ? Number((((totals.passed + totals.known) / totals.total) * 100).toFixed(2)) : 0;
  const cards = entries
    .map((entry) => {
      const s = entry.summary;
      const tone = s.failed > 0 ? 'fail' : 'pass';
      const ownReport = path.join(reportsDir, entry.suite, `${entry.suite}.html`);
      const href = fs.existsSync(ownReport)
        ? `./${entry.suite}/${entry.suite}.html`
        : `./${entry.suite}/${entry.report || `${entry.suite}.html`}`;
      return `<a class="suite ${tone}" href="${esc(href)}">
        <div class="top"><span class="code">${esc(entry.suite.toUpperCase())}</span>
        <span class="rate">${s.passRate}%</span></div>
        <h2>${esc(entry.title)}</h2>
        <p>${esc(entry.target)}</p>
        <div class="mini">
          <span>${s.total} test</span><span class="ok">${s.passed} đạt</span>
          ${s.failed ? `<span class="bad">${s.failed} lỗi</span>` : ''}
          ${s.skipped ? `<span>${s.skipped} bỏ qua</span>` : ''}
          ${s.known ? `<span class="warn">${s.known} đã biết</span>` : ''}
        </div>
        <div class="bar"><i style="width:${s.passRate}%"></i></div>
      </a>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  :root { --bg:#f5f7fb; --card:#fff; --line:#e2e8f1; --ink:#16202f; --muted:#5d6b7f; --brand:#0f5c9c; }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI",system-ui,Arial,sans-serif}
  .wrap{max-width:1100px;margin:0 auto;padding:28px 20px 60px}
  header.hero{background:linear-gradient(135deg,#0b2e4f,#0f5c9c 55%,#1d7fb8);color:#fff;border-radius:16px;padding:26px 30px}
  header.hero h1{margin:0 0 6px;font-size:24px} header.hero p{margin:0;opacity:.9;font-size:14px}
  .totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:18px 0}
  .totals div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 16px}
  .totals b{display:block;font-size:22px} .totals span{color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.07em}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:18px}
  .suite{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}
  .suite:hover{border-color:#9cc4e8;box-shadow:0 8px 22px rgba(15,92,156,.10)}
  .suite .top{display:flex;justify-content:space-between;align-items:center}
  .suite .code{font:600 12px "Cascadia Code",Consolas,monospace;color:var(--brand);letter-spacing:.08em}
  .suite .rate{font-weight:700;font-size:18px;color:#1a7f4b}
  .suite.fail .rate{color:#c0392b}
  .suite h2{font-size:16px;margin:8px 0 4px} .suite p{margin:0 0 12px;color:var(--muted);font-size:12.5px;word-break:break-all}
  .mini{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:12.5px;color:var(--muted)}
  .mini .ok{color:#1a7f4b} .mini .bad{color:#c0392b;font-weight:600} .mini .warn{color:#b26a00}
  .bar{height:7px;background:#e8edf5;border-radius:99px;margin-top:12px;overflow:hidden}
  .bar i{display:block;height:100%;background:#22a06b} .suite.fail .bar i{background:#d64541}
  footer{margin-top:22px;color:var(--muted);font-size:12.5px}
</style></head><body><div class="wrap">
<header class="hero"><h1>PBL6 Testing — Tổng hợp kết quả</h1>
<p>Cập nhật: ${esc(new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }))} · Mở từng thẻ để xem báo cáo chi tiết.</p></header>
<div class="totals">
  <div><span>Tổng test case</span><b>${totals.total}</b></div>
  <div><span>Đạt</span><b style="color:#1a7f4b">${totals.passed}</b></div>
  <div><span>Lỗi</span><b style="color:#c0392b">${totals.failed}</b></div>
  <div><span>Bỏ qua</span><b style="color:#8a6d1d">${totals.skipped}</b></div>
  <div><span>Lỗi đã biết</span><b style="color:#b26a00">${totals.known}</b></div>
  <div><span>Tỷ lệ đạt</span><b style="color:#0f5c9c">${totals.passRate}%</b></div>
</div>
<div class="grid">${cards || '<p>Chưa có báo cáo. Hãy chạy: <code>tester\\DEMO_KIEM_THU.bat</code></p>'}</div>
<footer>Sinh bởi tester/run-tests.mjs · Dữ liệu chi tiết: reports/&lt;suite&gt;/result.json</footer>
</div></body></html>`;
  const file = path.join(reportsDir, 'index.html');
  fs.writeFileSync(file, html, 'utf8');
  return { file, totals, entries };
}

/** Đọc kết quả Playwright JSON và chuyển về định dạng test chung. */
export function fromPlaywrightJson(data) {
  const tests = [];
  const walk = (suite, prefix = []) => {
    const group = [...prefix, suite.title].filter(Boolean).join(' › ');
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = (test.results || [])[0] || {};
        const status =
          result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed';
        tests.push({
          id: `UI-${String(tests.length + 1).padStart(3, '0')}`,
          group,
          name: spec.title,
          status,
          durationMs: result.duration ?? 0,
          error: result.error?.message ? String(result.error.message).slice(0, 4000) : undefined,
          actual: result.status ? `Playwright: ${result.status}` : undefined,
        });
      }
    }
    for (const child of suite.suites || []) walk(child, [...prefix, suite.title]);
  };
  for (const suite of data.suites || []) walk(suite);
  const stats = data.stats || {};
  return {
    tests,
    durationMs: (stats.duration ?? 0) / 1,
    startedAt: stats.startTime ? new Date(stats.startTime) : new Date(),
  };
}
