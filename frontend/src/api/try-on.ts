import { ApiError, request } from './client';

/** Frontend adapter for the M4 contract in virtual-try-on-plan.md.
 * Missing endpoints fail closed; no browser-side model calls or simulated quota.
 */
export interface TryOnCapabilities {
  enabled: boolean;
  demo_password_required?: boolean;
  message?: string;
  quota: { remaining: number; limit: number; reset_at: string };
  consent_version: string;
  privacy: { provider_label: string; retention_hours: number };
}

export interface TryOnJob {
  id: string;
  product_id: string;
  variant_id: string;
  idempotency_key?: string;
  status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'CANCELLED';
  result_url?: string;
  expires_at?: string;
  message?: string;
}

const root = '/ai/try-on';
const demoHeaders = (password?: string) => password ? { 'X-Try-On-Demo-Password': password } : undefined;
const unavailable = () => new ApiError(503, 'TRY_ON_UNAVAILABLE', 'Tạo ảnh thử đồ chưa sẵn sàng. Bạn vẫn có thể xem trước ảnh đã chọn.');
const validJob = (job: TryOnJob) => !!job?.id && ['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'].includes(job.status);

export const tryOnApi = {
  async capabilities(productId: string, variantId: string, signal: AbortSignal) {
    try {
      const value = await request<TryOnCapabilities>(`${root}/capabilities?${new URLSearchParams({ product_id: productId, variant_id: variantId })}`, { signal });
      if (typeof value.enabled !== 'boolean' || (value.demo_password_required !== undefined && typeof value.demo_password_required !== 'boolean') || !value.quota || !Number.isInteger(value.quota.remaining) || !Number.isInteger(value.quota.limit)
        || value.quota.remaining < 0 || value.quota.limit < value.quota.remaining || !Number.isFinite(Date.parse(value.quota.reset_at))
        || !value.consent_version || !value.privacy?.provider_label || !(value.privacy.retention_hours > 0)) throw unavailable();
      return value;
    } catch (error) {
      if (error instanceof ApiError && [404, 405, 501].includes(error.status)) throw unavailable();
      throw error;
    }
  },
  async jobs(productId: string, variantId: string, signal?: AbortSignal) {
    const value = await request<{ items: TryOnJob[] }>(`${root}/jobs?${new URLSearchParams({ product_id: productId, variant_id: variantId })}`, { signal });
    if (!Array.isArray(value.items)) throw unavailable();
    return value.items.filter(job => validJob(job) && job.product_id === productId && job.variant_id === variantId);
  },
  async job(id: string, productId: string, variantId: string, signal?: AbortSignal) {
    const value = await request<TryOnJob>(`${root}/jobs/${encodeURIComponent(id)}`, { signal });
    if (!validJob(value) || value.id !== id || value.product_id !== productId || value.variant_id !== variantId) throw unavailable();
    return value;
  },
  async upload(file: File, signal: AbortSignal, demoPassword?: string) {
    const body = new FormData();
    body.set('photo', file);
    const value = await request<{ id: string }>(`${root}/photos`, { method: 'POST', body, signal, headers: demoHeaders(demoPassword) }, false);
    if (!value.id) throw unavailable();
    return value;
  },
  create: (body: { photo_id: string; product_id: string; variant_id: string; consent_version: string }, key: string, signal: AbortSignal, demoPassword?: string) =>
    request<TryOnJob>(`${root}/jobs`, { method: 'POST', headers: { 'Idempotency-Key': key, ...demoHeaders(demoPassword) }, body: JSON.stringify(body), signal }, false),
  remove: (id: string) => request(`${root}/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }, false),
};

export const isTryOnPending = (job?: TryOnJob | null) => !!job && ['QUEUED', 'PROCESSING', 'UNKNOWN'].includes(job.status);

/** Only server-issued, short-lived signed URLs belong here; never put bearer tokens in image URLs. */
export function tryOnResultUrl(job?: TryOnJob | null) {
  if (job?.status !== 'SUCCEEDED' || !job.result_url || !job.expires_at || !Number.isFinite(Date.parse(job.expires_at)) || Date.parse(job.expires_at) <= Date.now()) return undefined;
  try {
    const url = new URL(job.result_url, window.location.origin);
    return !url.username && !url.password && (url.protocol === 'https:' || url.origin === window.location.origin) ? url.href : undefined;
  } catch { return undefined; }
}
