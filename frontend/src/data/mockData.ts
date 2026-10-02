import {
  User,
  Address,
  Store,
  Category,
  Product,
  CartItem,
  Voucher,
  Order,
  Review,
  MailboxMessage,
  StoreApplication,
  StaffMember,
  StaffInvitation,
  StockMovement,
  AuditLog
} from '../types';

export const SEED_USERS: User[] = [
  {
    id: 'user-cust-1',
    email: 'customer@pbl6.vn',
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    isEmailVerified: true,
    isLocked: false,
    activeRole: 'CUSTOMER'
  },
  {
    id: 'user-owner-1',
    email: 'owner@techhub.vn',
    fullName: 'Trần Thị Bình',
    phone: '0912345678',
    isEmailVerified: true,
    isLocked: false,
    activeRole: 'STORE_OWNER',
    storeId: 'store-1'
  },
  {
    id: 'user-seller-1',
    email: 'seller@techhub.vn',
    fullName: 'Lê Văn Cường',
    phone: '0923456789',
    isEmailVerified: true,
    isLocked: false,
    activeRole: 'SELLER',
    storeId: 'store-1'
  },
  {
    id: 'user-owner-2',
    email: 'owner@fashionistar.vn',
    fullName: 'Phạm Thị Dung',
    phone: '0934567890',
    isEmailVerified: true,
    isLocked: false,
    activeRole: 'STORE_OWNER',
    storeId: 'store-2'
  },
  {
    id: 'user-admin-1',
    email: 'admin@pbl6.vn',
    fullName: 'Hệ Thống Quản Trị Viên (Admin)',
    phone: '0999999999',
    isEmailVerified: true,
    isLocked: false,
    activeRole: 'ADMIN'
  }
];

export const SEED_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    userId: 'user-cust-1',
    recipientName: 'Nguyễn Văn An',
    phone: '0901234567',
    fullAddress: '54 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
    isDefault: true
  },
  {
    id: 'addr-2',
    userId: 'user-cust-1',
    recipientName: 'Nguyễn Văn An (Công ty)',
    phone: '0901234567',
    fullAddress: 'Tòa nhà FPT Complex, Đường Nam Kỳ Khởi Nghĩa, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
    isDefault: false
  }
];

export const SEED_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'TechHub Official Store',
    slug: 'techhub-official',
    description: 'Chuyên cung cấp smartphone, laptop, tai nghe Bluetooth và phụ kiện chính hãng 100%. Bảo hành 12 tháng 1 đổi 1.',
    logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    ownerId: 'user-owner-1',
    status: 'ACTIVE',
    shippingFeeVnd: 30000,
    ratingAvg: 4.9,
    totalReviews: 128,
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'store-2',
    name: 'Fashionistar Studio',
    slug: 'fashionistar-studio',
    description: 'Thời trang thiết kế trẻ trung, chất liệu organic thoáng mát. Xu hướng phong cách tối giản thanh lịch.',
    logo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
    ownerId: 'user-owner-2',
    status: 'ACTIVE',
    shippingFeeVnd: 25000,
    ratingAvg: 4.8,
    totalReviews: 86,
    createdAt: '2026-02-10T10:30:00Z'
  },
  {
    id: 'store-3',
    name: 'GreenLife Living',
    slug: 'greenlife-living',
    description: 'Đồ dùng gia đình eco-friendly, đèn bàn bảo vệ mắt và thiết bị thông minh cho không gian sống xanh.',
    logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    ownerId: 'user-cust-1',
    status: 'ACTIVE',
    shippingFeeVnd: 20000,
    ratingAvg: 4.7,
    totalReviews: 42,
    createdAt: '2026-03-01T09:15:00Z'
  }
];

