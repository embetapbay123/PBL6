export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HTTP client tối giản dùng fetch (Node >= 18), không cần thư viện ngoài.
 * Mọi request được ghi vào `history` để tính SLA ở cuối suite.
 */
export class ApiClient {
  constructor({ baseUrl, origin, timeoutMs = 15000, retries = 1 } = {}) {
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.origin = origin;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.history = [];
  }

  url(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return this.baseUrl + (path.startsWith('/') ? path : `/${path}`);
  }

  async request(method, path, options = {}) {
    const {
      token,
      body,
      headers = {},
      rawBody,
      timeoutMs = this.timeoutMs,
      retries = this.retries,
      redirect = 'follow',
      captureHistory = true,
    } = options;
    const url = this.url(path);
    const hasBody = rawBody !== undefined || body !== undefined;
    const finalHeaders = {
      accept: 'application/json',
      ...(this.origin ? { origin: this.origin } : {}),
      ...(hasBody && !headers['content-type'] ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    };

    let attempt = 0;
    for (;;) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: finalHeaders,
          body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          redirect,
        });
        clearTimeout(timer);
        const text = await response.text();
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          /* response không phải JSON */
        }
        const durationMs = Date.now() - started;
        if (captureHistory) {
          this.history.push({ method, path, url, status: response.status, durationMs });
        }
        if (!response.ok && retries > 0 && method === 'GET' && response.status >= 500) {
          attempt += 1;
          if (attempt <= retries) {
            await sleep(300 * attempt);
            continue;
          }
        }
        return {
          status: response.status,
          ok: response.ok,
          headers: response.headers,
          text,
          json,
          durationMs,
          url,
          method,
          path,
        };
      } catch (error) {
        clearTimeout(timer);
        if (attempt < retries && method === 'GET') {
          attempt += 1;
          await sleep(400 * attempt);
          continue;
        }
        throw new ApiError(`Không gọi được ${method} ${url}: ${error.message}`, {
          cause: error,
          method,
          path,
        });
      }
    }
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  }

  patch(path, body, options = {}) {
    return this.request('PATCH', path, { ...options, body });
  }

  delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }

  /** Thống kê độ trễ để kiểm tra SLA. */
  latency() {
    const values = this.history.map((row) => row.durationMs).sort((a, b) => a - b);
    if (!values.length) return { count: 0, p50: 0, p95: 0, max: 0, avg: 0 };
    const at = (p) => values[Math.min(values.length - 1, Math.floor((p / 100) * values.length))];
    return {
      count: values.length,
      p50: at(50),
      p95: at(95),
      max: values[values.length - 1],
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    };
  }
}
