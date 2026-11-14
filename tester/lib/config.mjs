import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Thư mục gốc của bộ tester: C:\PBL6\tester */
export const TESTER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Thư mục gốc repository: C:\PBL6 */
export const REPO_ROOT = path.resolve(TESTER_ROOT, '..');

const CONFIG_DIR = path.join(TESTER_ROOT, 'config');
const BASE_FILE = path.join(CONFIG_DIR, 'server.config.json');
const LOCAL_FILE = path.join(CONFIG_DIR, 'server.config.local.json');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (!isObject(patch)) return patch;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Không đọc được JSON: ${file}\n${error.message}`);
  }
}

/** Đọc một khoá KEY=value từ file .env (không nạp toàn bộ môi trường). */
function readEnvFile(file, key) {
  if (!file || !fs.existsSync(file)) return undefined;
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((row) => row.trim().startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
}

/** Xác định mật khẩu cho một tài khoản: config → biến môi trường → file .env. */
function resolvePassword(account) {
  if (account.password) return { password: account.password, source: 'config' };
  const envKey = account.passwordEnv || 'SEED_PASSWORD';
  if (process.env[envKey]) return { password: process.env[envKey], source: `env:${envKey}` };
  const envFile = account.passwordFile
    ? path.resolve(REPO_ROOT, account.passwordFile)
    : path.join(REPO_ROOT, 'infrastructure', '.env');
  const value = readEnvFile(envFile, envKey);
  if (value) return { password: value, source: path.relative(REPO_ROOT, envFile) };
  return { password: '', source: 'missing' };
}

/**
 * Nạp cấu hình đã hợp nhất.
 * Thứ tự ưu tiên: server.config.json → server.config.local.json → biến môi trường/tham số CLI.
 */
export function loadConfig(cli = {}) {
  const base = readJson(BASE_FILE);
  if (!base) throw new Error(`Thiếu file cấu hình: ${BASE_FILE}`);
  const local = readJson(LOCAL_FILE);
  let config = local ? deepMerge(base, local) : base;

  const targetName =
    cli.target || process.env.PBL6_TARGET || config.activeTarget || Object.keys(config.targets)[0];
  const target = config.targets[targetName];
  if (!target) {
    throw new Error(
      `Target "${targetName}" không tồn tại. Các target hợp lệ: ${Object.keys(config.targets).join(', ')}`,
    );
  }

  if (process.env.PBL6_WEB_URL) target.webBaseUrl = process.env.PBL6_WEB_URL;
  if (process.env.PBL6_API_URL) target.apiBaseUrl = process.env.PBL6_API_URL;
  if (process.env.PBL6_ORIGIN) target.origin = process.env.PBL6_ORIGIN;

  const web = { ...config.web };
  if (process.env.PBL6_HEADED) web.headed = process.env.PBL6_HEADED !== '0';
  if (cli.headed !== undefined) web.headed = cli.headed;
  if (process.env.PBL6_SLOWMO) web.slowMoMs = Number(process.env.PBL6_SLOWMO);
  if (cli.slowMoMs !== undefined) web.slowMoMs = cli.slowMoMs;

  const load = { ...config.load };
  if (process.env.PBL6_SCENARIO) load.activeScenario = process.env.PBL6_SCENARIO;
  if (cli.scenario) load.activeScenario = cli.scenario;

  const accounts = {};
  for (const [role, account] of Object.entries(config.accounts || {})) {
    const { password, source } = resolvePassword(account);
    accounts[role] = { ...account, password, passwordSource: source };
  }

  const reportsDir = path.resolve(TESTER_ROOT, config.reports.directory);
  return {
    ...config,
    targetName,
    target: {
      ...target,
      apiBaseUrl: String(target.apiBaseUrl).replace(/\/$/, ''),
      webBaseUrl: String(target.webBaseUrl).replace(/\/$/, ''),
    },
    web,
    load,
    accounts,
    reportsDir,
    testerRoot: TESTER_ROOT,
    repoRoot: REPO_ROOT,
  };
}

export function suiteOutputDir(config, suiteId) {
  return path.join(config.reportsDir, suiteId);
}

/** Tạo thư mục output sạch cho một lần chạy. */
export function resetDir(dir) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 5) {
        // Windows đôi khi còn khoá file do trình duyệt/tiến trình cũ: đổi tên rồi bỏ qua.
        const backup = `${dir}-old-${Date.now()}`;
        try {
          fs.renameSync(dir, backup);
        } catch {
          throw error;
        }
      } else {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      }
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