export const SEED_CATEGORIES: Category[] = [
  { id: 'cat-tech', name: 'Điện Tử & Thiết Bị Số', slug: 'dien-tu-thiet-bi-so', icon: 'Smartphone', itemCount: 42 },
  { id: 'cat-fashion', name: 'Thời Trang & Phụ Kiện', slug: 'thoi-trang-phu-kien', icon: 'Shirt', itemCount: 58 },
  { id: 'cat-home', name: 'Nhà Cửa & Đời Sống', slug: 'nha-cua-doi-song', icon: 'Home', itemCount: 31 },
  { id: 'cat-books', name: 'Sách & Văn Phòng Phẩm', slug: 'sach-van-phong-pham', icon: 'BookOpen', itemCount: 19 }
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    categoryId: 'cat-tech',
    categoryName: 'Điện Tử & Thiết Bị Số',
    name: 'Tai nghe Không Dây Chống Ồn ANC Pro X3',
    slug: 'tai-nghe-chong-on-anc-pro-x3',
    shortDescription: 'Chống ồn chủ động Hybrid ANC 45dB, Pin 40 giờ, Bluetooth 5.4 giải mã Hi-Res LDAC.',
    description: 'Tai nghe chụp tai ANC Pro X3 sở hữu driver dynamic 40mm màng loa bọc titan, mang lại âm bass sâu chắc và dải mid ngọt ngào. Khả năng chống ồn kép loại bỏ đến 98% tạp âm từ máy bay, xe bus hay văn phòng. Hỗ trợ sạc nhanh qua cổng Type-C, chỉ 10 phút sạc cho 5 giờ nghe liên tục.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'PUBLISHED',
    isAdminHidden: false,
    ratingAvg: 4.9,
    ratingCount: 54,
    salesCount: 310,
    attributes: [
      { name: 'Thời lượng pin', value: '40 giờ (kèm ANC)' },
      { name: 'Chuẩn kết nối', value: 'Bluetooth 5.4' },
      { name: 'Trọng lượng', value: '240g' },
      { name: 'Bảo hành', value: '12 tháng chính hãng' }
    ],
    variants: [
      {
        id: 'var-1-1',
        productId: 'prod-1',
        sku: 'ANCX3-BLK',
        title: 'Màu Đen Nhám',
        priceVnd: 1290000,
        originalPriceVnd: 1690000,
        quantity: 45,
        reservedQuantity: 2,
        attributes: { 'Màu sắc': 'Đen Nhám' },
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'var-1-2',
        productId: 'prod-1',
        sku: 'ANCX3-WHT',
        title: 'Màu Trắng Bạc',
        priceVnd: 1350000,
        originalPriceVnd: 1690000,
        quantity: 28,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Trắng Bạc' },
        image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80'
      }
    ],
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    categoryId: 'cat-tech',
    categoryName: 'Điện Tử & Thiết Bị Số',
    name: 'Bàn phím cơ Không Dây RGB MechMaster K8',
    slug: 'ban-phim-co-khong-day-mechmaster-k8',
    shortDescription: 'Layout 75%, Hotswap 5 pin, Gasket mount êm ái, Kết nối 3 chế độ (Type-C / 2.4G / BT).',
    description: 'Bàn phím MechMaster K8 trang bị switch linear factory-lubed mượt mà, keycap PBT doubleshot cao cấp chống bóng. Thiết kế gasket mount với 5 lớp đệm tiêu âm giúp âm thanh gõ trầm ấm và không gây khó chịu cho người xung quanh.',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'PUBLISHED',
    isAdminHidden: false,
    ratingAvg: 4.8,
    ratingCount: 38,
    salesCount: 195,
    attributes: [
      { name: 'Switch', value: 'Pre-lubed Red Switch' },
      { name: 'Keycap', value: 'PBT Double-shot Cherry Profile' },
      { name: 'Dung lượng pin', value: '4000mAh' }
    ],
    variants: [
      {
        id: 'var-2-1',
        productId: 'prod-2',
        sku: 'K8-RED-GRY',
        title: 'Red Switch / Xám Retro',
        priceVnd: 1450000,
        originalPriceVnd: 1800000,
        quantity: 20,
        reservedQuantity: 1,
        attributes: { 'Switch': 'Red Linear', 'Màu sắc': 'Xám Retro' }
      },
      {
        id: 'var-2-2',
        productId: 'prod-2',
        sku: 'K8-BRN-BLU',
        title: 'Brown Switch / Xanh Navy',
        priceVnd: 1490000,
        originalPriceVnd: 1800000,
        quantity: 15,
        reservedQuantity: 0,
        attributes: { 'Switch': 'Brown Tactile', 'Màu sắc': 'Xanh Navy' }
      }
    ],
    createdAt: '2026-02-15T14:20:00Z'
  },
  {
    id: 'prod-3',
    storeId: 'store-2',
    storeName: 'Fashionistar Studio',
    categoryId: 'cat-fashion',
    categoryName: 'Thời Trang & Phụ Kiện',
    name: 'Áo Khoác Bomber Minimalist WindBreaker',
    slug: 'ao-khoac-bomber-minimalist-windbreaker',
    shortDescription: 'Chất vải Gore-Tex trượt nước, cản gió tối ưu, lót lưới thoáng khí form oversize.',
    description: 'Áo khoác bomber thế hệ mới từ Fashionistar Studio với đường may ép seam chống nước tối đa. Thiết kế túi khóa chìm hiện đại, cổ áo và tay áo bo dệt sợi spandex co giãn cao cấp.',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'PUBLISHED',
    isAdminHidden: false,
    ratingAvg: 4.85,
    ratingCount: 42,
    salesCount: 240,
    attributes: [
      { name: 'Chất liệu', value: 'Vải dù sợi tổng hợp 2 lớp trượt nước' },
      { name: 'Kiểu dáng', value: 'Oversize Streetwear' },
      { name: 'Xuất xứ', value: 'Việt Nam' }
    ],
    variants: [
      {
        id: 'var-3-1',
        productId: 'prod-3',
        sku: 'BOM-BLK-M',
        title: 'Đen Tuyển / Size M',
        priceVnd: 490000,
        originalPriceVnd: 650000,
        quantity: 50,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'M' }
      },
      {
        id: 'var-3-2',
        productId: 'prod-3',
        sku: 'BOM-BLK-L',
        title: 'Đen Tuyển / Size L',
        priceVnd: 490000,
        originalPriceVnd: 650000,
        quantity: 35,
        reservedQuantity: 2,
        attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'L' }
      },
      {
        id: 'var-3-3',
        productId: 'prod-3',
        sku: 'BOM-BGE-L',
        title: 'Be Cát / Size L',
        priceVnd: 520000,
        originalPriceVnd: 650000,
        quantity: 22,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Be Cát', 'Kích cỡ': 'L' }
      }
    ],
    createdAt: '2026-03-01T08:00:00Z'
  },
  {
    id: 'prod-4',
    storeId: 'store-2',
    storeName: 'Fashionistar Studio',
    categoryId: 'cat-fashion',
    categoryName: 'Thời Trang & Phụ Kiện',
    name: 'Áo Polo Premium Cotton Compact Dệt Tổ Ong',
    slug: 'ao-polo-premium-cotton-compact',
    shortDescription: '100% Cotton chải kỹ, cổ dệt jacquard bền màu, giữ form sau 100 lần giặt.',
    description: 'Sản phẩm áo polo nam nữ chất liệu cotton dệt tổ ong dày dặn, thấm hút mồ hôi vượt trội. Phù hợp cả đi làm văn phòng và dạo phố cuối tuần.',
    images: [
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'PUBLISHED',
    isAdminHidden: false,
    ratingAvg: 4.75,
    ratingCount: 26,
    salesCount: 180,
    attributes: [
      { name: 'Chất liệu', value: '100% Cotton USA' },
      { name: 'Kiểu dệt', value: 'Pique dệt tổ ong' }
    ],
    variants: [
      {
        id: 'var-4-1',
        productId: 'prod-4',
        sku: 'POLO-NVY-L',
        title: 'Xanh Navy / Size L',
        priceVnd: 320000,
        originalPriceVnd: 420000,
        quantity: 60,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Xanh Navy', 'Kích cỡ': 'L' }
      },
      {
        id: 'var-4-2',
        productId: 'prod-4',
        sku: 'POLO-WHT-M',
        title: 'Trắng Sữa / Size M',
        priceVnd: 320000,
        originalPriceVnd: 420000,
        quantity: 40,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Trắng', 'Kích cỡ': 'M' }
      }
    ],
    createdAt: '2026-03-05T11:00:00Z'
  },
  {
    id: 'prod-5',
    storeId: 'store-3',
    storeName: 'GreenLife Living',
    categoryId: 'cat-home',
    categoryName: 'Nhà Cửa & Đời Sống',
    name: 'Đèn Bàn Chống Cận Thị Thông Minh LED EyeShield 4.0',
    slug: 'den-ban-chong-can-led-eyeshield',
    shortDescription: 'Chỉ số hoàn màu Ra98 gần ánh sáng tự nhiên, cảm biến tự điều chỉnh độ sáng theo phòng.',
    description: 'Đèn bàn EyeShield đạt chứng nhận không phát ánh sáng xanh nguy hại (RG0), thanh chiếu sáng chữ T phủ quang phổ đều 120cm trên mặt bàn làm việc.',
    images: [
      'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'PUBLISHED',
    isAdminHidden: false,
    ratingAvg: 4.9,
    ratingCount: 19,
    salesCount: 88,
    attributes: [
      { name: 'Công suất', value: '18W LED' },
      { name: 'Nhiệt độ màu', value: '3000K - 6000K điều chỉnh vô cấp' }
    ],
    variants: [
      {
        id: 'var-5-1',
        productId: 'prod-5',
        sku: 'EYE4-WHT',
        title: 'Trắng Tinh Khôi',
        priceVnd: 780000,
        originalPriceVnd: 990000,
        quantity: 30,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Trắng' }
      }
    ],
    createdAt: '2026-03-10T16:00:00Z'
  },
  {
    id: 'prod-6',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    categoryId: 'cat-tech',
    categoryName: 'Điện Tử & Thiết Bị Số',
    name: 'Chuột Không Dây Ergonomic Silent Click ProGrip',
    slug: 'chuot-khong-day-ergonomic-progrip',
    shortDescription: 'Thiết kế công thái học góc nghiêng 57 độ, phím bấm êm không ồn 90%, pin sạc 500mAh.',
    description: 'Chuột quang ProGrip hỗ trợ kết nối Bluetooth 5.2 và đầu thu USB 2.4GHz. Độ phân giải cảm biến 4000 DPI mượt mà trên mọi bề mặt kể cả mặt kính.',
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
    ],
    saleStatus: 'DRAFT',
    isAdminHidden: false,
    ratingAvg: 0,
    ratingCount: 0,
    salesCount: 0,
    attributes: [
      { name: 'DPI', value: '1000 - 1600 - 2400 - 4000' },
      { name: 'Độ ồn phím', value: 'Dưới 20dB (Silent)' }
    ],
    variants: [
      {
        id: 'var-6-1',
        productId: 'prod-6',
        sku: 'MOU-GRY',
        title: 'Xám Titan',
        priceVnd: 380000,
        originalPriceVnd: 490000,
        quantity: 50,
        reservedQuantity: 0,
        attributes: { 'Màu sắc': 'Xám Titan' }
      }
    ],
    createdAt: '2026-03-20T09:00:00Z'
  }
];

