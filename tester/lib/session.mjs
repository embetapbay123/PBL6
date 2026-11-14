import { ApiClient, ApiError } from './http.mjs';

/**
 * Phiên làm việc với server: đăng nhập theo vai trò và cache access token.
 * Ưu tiên /auth/demo-login (không cần mật khẩu) khi cấu hình có `demoAccount`.
 */
export class Session {
  constructor(config) {
    this.config = config;
    this.api = new ApiClient({
      baseUrl: config.target.apiBaseUrl,
      origin: config.target.origin,
      timeoutMs: config.http.timeoutMs,
      retries: config.http.retries,
    });
    this.tokens = new Map();
    this.accounts = config.accounts;
  }

  async login(role) {
    if (!this.accounts[role]) throw new Error(`Chưa cấu hình tài khoản "${role}" trong server.config.json`);
    if (this.tokens.has(role)) return this.tokens.get(role);
    const account = this.accounts[role];
    let response;
    if (account.demoAccount) {
      response = await this.api.post('/auth/demo-login', { account: account.demoAccount });
    } else {
      if (!account.password) {
        throw new Error(
          `Thiếu mật khẩu cho "${role}". Đặt ${account.passwordEnv || 'SEED_PASSWORD'} hoặc cấu hình password.`,
        );
      }
      response = await this.api.post('/auth/login', {
        email: account.email,
        password: account.password,
      });
    }
    if (response.status !== 200 || !response.json?.access_token) {
      throw new ApiError(
        `Đăng nhập "${role}" thất bại (HTTP ${response.status}): ${response.json?.message || response.text.slice(0, 160)}`,
        { status: response.status, body: response.json },
      );
    }
    const session = {
      token: response.json.access_token,
      refreshToken: response.json.refresh_token,
      context: response.json.context,
      response,
    };
    this.tokens.set(role, session);
    return session;
  }

  async token(role) {
    return (await this.login(role)).token;
  }

  /** Gọi API kèm token của một vai trò; không truyền role nghĩa là gọi ẩn danh. */
  async call(method, path, { role, body, headers, token } = {}) {
    const accessToken = token ?? (role ? await this.token(role) : undefined);
    return this.api.request(method, path, { token: accessToken, body, headers });
  }

  get(role, path, options = {}) {
    return this.call('GET', path, { role, ...options });
  }

  post(role, path, body, options = {}) {
    return this.call('POST', path, { role, body, ...options });
  }

  patch(role, path, body, options = {}) {
    return this.call('PATCH', path, { role, body, ...options });
  }

  delete(role, path, options = {}) {
    return this.call('DELETE', path, { role, ...options });
  }
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function assertStatus(response, allowed, label) {
  const statuses = Array.isArray(allowed) ? allowed : [allowed];
  if (!statuses.includes(response.status)) {
    throw new Error(
      `${label || 'HTTP status'}: mong đợi ${statuses.join('/')} nhưng nhận ${response.status} — ${shortBody(response)}`,
    );
  }
  return response;
}

export function assertCode(response, code, label) {
  const actual = response.json?.code;
  if (actual !== code) {
    throw new Error(
      `${label || 'Mã lỗi'}: mong đợi "${code}" nhưng nhận "${actual ?? '(không có)'}" — ${shortBody(response)}`,
    );
  }
  return response;
}

export function shortBody(response, limit = 180) {
  const text = response?.text ?? '';
  return text.replace(/\s+/g, ' ').slice(0, limit);
}

/** Kiểm tra envelope lỗi chuẩn của API. */
export function assertErrorEnvelope(response) {
  assert(response.json && typeof response.json === 'object', 'Response lỗi phải là JSON');
  assert(typeof response.json.code === 'string', 'Response lỗi thiếu trường "code"');
  assert(typeof response.json.message === 'string', 'Response lỗi thiếu trường "message"');
  return response;
}
