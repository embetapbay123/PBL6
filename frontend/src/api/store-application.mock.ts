/**
 * MOCK/DEMO — Store Application API Mock Adapter
 *
 * Simulates the 4 NOT_IMPLEMENTED endpoints:
 *   POST   /me/store-applications        → submitStoreApplication
 *   GET    /me/store-applications        → listOwnStoreApplications
 *   GET    /admin/store-applications     → listStoreApplications
 *   PATCH  /admin/store-applications/:id → reviewStoreApplication
 *
 * All data lives in memory (localStorage-backed). Replace with
 * callOperation() once the backend implements these endpoints.
 */

import type { components } from './generated';

// ─── Types matching OpenAPI schemas ─────────────────────────────────────────
export type StoreApplication = components['schemas']['StoreApplication'];
export type PageStoreApplications = components['schemas']['PageStoreApplications'];
export type StoreApplicationSubmit = components['schemas']['StoreApplicationSubmit'];
export type StoreApplicationDecision = components['schemas']['StoreApplicationDecision'];

// ─── In-memory store ────────────────────────────────────────────────────────
const STORAGE_KEY = 'pbl6_mock_store_applications';

function loadAll(): StoreApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [...SEED_APPLICATIONS];
  } catch {
    return [...SEED_APPLICATIONS];
  }
}

function saveAll(apps: StoreApplication[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    throw new Error('Unable to save demo data in this browser.');
  }
}

// ─── Seed fixtures matching contract schema ─────────────────────────────────
const SEED_APPLICATIONS: StoreApplication[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    proposed_name: 'TechGear Flagship Store',
    contact: 'techgear@example.com',
    status: 'PENDING',
    version: 0,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    proposed_name: 'FashionHub VN',
    contact: '0901234567',
    status: 'APPROVED',
    version: 1,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    proposed_name: 'HomeDecor Plus',
    contact: 'homedecor@shop.vn',
    status: 'REJECTED',
    decision_reason: 'Thi?u gi?y ph�p kinh doanh h?p l?.',
    version: 1,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    proposed_name: 'Organic Garden',
    contact: '0912345678',
    status: 'PENDING',
    version: 0,
  },
];

// ─── Simulated latency ─────────────────────────────────────────────────────
const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms));

// ─── Public API ─────────────────────────────────────────────────────────────

/** POST /me/store-applications — Customer submits a new application */
export async function mockSubmitStoreApplication(
  body: StoreApplicationSubmit,
): Promise<StoreApplication> {
  await delay();
  const apps = loadAll();
  const newApp: StoreApplication = {
    id: `sa-mock-${Date.now().toString(36)}`,
    proposed_name: body.proposed_name,
    contact: body.contact,
    status: 'PENDING',
    version: 0,
  };
  apps.unshift(newApp);
  saveAll(apps);
  return newApp;
}

/** GET /me/store-applications — Customer lists own applications */
export async function mockListOwnStoreApplications(
  page = 1,
  size = 20,
): Promise<PageStoreApplications> {
  await delay(200);
  const apps = loadAll();
  const start = (page - 1) * size;
  const items = apps.slice(start, start + size);
  return { items, total: apps.length, page, size };
}

/** GET /admin/store-applications — Admin lists all applications */
export async function mockListStoreApplications(
  page = 1,
  size = 20,
): Promise<PageStoreApplications> {
  await delay(250);
  const apps = loadAll();
  const start = (page - 1) * size;
  const items = apps.slice(start, start + size);
  return { items, total: apps.length, page, size };
}

/** PATCH /admin/store-applications/:id — Admin approves or rejects */
export async function mockReviewStoreApplication(
  id: string,
  body: StoreApplicationDecision,
): Promise<StoreApplication> {
  await delay(300);
  const apps = loadAll();
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Không tìm thấy đơn đăng ký.');
  const app = apps[idx];
  if (body.status === 'REJECTED' && !body.decision_reason?.trim()) throw new Error('Vui l�ng nh?p l� do t? ch?i.');
  if (app.version !== body.expected_version) {
    throw new Error('Phiên bản không khớp. Dữ liệu đã được cập nhật bởi người khác.');
  }
  if (app.status !== 'PENDING') {
    throw new Error('Đơn đăng ký đã được xử lý trước đó.');
  }
  const updated: StoreApplication = {
    ...app,
    status: body.status,
    decision_reason: body.decision_reason,
    version: (app.version ?? 0) + 1,
  };
  apps[idx] = updated;
  saveAll(apps);
  return updated;
}

/** Reset mock data (for testing) */
export function mockResetStoreApplications(): void {
  localStorage.removeItem(STORAGE_KEY);
}