export const SEED_VOUCHERS: Voucher[] = [
  {
    id: 'vch-plat-1',
    code: 'PBL6SUPER50',
    title: 'Giảm 50.000đ Toàn Sàn',
    scope: 'PLATFORM',
    discountType: 'FIXED',
    discountValue: 50000,
    minSpendVnd: 500000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 1000,
    usedCount: 142,
    isActive: true
  },
  {
    id: 'vch-plat-2',
    code: 'FREESHIP30',
    title: 'Miễn Phí Vận Chuyển 30.000đ',
    scope: 'PLATFORM',
    discountType: 'FIXED',
    discountValue: 30000,
    minSpendVnd: 300000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 2000,
    usedCount: 512,
    isActive: true
  },
  {
    id: 'vch-store-1',
    code: 'TECH100K',
    title: 'Giảm 100.000đ cho đơn TechHub',
    scope: 'STORE',
    storeId: 'store-1',
    discountType: 'FIXED',
    discountValue: 100000,
    minSpendVnd: 1000000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 200,
    usedCount: 45,
    isActive: true
  },
  {
    id: 'vch-store-2',
    code: 'FASHION20K',
    title: 'Giảm 20.000đ cho đơn Fashionistar',
    scope: 'STORE',
    storeId: 'store-2',
    discountType: 'FIXED',
    discountValue: 20000,
    minSpendVnd: 400000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 500,
    usedCount: 78,
    isActive: true
  }
];

