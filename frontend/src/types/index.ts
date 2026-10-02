export type UserRole = 'GUEST' | 'CUSTOMER' | 'SELLER' | 'STORE_OWNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  isEmailVerified: boolean;
  isLocked: boolean;
  activeRole: UserRole;
  storeId?: string; // If Seller or Owner
}

export interface Address {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  isDefault: boolean;
}

export type StoreStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED';

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  ownerId: string;
  status: StoreStatus;
  shippingFeeVnd: number;
  ratingAvg: number;
  totalReviews: number;
  createdAt: string;
}

export type StoreAppStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StoreApplication {
  id: string;
  userId: string;
  storeName: string;
  description: string;
  businessCode: string;
  status: StoreAppStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface StaffPermission {
  canManageProduct: boolean;
  canManageInventory: boolean;
  canManageOrder: boolean;
  canCollectCod: boolean;
}

export interface StaffMember {
  id: string;
  userId: string;
  storeId: string;
  email: string;
  fullName: string;
  role: 'STORE_OWNER' | 'SELLER';
  isLocked: boolean;
  permissions: StaffPermission;
  joinedAt: string;
}

export interface StaffInvitation {
  id: string;
  storeId: string;
  storeName: string;
  invitedEmail: string;
  role: 'SELLER';
  permissions: StaffPermission;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  itemCount: number;
}

export type ProductSaleStatus = 'DRAFT' | 'PUBLISHED' | 'STOPPED';

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string; // e.g. "Đen / 256GB"
  priceVnd: number;
  originalPriceVnd: number;
  quantity: number;
  reservedQuantity: number; // For pending checkout orders
  attributes: Record<string, string>;
  image?: string;
}

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  images: string[];
  saleStatus: ProductSaleStatus;
  isAdminHidden: boolean;
  adminHiddenReason?: string;
  variants: ProductVariant[];
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  attributes: { name: string; value: string }[];
  createdAt: string;
}

export interface StockMovement {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  type: 'ADJUSTMENT' | 'CHECKOUT_RESERVE' | 'ORDER_CONSUMED' | 'ORDER_RELEASED';
  changeAmount: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  variantTitle: string;
  sku: string;
  priceVnd: number;
  quantity: number;
  image: string;
  availableStock: number;
  selected: boolean;
}

export type VoucherScope = 'PLATFORM' | 'STORE';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  scope: VoucherScope;
  storeId?: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 10 (%) or 50000 (VND)
  minSpendVnd: number;
  maxDiscountVnd?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export type PaymentMethod = 'SANDBOX' | 'COD';
export type PaymentStatus = 'AWAITING_PAYMENT' | 'PENDING' | 'RECOVERING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'COD_PENDING';
export type OrderStatus = 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantTitle: string;
  image: string;
  unitPriceVnd: number;
  quantity: number;
  totalVnd: number;
  isReviewed?: boolean;
}

export interface Order {
  id: string;
  purchaseGroupId: string; // Groups multi-store orders from same checkout
  storeId: string;
  storeName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  items: OrderItem[];
  subtotalVnd: number;
  shippingFeeVnd: number;
  storeVoucherDiscountVnd: number;
  platformVoucherDiscountVnd: number;
  payableVnd: number;
  appliedStoreVoucherCode?: string;
  appliedPlatformVoucherCode?: string;
  cancelReason?: string;
  cancelledAt?: string;
  expiresAt?: string; // For Sandbox awaiting payment (15m)
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  orderId: string;
  amountVnd: number;
  reason: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface Review {
  id: string;
  orderItemId: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  isAdminHidden: boolean;
  adminHiddenReason?: string;
}

export interface MailboxMessage {
  id: string;
  toEmail: string;
  subject: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'STAFF_INVITATION';
  data: {
    verificationLink?: string;
    resetToken?: string;
    invitationId?: string;
    storeName?: string;
  };
  sentAt: string;
  isRead: boolean;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  groundedProducts?: Product[];
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: UserRole;
  targetType: string;
  targetId: string;
  reason: string;
  timestamp: string;
}
