import {
  assert,
  assertCode,
  assertErrorEnvelope,
  assertStatus,
  shortBody,
} from '../lib/session.mjs';

/**
 * Bộ test API (black-box) chạy trực tiếp trên server được cấu hình trong
 * tester/config/server.config.json. Không phụ thuộc Postman/Newman.
 */
export function defineApiTests(session, config) {
  const tests = [];
  const add = (test) => tests.push({ group: 'Khác', ...test });
  let sample = null;

  async function sampleProduct() {
    if (sample) return sample;
    const response = await session.get(null, '/products?page=1&size=5');
    assertStatus(response, 200, 'Lấy danh sách sản phẩm mẫu');
    sample = response.json.items?.find((item) => item.variants?.length) || response.json.items?.[0];
    assert(sample, 'Catalog công khai đang rỗng — cần seed dữ liệu trước khi chạy API test');
    return sample;
  }

  // ---------------------------------------------------------------- Catalog
  add({
    id: 'API-CAT-01',
    group: 'Catalog công khai',
    name: 'Danh sách sản phẩm trả 200 và đúng cấu trúc phân trang',
    expected: 'HTTP 200, items là mảng, total/page/size là số',
    async run() {
      const response = await session.get(null, '/products?page=1&size=5');
      assertStatus(response, 200, 'GET /products');
      const body = response.json;
      assert(Array.isArray(body.items), 'items phải là mảng');
      assert(body.items.length <= 5, `size=5 nhưng trả ${body.items.length} phần tử`);
      assert(Number.isInteger(body.total), 'total phải là số nguyên');
      assert(body.page === 1 && body.size === 5, 'page/size trả về không khớp yêu cầu');
      return { actual: `HTTP 200 · ${body.items.length} items · total=${body.total} · ${response.durationMs} ms` };
    },
  });

  add({
    id: 'API-CAT-02',
    group: 'Catalog công khai',
    name: 'Biên trên của size = 100 được chấp nhận',
    expected: 'HTTP 200',
    async run() {
      const response = await session.get(null, '/products?page=1&size=100');
      assertStatus(response, 200, 'GET /products?size=100');
      assert(response.json.items.length <= 100, 'Trả quá 100 phần tử');
      return { actual: `HTTP 200 · ${response.json.items.length} items` };
    },
  });

  add({
    id: 'API-CAT-03',
    group: 'Catalog công khai',
    name: 'size = 101 bị chặn với VALIDATION_FAILED',
    expected: 'HTTP 422 · code=VALIDATION_FAILED',
    async run() {
      const response = await session.get(null, '/products?page=1&size=101');
      assertStatus(response, 422, 'GET /products?size=101');
      assertCode(response, 'VALIDATION_FAILED');
      assertErrorEnvelope(response);
      return { actual: `HTTP 422 · ${response.json.details?.[0]?.field || 'size'} vượt biên` };
    },
  });

  add({
    id: 'API-CAT-04',
    group: 'Catalog công khai',
    name: 'page = 0 bị chặn',
    expected: 'HTTP 422 · VALIDATION_FAILED',
    async run() {
      const response = await session.get(null, '/products?page=0&size=5');
      assertStatus(response, 422);
      assertCode(response, 'VALIDATION_FAILED');
      return { actual: 'HTTP 422' };
    },
  });

  add({
    id: 'API-CAT-05',
    group: 'Catalog công khai',
    name: 'Tìm kiếm theo từ khoá trả kết quả đúng định dạng',
    expected: 'HTTP 200, mỗi item có id/title',
    async run() {
      const response = await session.get(null, '/products?q=ao&page=1&size=10');
      assertStatus(response, 200);
      assert(Array.isArray(response.json.items), 'items phải là mảng');
      for (const item of response.json.items) {
        assert(typeof item.id === 'string' && typeof item.title === 'string', 'Item thiếu id/title');
      }
      return { actual: `HTTP 200 · ${response.json.total} kết quả cho "ao"` };
    },
  });

  add({
    id: 'API-CAT-06',
    group: 'Catalog công khai',
    name: 'Sắp xếp giá tăng dần không bị đảo thứ tự',
    expected: 'Giá nhỏ nhất của các item không giảm dần',
    async run() {
      const response = await session.get(null, '/products?sort=price_asc&page=1&size=20');
      assertStatus(response, 200);
      const prices = response.json.items
        .map((item) => Math.min(...(item.variants || []).map((variant) => variant.price_vnd)))
        .filter((value) => Number.isFinite(value));
      for (let index = 1; index < prices.length; index += 1) {
        assert(prices[index] >= prices[index - 1], `Giá bị đảo tại vị trí ${index}: ${prices[index - 1]} → ${prices[index]}`);
      }
      return { actual: `HTTP 200 · ${prices.length} mức giá đã kiểm tra` };
    },
  });

  add({
    id: 'API-CAT-07',
    group: 'Catalog công khai',
    name: 'Chi tiết sản phẩm trả đủ biến thể và ảnh',
    expected: 'HTTP 200, id khớp, variants/images là mảng',
    async run() {
      const item = await sampleProduct();
      const response = await session.get(null, `/products/${item.id}`);
      assertStatus(response, 200, 'GET /products/:id');
      const body = response.json;
      assert(body.id === item.id, 'id trả về không khớp');
      assert(Array.isArray(body.variants) && body.variants.length > 0, 'Thiếu mảng variants');
      assert(Array.isArray(body.images), 'Thiếu mảng images');
      return { actual: `HTTP 200 · ${body.title} · ${body.variants.length} biến thể` };
    },
  });

  add({
    id: 'API-CAT-08',
    group: 'Catalog công khai',
    name: 'Sản phẩm không tồn tại trả 404 NOT_FOUND',
    expected: 'HTTP 404 · code=NOT_FOUND',
    async run() {
      const response = await session.get(null, '/products/00000000-0000-4000-8000-000000000000');
      assertStatus(response, 404);
      assertCode(response, 'NOT_FOUND');
      return { actual: 'HTTP 404' };
    },
  });

  add({
    id: 'API-CAT-09',
    group: 'Catalog công khai',
    name: 'Sản phẩm liên quan trả về mảng hợp lệ',
    expected: 'HTTP 200 · items là mảng',
    async run() {
      const item = await sampleProduct();
      const response = await session.get(null, `/products/${item.id}/related?page=1&size=5`);
      assertStatus(response, 200);
      assert(Array.isArray(response.json.items), 'items phải là mảng');
      return { actual: `HTTP 200 · ${response.json.items.length} sản phẩm liên quan` };
    },
  });

  add({
    id: 'API-CAT-10',
    group: 'Catalog công khai',
    name: 'Danh mục và loại sản phẩm tải được',
    expected: 'HTTP 200 cho /categories và /product-types',
    async run() {
      const categories = await session.get(null, '/categories');
      const types = await session.get(null, '/product-types');
      assertStatus(categories, 200);
      assertStatus(types, 200);
      assert(Array.isArray(categories.json.items) && categories.json.items.length > 0, 'Danh mục rỗng');
      assert(Array.isArray(types.json.items), 'product-types phải là mảng');
      return { actual: `${categories.json.items.length} danh mục · ${types.json.items.length} loại` };
    },
  });

  // ------------------------------------------------------------- Xác thực
  add({
    id: 'API-AUTH-01',
    group: 'Xác thực & phiên',
    name: 'Gọi /me khi chưa đăng nhập bị từ chối',
    expected: 'HTTP 401 · UNAUTHENTICATED',
    async run() {
      const response = await session.get(null, '/me');
      assertStatus(response, 401);
      assertCode(response, 'UNAUTHENTICATED');
      return { actual: 'HTTP 401' };
    },
  });

  add({
    id: 'API-AUTH-02',
    group: 'Xác thực & phiên',
    name: 'Đăng nhập demo trả access token và context vai trò',
    expected: 'HTTP 200 · access_token + roles chứa CUSTOMER',
    async run() {
      const login = await session.login('customer');
      assert(login.token && login.token.split('.').length === 3, 'access_token không phải JWT');
      assert(Array.isArray(login.context?.roles), 'context.roles phải là mảng');
      assert(login.context.roles.includes('CUSTOMER'), `Thiếu vai trò CUSTOMER: ${login.context.roles}`);
      return { actual: `HTTP 200 · roles=${login.context.roles.join(',')}` };
    },
  });

  add({
    id: 'API-AUTH-03',
    group: 'Xác thực & phiên',
    name: 'Token hợp lệ đọc được hồ sơ cá nhân',
    expected: 'HTTP 200, email khớp tài khoản cấu hình',
    async run() {
      const account = config.accounts.customer;
      const response = await session.get('customer', '/me');
      assertStatus(response, 200);
      assert(response.json.email === account.email, `Email trả về ${response.json.email} ≠ ${account.email}`);
      return { actual: `HTTP 200 · ${response.json.email}` };
    },
  });

  add({
    id: 'API-AUTH-04',
    group: 'Xác thực & phiên',
    name: 'Context trả đúng vai trò và quyền',
    expected: 'HTTP 200 · user_id trùng /me · roles là mảng',
    async run() {
      const me = await session.get('customer', '/me');
      const context = await session.get('customer', '/me/context');
      assertStatus(context, 200);
      assert(context.json.user_id === me.json.user_id, 'user_id không khớp giữa /me và /me/context');
      assert(Array.isArray(context.json.roles), 'roles phải là mảng');
      return { actual: `HTTP 200 · roles=${context.json.roles.join(',')}` };
    },
  });

  add({
    id: 'API-AUTH-05',
    group: 'Xác thực & phiên',
    name: 'Sai mật khẩu bị từ chối, không lộ tài khoản tồn tại',
    expected: 'HTTP 401 · INVALID_CREDENTIALS, thông điệp giống nhau cho email lạ',
    async run() {
      const known = await session.api.post('/auth/login', {
        email: config.accounts.customer.email,
        password: 'sai-mat-khau-123',
      });
      const unknown = await session.api.post('/auth/login', {
        email: 'khong-ton-tai@pbl6.test',
        password: 'sai-mat-khau-123',
      });
      assertStatus(known, 401);
      assertStatus(unknown, 401);
      assertCode(known, 'INVALID_CREDENTIALS');
      assertCode(unknown, 'INVALID_CREDENTIALS');
      assert(known.json.message === unknown.json.message, 'Thông điệp lỗi khác nhau → có thể dò tài khoản');
      return { actual: 'HTTP 401 giống nhau cho cả hai trường hợp' };
    },
  });

  add({
    id: 'API-AUTH-06',
    group: 'Xác thực & phiên',
    name: 'Tài khoản demo không hợp lệ bị chặn',
    expected: 'HTTP 422 · VALIDATION_FAILED',
    async run() {
      const response = await session.api.post('/auth/demo-login', { account: 'khong-co-tai-khoan-nay' });
      assertStatus(response, 422);
      assertCode(response, 'VALIDATION_FAILED');
      return { actual: 'HTTP 422' };
    },
  });

  add({
    id: 'API-AUTH-07',
    group: 'Xác thực & phiên',
    name: 'JWT bị sửa chữ ký không dùng được',
    expected: 'HTTP 401',
    async run() {
      const { token } = await session.login('customer');
      const [header, payload] = token.split('.');
      const tampered = `${header}.${payload}.AAAA${token.split('.')[2].slice(4)}`;
      const response = await session.get(null, '/me', { token: tampered });
      assertStatus(response, 401);
      return { actual: 'HTTP 401' };
    },
  });

  add({
    id: 'API-AUTH-08',
    group: 'Xác thực & phiên',
    name: 'Đăng xuất thu hồi access token hiện tại',
    expected: 'Sau logout, token cũ trả 401',
    async run() {
      const account = config.accounts.customer;
      if (!account.password) {
        return { skipped: true, notes: 'Không đọc được SEED_PASSWORD để đăng nhập bằng mật khẩu' };
      }
      const login = await session.api.post('/auth/login', { email: account.email, password: account.password });
      assertStatus(login, 200, 'Đăng nhập tạm');
      const token = login.json.access_token;
      assert(login.json.refresh_token, 'Response đăng nhập thiếu refresh_token');
      const logout = await session.api.post('/auth/logout', { refresh_token: login.json.refresh_token }, { token });
      assert([200, 204].includes(logout.status), `Logout trả HTTP ${logout.status}`);
      const after = await session.get(null, '/me', { token });
      assertStatus(after, 401, 'Dùng lại token sau logout');
      return { actual: 'Logout 200 · token cũ bị từ chối' };
    },
  });

  add({
    id: 'API-AUTH-09',
    group: 'Xác thực & phiên',
    name: 'Cookie phiên có HttpOnly, Secure, SameSite',
    expected: 'Set-Cookie chứa HttpOnly + SameSite + Secure',
    async run() {
      const response = await session.api.post('/auth/demo-login', { account: config.accounts.customer.demoAccount || 'customerA' });
      assertStatus(response, 200);
      const cookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
      const raw = cookies.join('; ');
      assert(/HttpOnly/i.test(raw), 'Cookie thiếu HttpOnly');
      assert(/SameSite=/i.test(raw), 'Cookie thiếu SameSite');
      assert(/Secure/i.test(raw), 'Cookie thiếu Secure (server HTTPS)');
      return { actual: `${cookies.length} cookie · HttpOnly/Secure/SameSite` };
    },
  });

  // ------------------------------------------------------- Khách hàng
  add({
    id: 'API-CUS-01',
    group: 'Khách hàng & giỏ hàng',
    name: 'Đọc giỏ hàng của chính mình',
    expected: 'HTTP 200 · items là mảng',
    async run() {
      const response = await session.get('customer', '/cart/items');
      assertStatus(response, 200);
      assert(Array.isArray(response.json.items), 'items phải là mảng');
      return { actual: `HTTP 200 · ${response.json.items.length} dòng` };
    },
  });

  add({
    id: 'API-CUS-02',
    group: 'Khách hàng & giỏ hàng',
    name: 'Thêm → sửa → xoá một dòng giỏ hàng',
    expected: 'Thêm 2xx, sửa 2xx, xoá 2xx và dòng biến mất',
    async run() {
      const product = await sampleProduct();
      const variant = product.variants.find((item) => item.status === 'ACTIVE' && item.available_quantity > 1);
      if (!variant) return { skipped: true, notes: 'Sản phẩm mẫu không còn biến thể khả dụng' };
      const added = await session.post('customer', '/cart/items', {
        product_id: product.id,
        variant_id: variant.id,
        quantity: 1,
      });
      assert([200, 201].includes(added.status), `Thêm giỏ trả HTTP ${added.status}: ${shortBody(added)}`);
      const list = await session.get('customer', '/cart/items');
      const line = list.json.items.find((item) => item.variant_id === variant.id);
      assert(line, 'Không tìm thấy dòng vừa thêm trong giỏ');
      try {
        const updated = await session.patch('customer', `/cart/items/${line.id}`, { quantity: 2 });
        assert([200, 204].includes(updated.status), `Sửa giỏ trả HTTP ${updated.status}`);
        const afterUpdate = await session.get('customer', '/cart/items');
        const line2 = afterUpdate.json.items.find((item) => item.id === line.id);
        assert(line2?.quantity === 2, `Số lượng sau sửa là ${line2?.quantity}, mong đợi 2`);
      } finally {
        const deleted = await session.delete('customer', `/cart/items/${line.id}`);
        assert([200, 204].includes(deleted.status), `Xoá giỏ trả HTTP ${deleted.status}`);
      }
      const afterDelete = await session.get('customer', '/cart/items');
      assert(!afterDelete.json.items.some((item) => item.id === line.id), 'Dòng giỏ vẫn còn sau khi xoá');
      return { actual: 'Thêm 2xx · sửa 2xx · xoá 2xx · đã dọn dữ liệu' };
    },
  });

  add({
    id: 'API-CUS-03',
    group: 'Khách hàng & giỏ hàng',
    name: 'Số lượng giỏ hàng = 0 bị từ chối',
    expected: 'HTTP 422 · VALIDATION_FAILED',
    async run() {
      const product = await sampleProduct();
      const variant = product.variants?.[0];
      if (!variant) return { skipped: true, notes: 'Không có biến thể để thử' };
      const response = await session.post('customer', '/cart/items', {
        product_id: product.id,
        variant_id: variant.id,
        quantity: 0,
      });
      assertStatus(response, 422);
      assertCode(response, 'VALIDATION_FAILED');
      return { actual: 'HTTP 422' };
    },
  });

  add({
    id: 'API-CUS-04',
    group: 'Khách hàng & giỏ hàng',
    name: 'Các màn hình tài khoản khách hàng tải được',
    expected: 'favorites / addresses / orders / notifications / recommendations đều 200',
    async run() {
      const paths = ['/me/favorites', '/me/addresses', '/me/orders', '/me/notifications', '/recommendations/for-you'];
      const results = [];
      for (const path of paths) {
        const response = await session.get('customer', path);
        assertStatus(response, 200, `GET ${path}`);
        results.push(`${path}=${response.status}`);
      }
      return { actual: results.join(' · ') };
    },
  });

  add({
    id: 'API-CUS-05',
    group: 'Khách hàng & giỏ hàng',
    name: 'Không đọc được đơn hàng của khách khác (IDOR)',
    expected: 'HTTP 403 hoặc 404',
    async run() {
      const mine = await session.get('customer', '/me/orders?page=1&size=1');
      const other = await session.get('customerB', '/me/orders?page=1&size=1');
      const orderId = mine.json.items?.[0]?.id;
      const otherId = other.json.items?.[0]?.id;
      if (!orderId || !otherId || orderId === otherId) {
        return { skipped: true, notes: 'Hai tài khoản chưa có đơn hàng khác nhau để thử IDOR' };
      }
      const response = await session.get('customerB', `/me/orders/${orderId}`);
      assert([403, 404].includes(response.status), `Đọc đơn người khác trả HTTP ${response.status}`);
      return { actual: `HTTP ${response.status} · không lộ đơn của customer A` };
    },
  });

  // ------------------------------------------------------------- RBAC
  const rbacCases = [
    ['customer', '/store/products', 403, 'Khách hàng không vào được khu cửa hàng'],
    ['customer', '/admin/users', 403, 'Khách hàng không vào được khu quản trị'],
    ['staff', '/store/products', 200, 'Nhân viên bán hàng đọc được sản phẩm cửa hàng'],
    ['staff', '/store/orders', 200, 'Nhân viên bán hàng đọc được đơn cửa hàng'],
    ['owner', '/store/inventory', 200, 'Chủ cửa hàng đọc được tồn kho'],
    ['admin', '/admin/users', 200, 'Quản trị viên đọc được danh sách người dùng'],
    ['admin', '/admin/audit/identity', 200, 'Quản trị viên đọc được audit danh tính'],
    ['admin', '/admin/store-applications', 200, 'Quản trị viên đọc được đơn mở cửa hàng'],
  ];
  rbacCases.forEach(([role, path, status, name], index) => {
    add({
      id: `API-RBAC-${String(index + 1).padStart(2, '0')}`,
      group: 'Phân quyền RBAC',
      name,
      expected: `HTTP ${status} với vai trò ${role}`,
      async run() {
        const response = await session.get(role, path);
        assertStatus(response, status, `${role} GET ${path}`);
        if (status !== 200) assertCode(response, 'FORBIDDEN');
        return { actual: `HTTP ${response.status} · ${role} → ${path}` };
      },
    });
  });

  add({
    id: 'API-RBAC-09',
    group: 'Phân quyền RBAC',
    name: 'Chủ cửa hàng đọc báo cáo doanh thu theo khoảng ngày',
    expected: 'HTTP 200 với from/to ISO',
    async run() {
      const from = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
      const to = new Date().toISOString();
      const response = await session.get('owner', `/store/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      assertStatus(response, 200, 'GET /store/reports');
      assert(typeof response.json === 'object', 'Báo cáo phải là JSON');
      return { actual: 'HTTP 200 · báo cáo tài chính cửa hàng' };
    },
  });

  // ------------------------------------------------------------- SLA
  add({
    id: 'API-SLA-01',
    group: 'Hiệu năng API',
    name: `Độ trễ p95 của toàn bộ lời gọi < ${config.api.maxResponseMs} ms`,
    expected: `p95 < ${config.api.maxResponseMs} ms`,
    async run() {
      const latency = session.api.latency();
      assert(latency.p95 < config.api.maxResponseMs, `p95 = ${latency.p95} ms vượt ngưỡng ${config.api.maxResponseMs} ms`);
      return {
        actual: `${latency.count} request · p50=${latency.p50} ms · p95=${latency.p95} ms · max=${latency.max} ms`,
      };
    },
  });

  return tests;
}
