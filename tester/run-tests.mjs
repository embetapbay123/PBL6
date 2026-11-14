#!/usr/bin/env node
/**
 * Bộ điều phối kiểm thử PBL6.
 *
 *   node run-tests.mjs --suite api
 *   node run-tests.mjs --suite all --target demo
 *   node run-tests.mjs --suite web --headless
 *
 * Xem tester/README.md và tester/HUONG_DAN_DOI_CAU_HINH.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { loadConfig, suiteOutputDir, resetDir, ensureDir } from './lib/config.mjs';
import { Session, assert } from './lib/session.mjs';
import { runTestList, writeSuiteReport } from './lib/runner.mjs';
import { fromPlaywrightJson, writeIndex, formatDuration } from './lib/report.mjs';

const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m' };
const paint = (color, text) => `${COLORS[color] || ''}${text}${COLORS.reset}`;

const SUITES = {
  unit: 'Kiểm thử đơn vị (Jest)',
  api: 'Kiểm thử API tự động',
  web: 'Kiểm thử giao diện Web (Playwright)',
  load: 'Kiểm thử tải & hiệu năng (k6)',
  security: 'Kiểm thử bảo mật hộp đen',
};

function parseArgs(argv) {
  const args = { suite: 'all', open: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [flag, inline] = token.split('=');
    const value = inline ?? argv[index + 1];
    switch (flag) {
      case '--suite':
      case '-s':
        args.suite = (inline ?? argv[++index]).toLowerCase();
        break;
      case '--target':
      case '-t':
        args.target = inline ?? argv[++index];
        break;
      case '--headed':
        args.headed = true;
        break;
      case '--headless':
        args.headed = false;
        break;
      case '--slowmo':
        args.slowMoMs = Number(inline ?? argv[++index]);
        break;
      case '--scenario':
        args.scenario = inline ?? argv[++index];
        break;
      case '--no-open':
        args.open = false;
        break;
      case '--list':
        args.list = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        if (token.startsWith('-')) throw new Error(`Tham số không hợp lệ: ${token}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
PBL6 TEST RUNNER
  node run-tests.mjs --suite <unit|api|web|load|security|all> [tuỳ chọn]

Tuỳ chọn:
  --target <demo|local>   Chọn server trong config/server.config.json
  --headed / --headless   Bật/tắt trình duyệt thật cho Web UI test
  --slowmo <ms>           Làm chậm thao tác Playwright
  --scenario <tên>        Kịch bản k6: smoke | load | stress
  --no-open               Không tự mở báo cáo HTML
  --list                  Liệt kê suite
`);
}

function pickSuites(name) {
  if (name === 'all') return ['unit', 'api', 'web', 'load', 'security'];
  if (!SUITES[name]) throw new Error(`Suite "${name}" không hợp lệ. Chọn: ${Object.keys(SUITES).join(', ')} hoặc all`);
  return [name];
}

function banner(config) {
  console.log('');
  console.log(paint('cyan', '='.repeat(78)));
  console.log(paint('cyan', '  PBL6 MULTI-STORE MARKETPLACE — AUTOMATED TEST SUITE'));
  console.log(paint('cyan', '='.repeat(78)));
  console.log(`  Server   : ${config.target.label || config.targetName}`);
  console.log(`  Web      : ${config.target.webBaseUrl}`);
  console.log(`  API      : ${config.target.apiBaseUrl}`);
  console.log(`  Báo cáo  : ${config.reportsDir}`);
  console.log(paint('cyan', '='.repeat(78)));
}

function runStreaming(command, args, { cwd, env, logFile } = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
  const forward = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    log?.write(text);
  };
  child.stdout.on('data', forward);
  child.stderr.on('data', forward);
  return new Promise((resolve) => {
    child.on('error', (error) => {
      log?.end();
      resolve({ code: 127, error });
    });
    child.on('close', (code) => {
      log?.end();
      resolve({ code: code ?? 0 });
    });
  });
}

// --------------------------------------------------------------------- UNIT
async function runUnit(config) {
  const outDir = resetDir(suiteOutputDir(config, 'unit'));
  const backend = path.join(config.repoRoot, 'backend');
  const jestBin = path.join(backend, 'node_modules', 'jest', 'bin', 'jest.js');
  if (!fs.existsSync(jestBin)) {
    throw new Error(`Không tìm thấy Jest tại ${jestBin}. Chạy "npm --prefix backend install" trước.`);
  }
  const resultFile = path.join(outDir, 'jest-result.json');
  const suiteFiles = config.unit.suiteFiles || [];
  const args = [jestBin, '--runInBand', '--json', `--outputFile=${resultFile}`, ...suiteFiles];
  console.log(paint('gray', `\n[unit] ${suiteFiles.length} suite · backend/jest\n`));
  const run = spawnSync(process.execPath, args, { cwd: backend, stdio: 'inherit' });
  if (!fs.existsSync(resultFile)) {
    throw new Error('Jest không tạo được file kết quả JSON. Xem log phía trên.');
  }
  const raw = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  const tests = [];
  for (const file of raw.testResults || []) {
    const group = path.basename(file.name).replace(/\.test\.ts$/, '');
    for (const assertion of file.assertionResults || []) {
      const status =
        assertion.status === 'passed' ? 'passed' : assertion.status === 'pending' ? 'skipped' : 'failed';
      tests.push({
        id: `UNIT-${String(tests.length + 1).padStart(3, '0')}`,
        group,
        name: assertion.fullName || assertion.title,
        status,
        durationMs: assertion.duration || 0,
        error: (assertion.failureMessages || []).join('\n').slice(0, 4000) || undefined,
      });
    }
  }
  const durationMs =
    (raw.testResults || []).reduce((max, file) => Math.max(max, file.endTime || 0), 0) -
    (raw.startTime || Date.now());
  const { summary } = writeSuiteReport({
    outputDir: outDir,
    suite: 'unit',
    title: 'Kiểm thử đơn vị (Jest)',
    target: 'backend/tests/unit',
    startedAt: raw.startTime || Date.now(),
    durationMs: Math.max(0, durationMs),
    tests,
    meta: {
      'Lệnh': `jest --runInBand ${suiteFiles.join(' ')}`,
      'Số test suite': String((raw.testResults || []).length),
      'Kết quả Jest': `${raw.numPassedTests}/${raw.numTotalTests} test đạt`,
      'Thư mục làm việc': backend,
    },
  });
  if (run.status !== 0 && summary.failed === 0) {
    console.log(paint('yellow', '[unit] Jest kết thúc với mã lỗi nhưng không có test fail — kiểm tra log.'));
  }
  return summary;
}

// ---------------------------------------------------------------------- API
async function runApi(config) {
  const outDir = resetDir(suiteOutputDir(config, 'api'));
  const { defineApiTests } = await import('./02_api_tests/api.tests.mjs');
  const session = new Session(config);
  const tests = defineApiTests(session, config);
  console.log(paint('gray', `\n[api] ${tests.length} test case → ${config.target.apiBaseUrl}\n`));
  const { summary } = await runTestList({
    suite: 'api',
    title: 'Kiểm thử API tự động',
    config,
    outputDir: outDir,
    tests,
    meta: {
      'API base URL': config.target.apiBaseUrl,
      'Tài khoản khách hàng': config.accounts.customer?.email,
      'Tài khoản cửa hàng': config.accounts.owner?.email,
      'Tài khoản quản trị': config.accounts.admin?.email,
      'Ngưỡng p95': `${config.api.maxResponseMs} ms`,
    },
  });
  return summary;
}

// ---------------------------------------------------------------------- WEB
async function runWeb(config, args) {
  const outDir = resetDir(suiteOutputDir(config, 'web'));
  ensureDir(outDir);
  const frontend = path.join(config.repoRoot, 'frontend');
  const cli = path.join(frontend, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!fs.existsSync(cli)) {
    throw new Error(`Không tìm thấy Playwright tại ${cli}. Chạy "npm --prefix frontend install" trước.`);
  }
  const configFile = path.join(config.testerRoot, '03_web_ui_tests', 'playwright.demo.config.ts');
  const resultsFile = path.join(outDir, 'playwright-results.json');
  const env = {
    NODE_PATH: path.join(frontend, 'node_modules'),
    PBL6_TESTER_CONFIG: path.join(config.testerRoot, 'config', 'server.config.json'),
    PBL6_TARGET: config.targetName,
    PBL6_WEB_URL: config.target.webBaseUrl,
    PBL6_TEST_RESULTS: resultsFile,
    PBL6_REPORT_DIR: outDir,
    PBL6_HEADED: config.web.headed ? '1' : '0',
    PBL6_SLOWMO: String(config.web.slowMoMs),
    PBL6_STEP_DELAY: String(config.web.stepDelayMs),
  };
  if (args.headed !== undefined) env.PBL6_HEADED = args.headed ? '1' : '0';
  console.log(paint('gray', `\n[web] Playwright · headed=${env.PBL6_HEADED} · slowMo=${env.PBL6_SLOWMO}ms\n`));
  const run = await runStreaming(process.execPath, [cli, 'test', `--config=${configFile}`], {
    cwd: frontend,
    env,
    logFile: path.join(outDir, 'playwright-output.log'),
  });
  if (!fs.existsSync(resultsFile)) {
    throw new Error(`Playwright không tạo file kết quả (exit ${run.code}). Xem ${path.join(outDir, 'playwright-output.log')}`);
  }
  const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const { tests, durationMs } = fromPlaywrightJson(data);
  const { summary } = writeSuiteReport({
    outputDir: outDir,
    suite: 'web',
    title: 'Kiểm thử giao diện Web E2E (Playwright)',
    target: config.target.webBaseUrl,
    startedAt: data.stats?.startTime || new Date(),
    durationMs: durationMs || 0,
    tests,
    reportHref: 'playwright/index.html',
    writeHtml: true,
    meta: {
      'Trình duyệt': 'Chromium (headed)',
      'Slow motion': `${config.web.slowMoMs} ms/thao tác`,
      'Độ trễ giữa các bước': `${config.web.stepDelayMs} ms`,
      'Báo cáo Playwright': 'playwright/index.html (có ảnh, video, trace)',
      'Exit code': String(run.code),
    },
  });
  return summary;
}

// --------------------------------------------------------------------- LOAD
function parseDurationMs(value) {
  const match = String(value || '').match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = { ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2]];
  return amount * unit;
}

function readSummary(file) {  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

async function runLoad(config, args) {
  const outDir = resetDir(suiteOutputDir(config, 'load'));
  ensureDir(outDir);
  const scenarioName = args.scenario || config.load.activeScenario;
  const scenario = config.load.scenarios[scenarioName];
  if (!scenario) throw new Error(`Kịch bản k6 "${scenarioName}" không có trong config.load.scenarios`);
  const summaryFile = path.join(outDir, 'summary.json');
  const scriptContainer = '/work/04_load_performance_tests/load.k6.js';
  const thresholds = config.load.thresholds;
  const baseUrl = config.target.k6BaseUrl || config.target.webBaseUrl;

  const dockerArgs = [
    'run',
    '--rm',
    '-v',
    `${config.testerRoot}:/work`,
    '-e',
    `BASE_URL=${baseUrl}`,
    '-e',
    `SCENARIO=${scenarioName}`,
    '-e',
    `VUS=${scenario.vus}`,
    '-e',
    `DURATION=${scenario.duration}`,
    '-e',
    `THRESHOLD_FAILED=${thresholds.httpReqFailedRate}`,
    '-e',
    `THRESHOLD_P95=${thresholds.p95Ms}`,
    '-e',
    `THRESHOLD_CHECKS=${thresholds.checksRate}`,
    config.load.dockerImage,
    'run',
    `--summary-export=/work/reports/load/summary.json`,
    scriptContainer,
  ];
  console.log(paint('gray', `\n[load] k6 · ${scenarioName} · ${scenario.vus} VUs · ${scenario.duration} → ${baseUrl}\n`));
  const run = await runStreaming('docker', dockerArgs, {
    env: { MSYS_NO_PATHCONV: '1' },
    logFile: path.join(outDir, 'k6-output.log'),
  });

  const summary = readSummary(summaryFile);
  const tests = [];
  if (!summary) {
    tests.push({
      id: 'LOAD-00',
      group: 'k6',
      name: 'Chạy được kịch bản k6',
      status: 'failed',
      durationMs: 0,
      error:
        run.error?.message ||
        `Không có summary.json (exit ${run.code}). Kiểm tra Docker đang chạy và image ${config.load.dockerImage}. Xem k6-output.log`,
    });
  } else {
    const metric = (name) => {
      const raw = summary.metrics?.[name];
      return raw?.values && typeof raw.values === 'object' ? raw.values : raw || {};
    };
    const failedRate = metric('http_req_failed').rate ?? metric('http_req_failed').value ?? 1;
    const checksRate = metric('checks').rate ?? metric('checks').value ?? 0;
    const totalRequests = metric('http_reqs').count ?? 0;
    const p95Of = (operation) => {
      const candidates = [
        `http_req_duration{operation:${operation}}`,
        `http_req_duration{operation=${operation}}`,
      ];
      for (const key of candidates) {
        const values = metric(key);
        if (values['p(95)'] !== undefined) return values['p(95)'];
      }
      return null;
    };
    const make = (id, name, ok, actual, expected) => ({
      id,
      group: 'SLA & hiệu năng',
      name,
      status: ok ? 'passed' : 'failed',
      durationMs: 0,
      expected,
      actual,
      error: ok ? undefined : `Không đạt: ${actual}`,
    });
    tests.push(
      make(
        'LOAD-01',
        'Tỷ lệ request lỗi trong ngưỡng cho phép',
        failedRate < thresholds.httpReqFailedRate,
        `${(failedRate * 100).toFixed(2)}%`,
        `< ${(thresholds.httpReqFailedRate * 100).toFixed(2)}%`,
      ),
      make(
        'LOAD-02',
        'Tỷ lệ kiểm tra dữ liệu đạt',
        checksRate > thresholds.checksRate,
        `${(checksRate * 100).toFixed(2)}%`,
        `> ${(thresholds.checksRate * 100).toFixed(2)}%`,
      ),
      make(
        'LOAD-03',
        'p95 danh sách sản phẩm (listProducts)',
        (p95Of('listProducts') ?? Infinity) < thresholds.p95Ms,
        `${Math.round(p95Of('listProducts') ?? -1)} ms`,
        `< ${thresholds.p95Ms} ms`,
      ),
      make(
        'LOAD-04',
        'p95 chi tiết sản phẩm (getProduct)',
        (p95Of('getProduct') ?? Infinity) < thresholds.p95Ms,
        `${Math.round(p95Of('getProduct') ?? -1)} ms`,
        `< ${thresholds.p95Ms} ms`,
      ),
      make(
        'LOAD-05',
        'p95 sản phẩm liên quan (getRelatedProducts)',
        (p95Of('getRelatedProducts') ?? Infinity) < thresholds.p95Ms,
        `${Math.round(p95Of('getRelatedProducts') ?? -1)} ms`,
        `< ${thresholds.p95Ms} ms`,
      ),
      make(
        'LOAD-06',
        'Có lưu lượng thực tế trong suốt thời gian chạy',
        totalRequests > 0,
        `${totalRequests} request`,
        '> 0 request',
      ),
      make(
        'LOAD-07',
        'k6 hoàn tất không vượt ngưỡng (exit code)',
        run.code === 0 || (failedRate === 0 && checksRate > thresholds.checksRate),
        `exit ${run.code}`,
        'exit 0',
      ),
    );
  }
  const duration = summary?.state?.testRunDurationMs || parseDurationMs(scenario.duration);
  const { summary: aggregate } = writeSuiteReport({
    outputDir: outDir,
    suite: 'load',
    title: `Kiểm thử tải & hiệu năng (k6 · ${scenarioName})`,
    target: baseUrl,
    startedAt: new Date(Date.now() - duration),
    durationMs: duration,
    tests,
    meta: {
      'Kịch bản': `${scenarioName} (${scenario.vus} VUs · ${scenario.duration})`,
      'Docker image': config.load.dockerImage,
      'Ngưỡng lỗi': `< ${thresholds.httpReqFailedRate * 100}%`,
      'Ngưỡng p95': `< ${thresholds.p95Ms} ms`,
      'Ngưỡng checks': `> ${thresholds.checksRate * 100}%`,
      'Log k6': 'k6-output.log',
      'Summary k6': 'summary.json',
    },
  });
  return aggregate;
}

// ---------------------------------------------------------------- SECURITY
async function runSecurity(config) {
  const outDir = resetDir(suiteOutputDir(config, 'security'));
  const { defineSecurityTests } = await import('./05_security_tests/security.tests.mjs');
  const session = new Session(config);
  const tests = defineSecurityTests(session, config);
  console.log(paint('gray', `\n[security] ${tests.length} test case → ${config.target.apiBaseUrl}\n`));
  const { summary } = await runTestList({
    suite: 'security',
    title: 'Kiểm thử bảo mật hộp đen',
    config,
    outputDir: outDir,
    tests,
    meta: {
      'API base URL': config.target.apiBaseUrl,
      'Phạm vi': 'Xác thực, phân quyền, injection, header, cookie, rò rỉ dữ liệu',
      'Ngưỡng p95': `${config.security.maxResponseMs} ms`,
    },
  });
  return summary;
}

// --------------------------------------------------------------------- MAIN
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.list) {
    printHelp();
    return;
  }
  const config = loadConfig(args);
  banner(config);
  const suites = pickSuites(args.suite);
  const summaries = [];
  const started = Date.now();
  for (const suite of suites) {
    console.log(paint('cyan', `\n▶ ${SUITES[suite]}`));
    try {
      let summary;
      if (suite === 'unit') summary = await runUnit(config);
      else if (suite === 'api') summary = await runApi(config);
      else if (suite === 'web') summary = await runWeb(config, args);
      else if (suite === 'load') summary = await runLoad(config, args);
      else summary = await runSecurity(config);
      summaries.push({ suite, summary });
    } catch (error) {
      console.error(paint('red', `\n[${suite}] LỖI: ${error.message}`));
      summaries.push({ suite, error });
    }
  }

  const index = writeIndex(config.reportsDir);
  console.log('');
  console.log(paint('cyan', '='.repeat(78)));
  console.log('  KẾT QUẢ');
  for (const item of summaries) {
    if (item.error) {
      console.log(`  ${item.suite.padEnd(9)} ${paint('red', 'KHÔNG CHẠY ĐƯỢC')}  ${item.error.message.slice(0, 80)}`);
      continue;
    }
    const { total, passed, failed, skipped, known, passRate } = item.summary;
    const tone = failed > 0 ? 'red' : known > 0 ? 'yellow' : 'green';
    console.log(
      `  ${item.suite.padEnd(9)} ${paint(tone, `${passed}/${total} đạt (${passRate}%)`)}` +
        `${failed ? paint('red', ` · ${failed} lỗi`) : ''}` +
        `${skipped ? ` · ${skipped} bỏ qua` : ''}` +
        `${known ? paint('yellow', ` · ${known} lỗi đã biết`) : ''}`,
    );
  }
  console.log(`  Tổng thời gian: ${formatDuration(Date.now() - started)}`);
  console.log(`  Báo cáo: ${index?.file || config.reportsDir}`);
  console.log(paint('cyan', '='.repeat(78)));

  if (args.open && config.reports.openAfterRun && index?.file && process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', index.file], { detached: true, stdio: 'ignore' }).unref();
  }
}

main().catch((error) => {
  console.error(paint('red', `\nLỖI: ${error.message}`));
  process.exitCode = 1;
});
