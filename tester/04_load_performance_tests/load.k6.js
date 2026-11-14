import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Kịch bản đọc công khai: danh sách → chi tiết → liên quan → tìm kiếm.
// Toàn bộ tham số lấy từ biến môi trường do tester/run-tests.mjs truyền vào.
const scenarioName = __ENV.SCENARIO || 'smoke';
const presets = {
  smoke: { vus: 20, duration: '15s' },
  load: { vus: 100, duration: '30s' },
  stress: { vus: 250, duration: '60s' },
};
const preset = presets[scenarioName] || presets.smoke;
const vus = Number(__ENV.VUS) || preset.vus;
const duration = __ENV.DURATION || preset.duration;
const failedThreshold = Number(__ENV.THRESHOLD_FAILED) || 0.01;
const p95Threshold = Number(__ENV.THRESHOLD_P95) || 2000;
const checksThreshold = Number(__ENV.THRESHOLD_CHECKS) || 0.99;

const base = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const api = base + '/api/v1';
const rateLimited = new Counter('rate_limited');

export const options = {
  scenarios: {
    read_mix: {
      executor: 'constant-vus',
      vus,
      duration,
      gracefulStop: '5s',
    },
  },
  thresholds: {
    http_req_failed: [`rate<${failedThreshold}`],
    checks: [`rate>${checksThreshold}`],
    'http_req_duration{operation:listProducts}': [`p(95)<${p95Threshold}`],
    'http_req_duration{operation:getProduct}': [`p(95)<${p95Threshold}`],
    'http_req_duration{operation:getRelatedProducts}': [`p(95)<${p95Threshold}`],
    'http_req_duration{operation:searchProducts}': [`p(95)<${p95Threshold}`],
  },
};

function read(path, operation) {
  const response = http.get(api + path, {
    timeout: '8s',
    tags: { operation },
  });
  if (response.status === 429) rateLimited.add(1);
  let body;
  try {
    body = response.json();
  } catch {
    body = null;
  }
  check(response, {
    [`${operation} trả 200`]: (r) => r.status === 200,
    [`${operation} đúng cấu trúc`]: () => {
      if (operation === 'getProduct') return typeof body?.id === 'string';
      if (operation === 'searchProducts') return Array.isArray(body?.items);
      return Array.isArray(body?.items) && Number.isInteger(body?.total);
    },
  });
  return body;
}

export function setup() {
  const page = read('/products?page=1&size=20', 'listProducts');
  if (!page?.items?.length) throw new Error('Catalog công khai đang rỗng — cần seed dữ liệu trước khi chạy k6.');
  return { ids: page.items.map((item) => item.id), total: page.total };
}

export default function (data) {
  const id = data.ids[(__VU - 1) % data.ids.length];
  read('/products?page=1&size=20', 'listProducts');
  read(`/products/${id}`, 'getProduct');
  read(`/products/${id}/related?page=1&size=10`, 'getRelatedProducts');
  read('/products?q=ao&page=1&size=10', 'searchProducts');
  sleep(Number(__ENV.SLEEP_SECONDS) || 1);
}