export const SEED_CART: CartItem[] = [
  {
    id: 'cart-1',
    variantId: 'var-1-1',
    productId: 'prod-1',
    productName: 'Tai nghe Không Dây Chống Ồn ANC Pro X3',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    variantTitle: 'Màu Đen Nhám',
    sku: 'ANCX3-BLK',
    priceVnd: 1290000,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    availableStock: 43,
    selected: true
  },
  {
    id: 'cart-2',
    variantId: 'var-3-2',
    productId: 'prod-3',
    productName: 'Áo Khoác Bomber Minimalist WindBreaker',
    storeId: 'store-2',
    storeName: 'Fashionistar Studio',
    variantTitle: 'Đen Tuyển / Size L',
    sku: 'BOM-BLK-L',
    priceVnd: 490000,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
    availableStock: 33,
    selected: true
  }
];

export const SEED_ORDERS: Order[] = [
  {
    id: 'ord-101',
    purchaseGroupId: 'pg-demo-1001',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    customerId: 'user-cust-1',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    shippingAddress: '54 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
    paymentMethod: 'COD',
    paymentStatus: 'COD_PENDING',
    orderStatus: 'PROCESSING',
    subtotalVnd: 1450000,
    shippingFeeVnd: 30000,
    storeVoucherDiscountVnd: 100000,
    platformVoucherDiscountVnd: 30000,
    payableVnd: 1350000,
    appliedStoreVoucherCode: 'TECH100K',
    appliedPlatformVoucherCode: 'PBL6SUPER50',
    items: [
      {
        id: 'item-101-1',
        orderId: 'ord-101',
        productId: 'prod-2',
        variantId: 'var-2-1',
        sku: 'K8-RED-GRY',
        productName: 'Bàn phím cơ Không Dây RGB MechMaster K8',
        variantTitle: 'Red Switch / Xám Retro',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        unitPriceVnd: 1450000,
        quantity: 1,
        totalVnd: 1450000
      }
    ],
    createdAt: '2026-09-28T09:30:00Z',
    updatedAt: '2026-09-28T14:00:00Z'
  },
  {
    id: 'ord-102',
    purchaseGroupId: 'pg-demo-1001',
    storeId: 'store-2',
    storeName: 'Fashionistar Studio',
    customerId: 'user-cust-1',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    shippingAddress: '54 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
    paymentMethod: 'SANDBOX',
    paymentStatus: 'SUCCESS',
    orderStatus: 'COMPLETED',
    subtotalVnd: 490000,
    shippingFeeVnd: 25000,
    storeVoucherDiscountVnd: 20000,
    platformVoucherDiscountVnd: 20000,
    payableVnd: 475000,
    appliedStoreVoucherCode: 'FASHION20K',
    appliedPlatformVoucherCode: 'PBL6SUPER50',
    items: [
      {
        id: 'item-102-1',
        orderId: 'ord-102',
        productId: 'prod-3',
        variantId: 'var-3-1',
        sku: 'BOM-BLK-M',
        productName: 'Áo Khoác Bomber Minimalist WindBreaker',
        variantTitle: 'Đen Tuyển / Size M',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
        unitPriceVnd: 490000,
        quantity: 1,
        totalVnd: 490000,
        isReviewed: false
      }
    ],
    createdAt: '2026-09-28T09:30:00Z',
    updatedAt: '2026-09-29T08:15:00Z'
  },
  {
    id: 'ord-103',
    purchaseGroupId: 'pg-demo-1002',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    customerId: 'user-cust-1',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    shippingAddress: '54 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
    paymentMethod: 'SANDBOX',
    paymentStatus: 'AWAITING_PAYMENT',
    orderStatus: 'AWAITING_PAYMENT',
    subtotalVnd: 1290000,
    shippingFeeVnd: 30000,
    storeVoucherDiscountVnd: 0,
    platformVoucherDiscountVnd: 0,
    payableVnd: 1320000,
    expiresAt: new Date(Date.now() + 12 * 60 * 1000).toISOString(), // 12 mins left
    items: [
      {
        id: 'item-103-1',
        orderId: 'ord-103',
        productId: 'prod-1',
        variantId: 'var-1-1',
        sku: 'ANCX3-BLK',
        productName: 'Tai nghe Không Dây Chống Ồn ANC Pro X3',
        variantTitle: 'Màu Đen Nhám',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        unitPriceVnd: 1290000,
        quantity: 1,
        totalVnd: 1290000
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    orderItemId: 'item-legacy-1',
    productId: 'prod-1',
    userId: 'user-cust-2',
    userName: 'Hoàng Minh Quân',
    rating: 5,
    comment: 'Chống ồn ANC cực đỉnh luôn shop ơi! Đeo 3 tiếng trên xe khách mà không hề bị ù tai hay đau vành tai.',
    createdAt: '2026-09-20T10:15:00Z',
    isAdminHidden: false
  },
  {
    id: 'rev-2',
    orderItemId: 'item-legacy-2',
    productId: 'prod-1',
    userId: 'user-cust-3',
    userName: 'Trần Thảo Ly',
    rating: 4,
    comment: 'Âm thanh chi tiết, bass vừa đủ nghe podcast và acoustic rất hay. Shop đóng gói cẩn thận 2 lớp chống sốc.',
    createdAt: '2026-09-22T14:30:00Z',
    isAdminHidden: false
  },
  {
    id: 'rev-3',
    orderItemId: 'item-legacy-3',
    productId: 'prod-3',
    userId: 'user-cust-4',
    userName: 'Vũ Quốc Huy',
    rating: 5,
    comment: 'Áo bomber lên form chuẩn streetwear, chất vải trượt nước đi mưa phùn thoải mái. 10 điểm cho shop!',
    createdAt: '2026-09-25T16:00:00Z',
    isAdminHidden: false
  }
];

export const SEED_STORE_APPLICATIONS: StoreApplication[] = [
  {
    id: 'app-1',
    userId: 'user-cust-1',
    storeName: 'Tiệm Sách Sài Gòn Mới',
    description: 'Chuyên cung cấp sách công nghệ, lập trình, văn học kinh điển và dụng cụ học tập thông minh.',
    businessCode: '0401988772-001',
    status: 'PENDING',
    createdAt: '2026-09-28T16:40:00Z'
  },
  {
    id: 'app-2',
    userId: 'user-cust-2',
    storeName: 'Handmade Leather Vietnam',
    description: 'Ví da thủ công, dây đồng hồ da bò sáp và phụ kiện túi xách cao cấp.',
    businessCode: '0108765432-002',
    status: 'REJECTED',
    rejectionReason: 'Mã số kinh doanh chưa hợp lệ hoặc thiếu giấy phép kinh doanh phụ kiện thủ công.',
    createdAt: '2026-09-27T10:00:00Z'
  }
];

export const SEED_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    userId: 'user-owner-1',
    storeId: 'store-1',
    email: 'owner@techhub.vn',
    fullName: 'Trần Thị Bình',
    role: 'STORE_OWNER',
    isLocked: false,
    permissions: {
      canManageProduct: true,
      canManageInventory: true,
      canManageOrder: true,
      canCollectCod: true
    },
    joinedAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'staff-2',
    userId: 'user-seller-1',
    storeId: 'store-1',
    email: 'seller@techhub.vn',
    fullName: 'Lê Văn Cường',
    role: 'SELLER',
    isLocked: false,
    permissions: {
      canManageProduct: true,
      canManageInventory: true,
      canManageOrder: true,
      canCollectCod: true
    },
    joinedAt: '2026-02-01T09:00:00Z'
  }
];

