/**
 * Standalone Local API Server for Mobile & Web Development
 * Runs on http://localhost:8080/api/v1
 * Zero external dependencies (uses standard node:http)
 */
const http = require('node:http');
const url = require('node:url');

const PORT = process.env.PORT || 8080;

const CATEGORIES = [
  { id: 'cat-phone', name: 'Điện thoại', status: 'ACTIVE' },
  { id: 'cat-tech', name: 'Điện tử', status: 'ACTIVE' },
  { id: 'cat-fashion', name: 'Thời trang', status: 'ACTIVE' },
  { id: 'cat-beauty', name: 'Mỹ phẩm', status: 'ACTIVE' },
  { id: 'cat-home', name: 'Gia dụng', status: 'ACTIVE' },
];

const PRODUCTS = [
  {
    id: 'prod-001',
    store_id: 'store-tech-01',
    store_name: 'TechZone Official',
    product_type_id: 'pt-tech',
    title: 'Tai nghe Bluetooth True Wireless Pro chống ồn chủ động ANC',
    description: 'Tai nghe không dây cao cấp tích hợp chống ồn chủ động ANC lên đến 42dB, thời lượng pin 30 giờ kèm hộp sạc. Hỗ trợ sạc không dây chuẩn Qi, kháng nước IPX4.',
    status: 'ACTIVE',
    moderation_status: 'VISIBLE',
    attributes: {
      'Hãng': 'TechZone Audio',
      'Kết nối': 'Bluetooth 5.3',
      'Thời lượng pin': '30 giờ (kèm case)',
      'Chống nước': 'IPX4',
      'Bảo hành': '12 tháng chính hãng',
    },
    variants: [
      { id: 'var-1-white', sku: 'EP-WHITE', price_vnd: 599000, is_default: true, status: 'ACTIVE' },
      { id: 'var-1-black', sku: 'EP-BLACK', price_vnd: 599000, is_default: false, status: 'ACTIVE' },
      { id: 'var-1-blue', sku: 'EP-NAVY', price_vnd: 649000, is_default: false, status: 'ACTIVE' },
    ],
    images: [
      { id: 'img-1-1', product_id: 'prod-001', image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80', position: 1 },
      { id: 'img-1-2', product_id: 'prod-001', image_url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80', position: 2 },
      { id: 'img-1-3', product_id: 'prod-001', image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80', position: 3 },
    ],
  },
  {
    id: 'prod-002',
    store_id: 'store-tech-01',
    store_name: 'TechZone Official',
    product_type_id: 'pt-tech',
    title: 'Bàn phím cơ không dây RGB MechMaster K8 Layout 75%',
    description: 'Bàn phím cơ hotswap 5 pin, switch pre-lubed mượt mà, kết nối 3 chế độ Bluetooth / 2.4G / Type-C. Pin 4000mAh dùng 3 tuần liên tục.',
    status: 'ACTIVE',
    moderation_status: 'VISIBLE',
    attributes: {
      'Hãng': 'MechMaster',
      'Layout': '75% (84 phím)',
      'Switch': 'Linear Red Switch',
      'Dung lượng pin': '4000mAh',
      'Bảo hành': '24 tháng',
    },
    variants: [
      { id: 'var-2-red', sku: 'KB-RED', price_vnd: 1250000, is_default: true, status: 'ACTIVE' },
      { id: 'var-2-blue', sku: 'KB-BLUE', price_vnd: 1250000, is_default: false, status: 'ACTIVE' },
    ],
    images: [
      { id: 'img-2-1', product_id: 'prod-002', image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', position: 1 },
      { id: 'img-2-2', product_id: 'prod-002', image_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80', position: 2 },
    ],
  },
  {
    id: 'prod-003',
    store_id: 'store-fashion-01',
    store_name: 'Fashion Studio',
    product_type_id: 'pt-fashion',
    title: 'Áo Khoác Bomber Minimalist Windbreaker 2 Lớp',
    description: 'Chất liệu vải dù trượt nước cản gió, form oversize phong cách Hàn Quốc. Khóa kéo YKK chống kẹt siêu bền.',
    status: 'ACTIVE',
    moderation_status: 'VISIBLE',
    attributes: {
      'Chất liệu': 'Vải dù Polyester 2 lớp',
      'Kiểu dáng': 'Oversize Unisex',
      'Xuất xứ': 'Việt Nam',
    },
    variants: [
      { id: 'var-3-black-m', sku: 'BOM-BLK-M', price_vnd: 450000, is_default: true, status: 'ACTIVE' },
      { id: 'var-3-black-l', sku: 'BOM-BLK-L', price_vnd: 450000, is_default: false, status: 'ACTIVE' },
    ],
    images: [
      { id: 'img-3-1', product_id: 'prod-003', image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80', position: 1 },
    ],
  },
  {
    id: 'prod-004',
    store_id: 'store-tech-01',
    store_name: 'TechZone Official',
    product_type_id: 'pt-tech',
    title: 'Chuột Gaming không dây siêu nhẹ HyperLight 58g',
    description: 'Mắt đọc quang học PixArt 3395 26.000 DPI, switch quang học 80 triệu lần nhấn, polling rate 1000Hz.',
    status: 'ACTIVE',
    moderation_status: 'VISIBLE',
    attributes: {
      'Trọng lượng': '58 gram',
      'Cảm biến': 'PixArt 3395 26K DPI',
      'Kết nối': 'Wireless 2.4G + Type-C',
    },
    variants: [
      { id: 'var-4-white', sku: 'MOUSE-WHT', price_vnd: 890000, is_default: true, status: 'ACTIVE' },
    ],
    images: [
      { id: 'img-4-1', product_id: 'prod-004', image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80', position: 1 },
    ],
  },
  {
    id: 'prod-005',
    store_id: 'store-beauty-01',
    store_name: 'Beauty Natural',
    product_type_id: 'pt-beauty',
    title: 'Bộ Serum Phục Hồi Dưỡng Ẩm Da Chuyên Sâu B5 + HA',
    description: 'Tinh chất cấp ẩm tức thì, làm dịu da nhạy cảm và tái tạo hàng rào bảo vệ da tự nhiên sau 7 ngày sử dụng.',
    status: 'ACTIVE',
    moderation_status: 'VISIBLE',
    attributes: {
      'Dung tích': '30ml',
      'Loại da': 'Mọi loại da, da nhạy cảm',
      'Hạn sử dụng': '3 năm từ NSX',
    },
    variants: [
      { id: 'var-5-30ml', sku: 'SRM-30ML', price_vnd: 380000, is_default: true, status: 'ACTIVE' },
    ],
    images: [
      { id: 'img-5-1', product_id: 'prod-005', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80', position: 1 },
    ],
  },
];

let cartItems = [
  {
    id: 'cart-01',
    store_id: 'store-tech-01',
    store_name: 'TechZone Official',
    product_id: 'prod-001',
    variant_id: 'var-1-white',
    title: 'Tai nghe Bluetooth True Wireless Pro',
    sku: 'EP-WHITE',
    unit_price_vnd: 599000,
    quantity: 1,
  },
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id, Idempotency-Key',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';
  const query = parsed.query;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id, Idempotency-Key',
    });
    return res.end();
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let jsonBody = {};
    if (body) {
      try { jsonBody = JSON.parse(body); } catch (_) {}
    }

    console.log(`[API] ${req.method} ${pathname}`);

    if (req.method === 'GET' && pathname === '/api/v1/categories') {
      return sendJson(res, 200, { items: CATEGORIES, total: CATEGORIES.length, page: 1, size: 50 });
    }

    if (req.method === 'GET' && pathname === '/api/v1/products') {
      let filtered = [...PRODUCTS];
      if (query.q) {
        const qLower = String(query.q).toLowerCase();
        filtered = filtered.filter(p => p.title.toLowerCase().includes(qLower));
      }
      return sendJson(res, 200, {
        items: filtered,
        total: filtered.length,
        page: Number(query.page) || 1,
        size: Number(query.size) || 20,
      });
    }

    const reviewMatch = pathname.match(/^\/api\/v1\/products\/([^/]+)\/reviews$/);
    if (req.method === 'GET' && reviewMatch) {
      return sendJson(res, 200, {
        items: [
          { id: 'rev-01', user_name: 'Nguyễn Văn A', rating: 5, body: 'Sản phẩm hoàn thiện rất tốt, nghe nhạc bass ấm, pin trâu đúng quảng cáo!', created_at: '2026-10-20' },
          { id: 'rev-02', user_name: 'Trần Thị B', rating: 5, body: 'Đóng gói cẩn thận, giao hàng nhanh 2 ngày là nhận được. Rất hài lòng!', created_at: '2026-10-22' },
        ],
        total: 2,
        page: 1,
        size: 20,
      });
    }

    const relatedMatch = pathname.match(/^\/api\/v1\/products\/([^/]+)\/related$/);
    if (req.method === 'GET' && relatedMatch) {
      const currentId = relatedMatch[1];
      const others = PRODUCTS.filter(p => p.id !== currentId).slice(0, 4);
      return sendJson(res, 200, { items: others, total: others.length, page: 1, size: 10 });
    }

    const prodMatch = pathname.match(/^\/api\/v1\/products\/([^/]+)$/);
    if (req.method === 'GET' && prodMatch) {
      const product = PRODUCTS.find(p => p.id === prodMatch[1]);
      if (product) {
        return sendJson(res, 200, product);
      }
      return sendJson(res, 404, { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm.' });
    }

    if (req.method === 'GET' && pathname === '/api/v1/recommendations/for-you') {
      return sendJson(res, 200, {
        badge: 'Gợi ý cho bạn',
        items: PRODUCTS.slice(0, 4),
        model: 'baseline-rule',
      });
    }

    if (req.method === 'GET' && pathname === '/api/v1/cart/items') {
      return sendJson(res, 200, { items: cartItems, total: cartItems.length });
    }

    if (req.method === 'POST' && pathname === '/api/v1/cart/items') {
      const newItem = {
        id: 'cart-' + Date.now(),
        store_id: 'store-tech-01',
        store_name: 'TechZone Official',
        product_id: jsonBody.product_id || 'prod-001',
        variant_id: jsonBody.variant_id || 'var-1-white',
        title: 'Sản phẩm đã chọn',
        sku: 'SKU-SELECTED',
        unit_price_vnd: 599000,
        quantity: jsonBody.quantity || 1,
      };
      cartItems.push(newItem);
      return sendJson(res, 200, { status: 'success', item: newItem });
    }

    if (req.method === 'GET' && pathname === '/api/v1/me') {
      return sendJson(res, 200, {
        user_id: 'usr-customer-1',
        display_name: 'Bình',
        email: 'binh@pbl6.vn',
        phone: '0901234567',
        roles: ['CUSTOMER'],
      });
    }

    if (req.method === 'GET' && pathname === '/api/v1/me/addresses') {
      return sendJson(res, 200, {
        items: [
          {
            id: 'addr-01',
            recipient_name: 'Bình',
            phone: '0901234567',
            street_address: '123 Nguyễn Lương Bằng, Hòa Khánh Bắc',
            city: 'Đà Nẵng',
            is_default: true,
          },
        ],
        total: 1,
      });
    }

    if (req.method === 'POST' && pathname === '/api/v1/auth/login') {
      return sendJson(res, 200, {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        user_id: 'usr-customer-1',
      });
    }

    if (req.method === 'POST' && pathname === '/api/v1/auth/refresh') {
      return sendJson(res, 200, {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
      });
    }

    return sendJson(res, 404, { code: 'NOT_FOUND', message: 'Endpoint not mapped on mock server.' });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  PBL6 Local API Server running on port ${PORT}`);
  console.log(`  - Local:    http://localhost:${PORT}/api/v1`);
  console.log(`  - Android:  http://10.0.2.2:${PORT}/api/v1`);
  console.log(`=======================================================`);
});
