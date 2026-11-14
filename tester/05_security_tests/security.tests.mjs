import {
  assert,
  assertCode,
  assertErrorEnvelope,
  assertStatus,
} from '../lib/session.mjs';

/** Kiểm thử bảo mật hộp đen: xác thực, phân quyền, injection, header, cookie. */
export function defineSecurityTests(session, config) {
  const tests = [];
  const add = (test) => tests.push({ group: 'Khác', ...test });

  add({
    id: 'SEC-AUTH-01',
    group: 'Xác thực & phân quyền',
    name: 'Truy cập hồ sơ khi ẩn danh bị chặn kèm envelope lỗi chuẩn',
    expected: 'HTTP 401 · UNAUTHENTICATED · JSON có code/message',
    async run() {
      const response = await session.get(null, '/me');
      assertStatus(response, 401);
      assertCode(response, 'UNAUTHENTICATED');
      assertErrorEnvelope(response);
      return { actual: `HTTP 401 · ${response.json.code}` };
    },
  });

  add({
    id: 'SEC-AUTH-02',
    group: 'Xác thực & phân quyền',
    name: 'JWT bị sửa nội dung không được chấp nhận',
    expected: 'HTTP 401',
    async run() {
      const { token } = await session.login('customer');
      const [header, payload, signature] = token.split('.');
      const forgedPayload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'ADMIN' })).toString('base64url');
      const forged = `${header}.${forgedPayload}.${signature}`;
      const response = await session.get(null, '/me', { token: forged });
      assertStatus(response, 401);
      return { actual: 'HTTP 401 · token giả bị từ chối' };
    },
  });

  add({
    id: 'SEC-AUTH-03',
    group: 'Xác thực & phân quyền',
    name: 'JWT với alg=none bị từ chối',
    expected: 'HTTP 401',
    async run() {
      const { token } = await session.login('customer');
      const payload = token.split('.')[1];
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const response = await session.get(null, '/me', { token: `${header}.${payload}.` });
      assertStatus(response, 401);
      return { actual: 'HTTP 401 · alg=none bị từ chối' };
    },
  });

  add({
    id: 'SEC-AUTH-04',
    group: 'Xác thực & phân quyền',
    name: 'Khách hàng không gọi được API quản trị',
    expected: 'HTTP 403 · FORBIDDEN',
    async run() {
      const response = await session.get('customer', '/admin/users');
      assertStatus(response, 403);
      assertCode(response, 'FORBIDDEN');
      return { actual: 'HTTP 403' };
    },
  });

  add({
    id: 'SEC-AUTH-05',
    group: 'Xác thực & phân quyền',
    name: 'Khách hàng không gọi được API cửa hàng',
    expected: 'HTTP 403 · FORBIDDEN',
    async run() {
      const response = await session.get('customer', '/store/inventory');
      assertStatus(response, 403);
      return { actual: 'HTTP 403' };
    },
  });

  add({
    id: 'SEC-AUTH-06',
    group: 'Xác thực & phân quyền',
    name: 'Giỏ hàng yêu cầu đăng nhập',
    expected: 'HTTP 401',
    async run() {
      const response = await session.get(null, '/cart/items');
      assertStatus(response, 401);
      return { actual: 'HTTP 401' };
    },
  });

  add({
    id: 'SEC-INJ-01',
    group: 'Chống injection',
    name: 'Chuỗi SQL injection trong tìm kiếm không gây lỗi máy chủ',
    expected: 'HTTP 200/422 và không lộ lỗi SQL',
    async run() {
      const payload = "' OR 1=1--";
      const response = await session.get(null, `/products?q=${encodeURIComponent(payload)}`);
      assert([200, 422].includes(response.status), `HTTP ${response.status}`);
      assert(!/sql|syntax error|pg_|postgres|stack/i.test(response.text), 'Phản hồi chứa dấu hiệu lỗi SQL');
      return { actual: `HTTP ${response.status} · không lộ lỗi SQL` };
    },
  });

  add({
    id: 'SEC-INJ-02',
    group: 'Chống injection',
    name: 'Chuỗi XSS được xử lý như dữ liệu, không phản chiếu thô',
    expected: 'Không trả 500, không chứa thẻ <script> nguyên bản',
    async run() {
      const payload = '<script>alert(1)</script>';
      const response = await session.get(null, `/products?q=${encodeURIComponent(payload)}`);
      assert(response.status !== 500, 'Máy chủ trả 500 với payload XSS');
      assert(!response.text.includes(payload), 'Payload XSS bị phản chiếu nguyên bản');
      return { actual: `HTTP ${response.status} · payload không phản chiếu thô` };
    },
  });

  add({
    id: 'SEC-INJ-03',
    group: 'Chống injection',
    name: 'JSON sai định dạng trả lỗi 400 có kiểm soát',
    expected: 'HTTP 400 · BAD_REQUEST · envelope JSON',
    async run() {
      const response = await session.api.request('POST', '/auth/login', {
        rawBody: '{"email": "thieu-ngoac"',
        headers: { 'content-type': 'application/json' },
      });
      assertStatus(response, 400);
      assertCode(response, 'BAD_REQUEST');
      assertErrorEnvelope(response);
      return { actual: 'HTTP 400 · JSON hợp lệ' };
    },
  });

  add({
    id: 'SEC-INJ-04',
    group: 'Chống injection',
    name: 'Body quá lớn không làm sập máy chủ',
    expected: 'HTTP 4xx (413/422) thay vì 500',
    knownIssue: 'Máy chủ hiện trả 500 INTERNAL_ERROR cho body ~2MB thay vì 413/422; cần giới hạn body ở gateway.',
    async run() {
      const response = await session.api.request('POST', '/auth/login', {
        body: { email: 'a@b.c', password: 'x'.repeat(config.security.oversizeKb * 1024) },
      });
      assert(response.status < 500, `Body ${config.security.oversizeKb}KB trả HTTP ${response.status}`);
      return { actual: `HTTP ${response.status}` };
    },
  });

  add({
    id: 'SEC-INJ-05',
    group: 'Chống injection',
    name: 'Path traversal không đọc được tệp hệ thống',
    expected: 'Không trả nội dung /etc/passwd',
    async run() {
      const response = await session.api.request('GET', '/products/..%2F..%2F..%2Fetc%2Fpasswd', {
        captureHistory: false,
      });
      assert(!/root:.*:0:0:/.test(response.text), 'Phản hồi chứa nội dung tệp hệ thống');
      return { actual: `HTTP ${response.status} · không lộ tệp hệ thống` };
    },
  });

  add({
    id: 'SEC-HDR-01',
    group: 'Header & cookie',
    name: 'Trang bị các header bảo vệ trình duyệt',
    expected: 'Có CSP, X-Content-Type-Options, X-Frame-Options, HSTS',
    async run() {
      const response = await session.api.request('GET', '/products?page=1&size=1', { captureHistory: false });
      const h = response.headers;
      assert(h.get('content-security-policy'), 'Thiếu Content-Security-Policy');
      assert(h.get('x-content-type-options') === 'nosniff', 'Thiếu X-Content-Type-Options: nosniff');
      assert(h.get('x-frame-options'), 'Thiếu X-Frame-Options');
      assert(h.get('strict-transport-security'), 'Thiếu Strict-Transport-Security');
      return { actual: 'CSP · nosniff · frame-options · HSTS' };
    },
  });

  add({
    id: 'SEC-HDR-02',
    group: 'Header & cookie',
    name: 'Lỗi trả JSON kèm correlation id, không lộ stack trace',
    expected: 'Có code/message/correlation_id, không có stack',
    async run() {
      const response = await session.get(null, '/products/00000000-0000-4000-8000-000000000000');
      assertErrorEnvelope(response);
      assert(response.json.correlation_id, 'Thiếu correlation_id');
      assert(!/at\s+\w+\s+\(.*:\d+:\d+\)/.test(response.text), 'Phản hồi chứa stack trace');
      return { actual: `HTTP ${response.status} · code=${response.json.code}` };
    },
  });

  add({
    id: 'SEC-CORS-01',
    group: 'Header & cookie',
    name: 'CORS không mở cho origin lạ và không dùng dấu *',
    expected: 'Access-Control-Allow-Origin không phải * và không echo origin lạ',
    async run() {
      const response = await session.api.request('GET', '/products?page=1&size=1', {
        headers: { origin: 'https://evil.example' },
        captureHistory: false,
      });
      const allow = response.headers.get('access-control-allow-origin');
      assert(allow !== '*', 'CORS đang mở bằng *');
      assert(allow !== 'https://evil.example', 'CORS echo origin lạ');
      return { actual: `ACAO=${allow ?? '(không trả)'}` };
    },
  });

  add({
    id: 'SEC-COOKIE-01',
    group: 'Header & cookie',
    name: 'Cookie refresh có HttpOnly, Secure và SameSite',
    expected: 'Đủ 3 thuộc tính bảo vệ',
    async run() {
      const response = await session.api.post('/auth/demo-login', {
        account: config.accounts.customer.demoAccount || 'customerA',
      });
      const raw = (response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || '']).join('; ');
      assert(/HttpOnly/i.test(raw), 'Thiếu HttpOnly');
      assert(/Secure/i.test(raw), 'Thiếu Secure');
      assert(/SameSite=Strict|SameSite=Lax/i.test(raw), 'Thiếu SameSite');
      return { actual: 'HttpOnly · Secure · SameSite' };
    },
  });

  add({
    id: 'SEC-DATA-01',
    group: 'Rò rỉ dữ liệu',
    name: 'Hồ sơ cá nhân không trả mật khẩu hay hash',
    expected: 'Không có password/password_hash/token',
    async run() {
      const response = await session.get('customer', '/me');
      assertStatus(response, 200);
      const keys = Object.keys(response.json).map((key) => key.toLowerCase());
      assert(!keys.some((key) => key.includes('password')), 'Phản hồi chứa trường password');
      assert(!keys.some((key) => key.includes('hash')), 'Phản hồi chứa trường hash');
      assert(!response.text.includes('$2a$') && !response.text.includes('$2b$'), 'Phản hồi chứa chuỗi BCrypt');
      return { actual: `Các trường: ${keys.join(', ')}` };
    },
  });

  add({
    id: 'SEC-DATA-02',
    group: 'Rò rỉ dữ liệu',
    name: 'Lỗi 404 không lộ đường dẫn nội bộ',
    expected: 'Thông điệp chung, không có đường dẫn tệp/máy chủ',
    async run() {
      const response = await session.get(null, '/khong-ton-tai-route-nay');
      assert([404, 200].includes(response.status), `HTTP ${response.status}`);
      assert(!/[A-Z]:\\\\|\/home\//.test(response.text), 'Lộ đường dẫn nội bộ');
      return { actual: `HTTP ${response.status} · không lộ đường dẫn` };
    },
  });

  add({
    id: 'SEC-MASS-01',
    group: 'Leo thang đặc quyền',
    name: 'Tự gán vai trò ADMIN qua hồ sơ không có hiệu lực',
    expected: 'Không trở thành ADMIN sau khi gửi role/admin',
    async run() {
      await session.patch('customer', '/me', { role: 'ADMIN', roles: ['ADMIN'] });
      const context = await session.get('customer', '/me/context');
      assertStatus(context, 200);
      assert(!(context.json.roles || []).includes('ADMIN'), 'Vai trò ADMIN bị gán trái phép');
      return { actual: `roles=${(context.json.roles || []).join(',')}` };
    },
  });

  add({
    id: 'SEC-METHOD-01',
    group: 'Leo thang đặc quyền',
    name: 'Xoá sản phẩm khi ẩn danh bị chặn',
    expected: 'HTTP 401/403/404/405, không phải 2xx',
    async run() {
      const list = await session.get(null, '/products?page=1&size=1');
      const id = list.json.items?.[0]?.id;
      if (!id) return { skipped: true, notes: 'Catalog rỗng' };
      const response = await session.delete(null, `/products/${id}`);
      if (response.status === 404) {
        // Một số gateway trả 404 cho route không tồn tại — vẫn an toàn.
        return { actual: 'HTTP 404 · route không tồn tại' };
      }
      assert([401, 403, 405].includes(response.status), `Xoá sản phẩm trả HTTP ${response.status}`);
      return { actual: `HTTP ${response.status}` };
    },
  });

  return tests;
}