export const SEED_STAFF_INVITATIONS: StaffInvitation[] = [
  {
    id: 'inv-1',
    storeId: 'store-1',
    storeName: 'TechHub Official Store',
    invitedEmail: 'customer@pbl6.vn',
    role: 'SELLER',
    permissions: {
      canManageProduct: true,
      canManageInventory: false,
      canManageOrder: true,
      canCollectCod: false
    },
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: '2026-09-28T11:00:00Z'
  }
];

export const SEED_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    variantId: 'var-1-1',
    sku: 'ANCX3-BLK',
    productName: 'Tai nghe Không Dây Chống Ồn ANC Pro X3',
    type: 'ADJUSTMENT',
    changeAmount: 50,
    previousQuantity: 0,
    newQuantity: 50,
    reason: 'Nhập kho lô hàng đầu kỳ tháng 9/2026',
    operatorId: 'user-owner-1',
    operatorName: 'Trần Thị Bình',
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'mov-2',
    variantId: 'var-1-1',
    sku: 'ANCX3-BLK',
    productName: 'Tai nghe Không Dây Chống Ồn ANC Pro X3',
    type: 'ORDER_CONSUMED',
    changeAmount: -5,
    previousQuantity: 50,
    newQuantity: 45,
    reason: 'Xuất kho cho các đơn hàng hoàn tất',
    operatorId: 'user-seller-1',
    operatorName: 'Lê Văn Cường',
    createdAt: '2026-09-25T11:30:00Z'
  }
];

