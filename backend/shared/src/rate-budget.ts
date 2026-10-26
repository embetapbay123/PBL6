import { verifyService } from './auth';

/** Authenticated service reads share a bounded caller budget, never the public IP budget.
 * This only classifies throttling; it grants no Product visibility or mutation permission.
 */
export function rateBudget(service: string, method: string, path: string, ip: string,
  headers: Record<string, unknown>, keys: Record<string, string>) {
  const publicCatalog = path === '/api/v1/products' || /^\/api\/v1\/products\/[0-9a-f-]{36}$/i.test(path);
  if (service === 'M1' && method === 'GET' && publicCatalog &&
      (headers['x-service-id'] !== undefined || headers['x-service-key'] !== undefined)) {
    const caller = verifyService(headers, keys, ['M2', 'M4']);
    return { scope: 'catalog-service:' + caller, limit: 6000 };
  }
  const login = path === '/api/v1/auth/login';
  return { scope: (login ? 'login:' : 'api:') + ip, limit: login ? 30 : 600 };
}