export const SEED_MAILBOX: MailboxMessage[] = [
  {
    id: 'mail-1',
    toEmail: 'customer@pbl6.vn',
    subject: '[PBL6 Marketplace] Xác minh địa chỉ email tài khoản của bạn',
    type: 'VERIFY_EMAIL',
    data: {
      verificationLink: 'http://localhost:3000/#verify?token=verify_token_demo_987654321'
    },
    sentAt: '2026-09-28T09:00:00Z',
    isRead: false
  },
  {
    id: 'mail-2',
    toEmail: 'customer@pbl6.vn',
    subject: '[TechHub Official] Lời mời tham gia nhân viên vận hành Store (Seller)',
    type: 'STAFF_INVITATION',
    data: {
      invitationId: 'inv-1',
      storeName: 'TechHub Official Store'
    },
    sentAt: '2026-09-28T11:05:00Z',
    isRead: false
  },
  {
    id: 'mail-3',
    toEmail: 'customer@pbl6.vn',
    subject: '[PBL6 Marketplace] Mã OTP khôi phục mật khẩu tài khoản',
    type: 'RESET_PASSWORD',
    data: {
      resetToken: '839201'
    },
    sentAt: '2026-09-27T14:20:00Z',
    isRead: true
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    action: 'STORE_APPLICATION_REJECT',
    actorEmail: 'admin@pbl6.vn',
    actorRole: 'ADMIN',
    targetType: 'STORE_APPLICATION',
    targetId: 'app-2',
    reason: 'Mã số kinh doanh chưa hợp lệ hoặc thiếu giấy phép kinh doanh phụ kiện thủ công.',
    timestamp: '2026-09-27T10:05:00Z'
  },
  {
    id: 'aud-2',
    action: 'PRODUCT_STATUS_UPDATE',
    actorEmail: 'owner@techhub.vn',
    actorRole: 'STORE_OWNER',
    targetType: 'PRODUCT',
    targetId: 'prod-1',
    reason: 'Cập nhật giá ưu đãi chương trình Flash Sale',
    timestamp: '2026-09-28T08:30:00Z'
  }
];
