import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
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
  AuditLog,
  Refund,
  OrderStatus,
  StoreStatus,
  ProductSaleStatus
} from '../types';
import {
  SEED_USERS,
  SEED_ADDRESSES,
  SEED_STORES,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_VOUCHERS,
  SEED_CART,
  SEED_ORDERS,
  SEED_REVIEWS,
  SEED_STORE_APPLICATIONS,
  SEED_STAFF_MEMBERS,
  SEED_STAFF_INVITATIONS,
  SEED_STOCK_MOVEMENTS,
  SEED_MAILBOX,
  SEED_AUDIT_LOGS
} from '../data/mockData';

interface StoreQuoteBreakdown {
  storeId: string;
  storeName: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  storeDiscountVnd: number;
  platformDiscountVnd: number;
  payableVnd: number;
  items: CartItem[];
}

interface QuoteResult {
  storeQuotes: Record<string, StoreQuoteBreakdown>;
  totalSubtotalVnd: number;
  totalShippingFeeVnd: number;
  totalStoreDiscountVnd: number;
  totalPlatformDiscountVnd: number;
  totalPayableVnd: number;
  appliedPlatformVoucher?: Voucher;
}

interface AppContextType {
  currentUser: User;
  switchUserRole: (role: UserRole, targetStoreId?: string) => void;
  addresses: Address[];
  currentStore?: Store;
  
  // Catalog
  products: Product[];
  categories: Category[];
  stores: Store[];
  updateProductSaleStatus: (productId: string, status: ProductSaleStatus) => void;
  toggleAdminHideProduct: (productId: string, reason: string) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (productId: string, variantId: string, quantity: number) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeCartItem: (cartItemId: string) => void;
  toggleCartSelection: (cartItemId: string) => void;
  toggleStoreCartSelection: (storeId: string, selected: boolean) => void;
  
  // Vouchers & Checkout
  vouchers: Voucher[];
  calculateQuote: (
    selectedCartItems: CartItem[],
    storeVoucherCodes: Record<string, string>,
    platformVoucherCode?: string
  ) => QuoteResult;
  confirmCheckout: (
    shippingAddress: string,
    paymentMethods: Record<string, 'SANDBOX' | 'COD'>,
    storeVoucherCodes: Record<string, string>,
    platformVoucherCode?: string
  ) => { purchaseGroupId: string; createdOrders: Order[] };
  
  // Payment Simulation
  simulatePaymentAttempt: (orderId: string, result: 'SUCCESS' | 'FAIL' | 'RECOVERING') => void;
  
  // Orders
  orders: Order[];
  refunds: Refund[];
  cancelOrder: (orderId: string, reason: string) => void;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  collectCodPayment: (orderId: string) => void;
  
  // Reviews
  reviews: Review[];
  addReview: (orderItemId: string, productId: string, rating: number, comment: string) => void;
  toggleAdminHideReview: (reviewId: string, reason: string) => void;
  
  // Store applications & Staff
  storeApplications: StoreApplication[];
  submitStoreApplication: (storeName: string, description: string, businessCode: string) => void;
  reviewStoreApplication: (appId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  staffMembers: StaffMember[];
  staffInvitations: StaffInvitation[];
  inviteStaff: (invitedEmail: string, permissions: { canManageProduct: boolean; canManageInventory: boolean; canManageOrder: boolean; canCollectCod: boolean }) => void;
  acceptStaffInvitation: (invitationId: string) => void;
  revokeStaffInvitation: (invitationId: string) => void;
  toggleStaffLock: (staffId: string) => void;
  
  // Inventory
  stockMovements: StockMovement[];
  adjustInventory: (variantId: string, changeAmount: number, reason: string) => void;
  
  // Admin & Audits
  users: User[];
  auditLogs: AuditLog[];
  toggleUserLock: (userId: string, reason: string) => void;
  toggleStoreStatus: (storeId: string, status: StoreStatus, reason: string) => void;
  
  // AI Chat
  aiMessages: { id: string; sender: 'user' | 'assistant'; text: string; products?: Product[]; time: string }[];
  sendAiMessage: (text: string) => void;
  
  // Mailbox
  mailbox: MailboxMessage[];
  markMailAsRead: (mailId: string) => void;
  
  // Reset
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage keys
  const loadStored = <T,>(key: string, defaultVal: T): T => {
    try {
      const item = localStorage.getItem(`pbl6_${key}`);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [users, setUsers] = useState<User[]>(() => loadStored('users', SEED_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() => users[0]);
  const [addresses] = useState<Address[]>(() => loadStored('addresses', SEED_ADDRESSES));
  const [stores, setStores] = useState<Store[]>(() => loadStored('stores', SEED_STORES));
  const [categories] = useState<Category[]>(() => loadStored('categories', SEED_CATEGORIES));
  const [products, setProducts] = useState<Product[]>(() => loadStored('products', SEED_PRODUCTS));
  const [cart, setCart] = useState<CartItem[]>(() => loadStored('cart', SEED_CART));
  const [vouchers] = useState<Voucher[]>(() => loadStored('vouchers', SEED_VOUCHERS));
  const [orders, setOrders] = useState<Order[]>(() => loadStored('orders', SEED_ORDERS));
  const [refunds, setRefunds] = useState<Refund[]>(() => loadStored('refunds', []));
  const [reviews, setReviews] = useState<Review[]>(() => loadStored('reviews', SEED_REVIEWS));
  const [storeApplications, setStoreApplications] = useState<StoreApplication[]>(() => loadStored('storeApplications', SEED_STORE_APPLICATIONS));
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => loadStored('staffMembers', SEED_STAFF_MEMBERS));
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitation[]>(() => loadStored('staffInvitations', SEED_STAFF_INVITATIONS));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadStored('stockMovements', SEED_STOCK_MOVEMENTS));
  const [mailbox, setMailbox] = useState<MailboxMessage[]>(() => loadStored('mailbox', SEED_MAILBOX));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStored('auditLogs', SEED_AUDIT_LOGS));

  // AI chat history
  const [aiMessages, setAiMessages] = useState<{ id: string; sender: 'user' | 'assistant'; text: string; products?: Product[]; time: string }[]>([
    {
      id: 'ai-welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là trợ lý mua sắm AI của PBL6 Marketplace. Tôi có thể giúp bạn tìm kiếm sản phẩm theo tiêu chí, so sánh thông số, kiểm tra tồn kho và gợi ý các ưu đãi tốt nhất.',
      products: [products[0], products[2]],
      time: '10:00'
    }
  ]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('pbl6_users', JSON.stringify(users));
    localStorage.setItem('pbl6_stores', JSON.stringify(stores));
    localStorage.setItem('pbl6_products', JSON.stringify(products));
    localStorage.setItem('pbl6_cart', JSON.stringify(cart));
    localStorage.setItem('pbl6_orders', JSON.stringify(orders));
    localStorage.setItem('pbl6_refunds', JSON.stringify(refunds));
    localStorage.setItem('pbl6_reviews', JSON.stringify(reviews));
    localStorage.setItem('pbl6_storeApplications', JSON.stringify(storeApplications));
    localStorage.setItem('pbl6_staffMembers', JSON.stringify(staffMembers));
    localStorage.setItem('pbl6_staffInvitations', JSON.stringify(staffInvitations));
    localStorage.setItem('pbl6_stockMovements', JSON.stringify(stockMovements));
    localStorage.setItem('pbl6_mailbox', JSON.stringify(mailbox));
    localStorage.setItem('pbl6_auditLogs', JSON.stringify(auditLogs));
  }, [users, stores, products, cart, orders, refunds, reviews, storeApplications, staffMembers, staffInvitations, stockMovements, mailbox, auditLogs]);

  // Switch role helper
  const switchUserRole = (role: UserRole, targetStoreId?: string) => {
    let matchedUser = users.find(u => u.activeRole === role);
    if (role === 'GUEST') {
      setCurrentUser({
        id: 'guest',
        email: 'guest@example.com',
        fullName: 'Khách vãng lai (Guest)',
        phone: '',
        isEmailVerified: false,
        isLocked: false,
        activeRole: 'GUEST'
      });
      return;
    }
    if (targetStoreId) {
      matchedUser = users.find(u => u.activeRole === role && u.storeId === targetStoreId) || matchedUser;
    }
    if (matchedUser) {
      setCurrentUser(matchedUser);
    }
  };

  const currentStore = stores.find(s => s.id === currentUser.storeId);

  // Cart operations
  const addToCart = (productId: string, variantId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) return;

    setCart(prev => {
      const existing = prev.find(item => item.variantId === variantId);
      if (existing) {
        return prev.map(item =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        storeId: product.storeId,
        storeName: product.storeName,
        variantTitle: variant.title,
        sku: variant.sku,
        priceVnd: variant.priceVnd,
        quantity,
        image: variant.image || product.images[0],
        availableStock: variant.quantity - variant.reservedQuantity,
        selected: true
      };
      return [...prev, newItem];
    });
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeCartItem(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const toggleCartSelection = (cartItemId: string) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, selected: !item.selected } : item));
  };

  const toggleStoreCartSelection = (storeId: string, selected: boolean) => {
    setCart(prev => prev.map(item => item.storeId === storeId ? { ...item, selected } : item));
  };

  // Quote & Voucher calculation (Strict rule: Store voucher applies first, then Platform voucher)
  const calculateQuote = (
    selectedCartItems: CartItem[],
    storeVoucherCodes: Record<string, string>,
    platformVoucherCode?: string
  ): QuoteResult => {
    // 1. Group items by store
    const storeGroups: Record<string, CartItem[]> = {};
    for (const item of selectedCartItems) {
      if (!storeGroups[item.storeId]) storeGroups[item.storeId] = [];
      storeGroups[item.storeId].push(item);
    }

    let totalSubtotalVnd = 0;
    let totalShippingFeeVnd = 0;
    let totalStoreDiscountVnd = 0;
    const storeQuotes: Record<string, StoreQuoteBreakdown> = {};

    // Calculate per store
    for (const storeId of Object.keys(storeGroups)) {
      const items = storeGroups[storeId];
      const store = stores.find(s => s.id === storeId);
      const shippingFee = store ? store.shippingFeeVnd : 0;
      const subtotal = items.reduce((acc, it) => acc + it.priceVnd * it.quantity, 0);

      // Store voucher
      let storeDiscount = 0;
      const appliedCode = storeVoucherCodes[storeId];
      if (appliedCode) {
        const v = vouchers.find(
          vc => vc.code === appliedCode && vc.scope === 'STORE' && vc.storeId === storeId && vc.isActive
        );
        if (v && subtotal >= v.minSpendVnd) {
          if (v.discountType === 'FIXED') {
            storeDiscount = Math.min(v.discountValue, subtotal);
          } else {
            const calculated = Math.round((subtotal * v.discountValue) / 100);
            storeDiscount = v.maxDiscountVnd ? Math.min(calculated, v.maxDiscountVnd) : calculated;
          }
        }
      }

      totalSubtotalVnd += subtotal;
      totalShippingFeeVnd += shippingFee;
      totalStoreDiscountVnd += storeDiscount;

      storeQuotes[storeId] = {
        storeId,
        storeName: store ? store.name : storeId,
        subtotalVnd: subtotal,
        shippingFeeVnd: shippingFee,
        storeDiscountVnd: storeDiscount,
        platformDiscountVnd: 0, // Calculated below
        payableVnd: subtotal + shippingFee - storeDiscount,
        items
      };
    }

    // 2. Platform Voucher (applies across eligible stores proportionally)
    let totalPlatformDiscountVnd = 0;
    let appliedPlatformVoucher: Voucher | undefined;
    if (platformVoucherCode) {
      const pv = vouchers.find(v => v.code === platformVoucherCode && v.scope === 'PLATFORM' && v.isActive);
      if (pv && totalSubtotalVnd >= pv.minSpendVnd) {
        appliedPlatformVoucher = pv;
        if (pv.discountType === 'FIXED') {
          totalPlatformDiscountVnd = Math.min(pv.discountValue, totalSubtotalVnd - totalStoreDiscountVnd);
        } else {
          const calculated = Math.round((totalSubtotalVnd * pv.discountValue) / 100);
          totalPlatformDiscountVnd = pv.maxDiscountVnd ? Math.min(calculated, pv.maxDiscountVnd) : calculated;
        }
      }
    }

    // Distribute platform discount across stores
    const storeCount = Object.keys(storeQuotes).length;
    if (storeCount > 0 && totalPlatformDiscountVnd > 0) {
      const storeIds = Object.keys(storeQuotes);
      let distributed = 0;
      storeIds.forEach((sid, index) => {
        const isLast = index === storeIds.length - 1;
        const quote = storeQuotes[sid];
        const storeShare = isLast
          ? totalPlatformDiscountVnd - distributed
          : Math.round((quote.subtotalVnd / totalSubtotalVnd) * totalPlatformDiscountVnd);
        
        distributed += storeShare;
        quote.platformDiscountVnd = storeShare;
        quote.payableVnd = Math.max(0, quote.subtotalVnd + quote.shippingFeeVnd - quote.storeDiscountVnd - storeShare);
      });
    }

    const totalPayableVnd = Object.values(storeQuotes).reduce((acc, q) => acc + q.payableVnd, 0);

    return {
      storeQuotes,
      totalSubtotalVnd,
      totalShippingFeeVnd,
      totalStoreDiscountVnd,
      totalPlatformDiscountVnd,
      totalPayableVnd,
      appliedPlatformVoucher
    };
  };

  // Confirm Checkout: creates 1 Order + 1 Payment per Store under 1 purchaseGroupId
  const confirmCheckout = (
    shippingAddress: string,
    paymentMethods: Record<string, 'SANDBOX' | 'COD'>,
    storeVoucherCodes: Record<string, string>,
    platformVoucherCode?: string
  ) => {
    const selectedItems = cart.filter(i => i.selected);
    const quote = calculateQuote(selectedItems, storeVoucherCodes, platformVoucherCode);
    const purchaseGroupId = `pg-${Date.now().toString().slice(-6)}`;
    const createdOrders: Order[] = [];

    for (const storeId of Object.keys(quote.storeQuotes)) {
      const sq = quote.storeQuotes[storeId];
      const method = paymentMethods[storeId] || 'SANDBOX';
      const orderId = `ord-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      
      const newOrder: Order = {
        id: orderId,
        purchaseGroupId,
        storeId,
        storeName: sq.storeName,
        customerId: currentUser.id,
        customerName: currentUser.fullName,
        customerPhone: currentUser.phone || '0901234567',
        shippingAddress,
        paymentMethod: method,
        paymentStatus: method === 'SANDBOX' ? 'AWAITING_PAYMENT' : 'COD_PENDING',
        orderStatus: method === 'SANDBOX' ? 'AWAITING_PAYMENT' : 'PENDING',
        subtotalVnd: sq.subtotalVnd,
        shippingFeeVnd: sq.shippingFeeVnd,
        storeVoucherDiscountVnd: sq.storeDiscountVnd,
        platformVoucherDiscountVnd: sq.platformDiscountVnd,
        payableVnd: sq.payableVnd,
        appliedStoreVoucherCode: storeVoucherCodes[storeId],
        appliedPlatformVoucherCode: platformVoucherCode,
        expiresAt: method === 'SANDBOX' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
        items: sq.items.map((it, idx) => ({
          id: `item-${orderId}-${idx + 1}`,
          orderId,
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          productName: it.productName,
          variantTitle: it.variantTitle,
          image: it.image,
          unitPriceVnd: it.priceVnd,
          quantity: it.quantity,
          totalVnd: it.priceVnd * it.quantity,
          isReviewed: false
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      createdOrders.push(newOrder);

      // Reserve or consume stock
      setProducts(prev =>
        prev.map(p => {
          if (p.storeId !== storeId) return p;
          return {
            ...p,
            variants: p.variants.map(v => {
              const matchedItem = sq.items.find(it => it.variantId === v.id);
              if (!matchedItem) return v;
              return {
                ...v,
                reservedQuantity: v.reservedQuantity + matchedItem.quantity
              };
            })
          };
        })
      );
    }

    setOrders(prev => [createdOrders[0], ...createdOrders.slice(1), ...prev]);
    // Remove selected items from cart
    setCart(prev => prev.filter(i => !i.selected));

    return { purchaseGroupId, createdOrders };
  };

  // Payment simulation (Sandbox gateway callback)
  const simulatePaymentAttempt = (orderId: string, result: 'SUCCESS' | 'FAIL' | 'RECOVERING') => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        if (result === 'SUCCESS') {
          return {
            ...ord,
            paymentStatus: 'SUCCESS',
            orderStatus: 'PENDING',
            updatedAt: new Date().toISOString()
          };
        }
        if (result === 'RECOVERING') {
          return {
            ...ord,
            paymentStatus: 'RECOVERING',
            updatedAt: new Date().toISOString()
          };
        }
        return {
          ...ord,
          paymentStatus: 'FAILED',
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Cancel order (Customer or Seller) & Mock Refund
  const cancelOrder = (orderId: string, reason: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        
        // If order was paid via SANDBOX, create Refund
        if (ord.paymentMethod === 'SANDBOX' && ord.paymentStatus === 'SUCCESS') {
          const refund: Refund = {
            id: `ref-${Date.now().toString().slice(-6)}`,
            orderId: ord.id,
            amountVnd: ord.payableVnd,
            reason: `Khách hủy đơn: ${reason}`,
            status: 'COMPLETED',
            createdAt: new Date().toISOString()
          };
          setRefunds(r => [refund, ...r]);
        }

        // Release reserved stock
        setProducts(currProducts =>
          currProducts.map(p => {
            if (p.storeId !== ord.storeId) return p;
            return {
              ...p,
              variants: p.variants.map(v => {
                const item = ord.items.find(it => it.variantId === v.id);
                if (!item) return v;
                return {
                  ...v,
                  reservedQuantity: Math.max(0, v.reservedQuantity - item.quantity)
                };
              })
            };
          })
        );

        return {
          ...ord,
          orderStatus: 'CANCELLED',
          cancelReason: reason,
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Update order status (Seller moves CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED)
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          orderStatus: newStatus,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Collect COD payment (Seller sets COD_PENDING -> SUCCESS and marks COMPLETED)
  const collectCodPayment = (orderId: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          paymentStatus: 'SUCCESS',
          orderStatus: 'COMPLETED',
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Reviews
  const addReview = (orderItemId: string, productId: string, rating: number, comment: string) => {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      orderItemId,
      productId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      isAdminHidden: false
    };

    setReviews(prev => [newReview, ...prev]);

    // Mark item reviewed in order
    setOrders(prev =>
      prev.map(o => ({
        ...o,
        items: o.items.map(it => (it.id === orderItemId ? { ...it, isReviewed: true } : it))
      }))
    );
  };

  const toggleAdminHideReview = (reviewId: string, reason: string) => {
    setReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, isAdminHidden: !r.isAdminHidden, adminHiddenReason: reason } : r))
    );
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}`,
        action: 'REVIEW_MODERATE',
        actorEmail: currentUser.email,
        actorRole: currentUser.activeRole,
        targetType: 'REVIEW',
        targetId: reviewId,
        reason,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // Catalog seller & admin
  const updateProductSaleStatus = (productId: string, status: ProductSaleStatus) => {
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, saleStatus: status } : p)));
  };

  const toggleAdminHideProduct = (productId: string, reason: string) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, isAdminHidden: !p.isAdminHidden, adminHiddenReason: reason }
          : p
      )
    );
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}`,
        action: 'PRODUCT_MODERATE',
        actorEmail: currentUser.email,
        actorRole: currentUser.activeRole,
        targetType: 'PRODUCT',
        targetId: productId,
        reason,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // Inventory adjustment
  const adjustInventory = (variantId: string, changeAmount: number, reason: string) => {
    setProducts(prev =>
      prev.map(p => ({
        ...p,
        variants: p.variants.map(v => {
          if (v.id !== variantId) return v;
          const oldQty = v.quantity;
          const newQty = Math.max(0, oldQty + changeAmount);

          // Log stock movement
          const mov: StockMovement = {
            id: `mov-${Date.now()}`,
            variantId: v.id,
            sku: v.sku,
            productName: p.name,
            type: 'ADJUSTMENT',
            changeAmount,
            previousQuantity: oldQty,
            newQuantity: newQty,
            reason,
            operatorId: currentUser.id,
            operatorName: currentUser.fullName,
            createdAt: new Date().toISOString()
          };
          setStockMovements(m => [mov, ...m]);

          return { ...v, quantity: newQty };
        })
      }))
    );
  };

  // Store applications
  const submitStoreApplication = (storeName: string, description: string, businessCode: string) => {
    const newApp: StoreApplication = {
      id: `app-${Date.now().toString().slice(-4)}`,
      userId: currentUser.id,
      storeName,
      description,
      businessCode,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    setStoreApplications(prev => [newApp, ...prev]);
  };

  const reviewStoreApplication = (appId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setStoreApplications(prev =>
      prev.map(a => (a.id === appId ? { ...a, status, rejectionReason: reason } : a))
    );
    if (status === 'APPROVED') {
      const app = storeApplications.find(a => a.id === appId);
      if (app) {
        const newStore: Store = {
          id: `store-${Date.now().toString().slice(-4)}`,
          name: app.storeName,
          slug: app.storeName.toLowerCase().replace(/\s+/g, '-'),
          description: app.description,
          logo: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=150&auto=format&fit=crop&q=80',
          banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
          ownerId: app.userId,
          status: 'ACTIVE',
          shippingFeeVnd: 25000,
          ratingAvg: 5.0,
          totalReviews: 0,
          createdAt: new Date().toISOString()
        };
        setStores(s => [...s, newStore]);
      }
    }
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}`,
        action: `STORE_APP_${status}`,
        actorEmail: currentUser.email,
        actorRole: currentUser.activeRole,
        targetType: 'STORE_APPLICATION',
        targetId: appId,
        reason: reason || 'Phê duyệt từ Admin',
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // Staff management
  const inviteStaff = (
    invitedEmail: string,
    permissions: { canManageProduct: boolean; canManageInventory: boolean; canManageOrder: boolean; canCollectCod: boolean }
  ) => {
    if (!currentUser.storeId) return;
    const currentStoreObj = stores.find(s => s.id === currentUser.storeId);
    const newInv: StaffInvitation = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      storeId: currentUser.storeId,
      storeName: currentStoreObj?.name || 'Store',
      invitedEmail,
      role: 'SELLER',
      permissions,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString()
    };
    setStaffInvitations(prev => [newInv, ...prev]);

    // Send mock email
    const mail: MailboxMessage = {
      id: `mail-${Date.now()}`,
      toEmail: invitedEmail,
      subject: `[${currentStoreObj?.name}] Lời mời gia nhập đội ngũ vận hành gian hàng`,
      type: 'STAFF_INVITATION',
      data: {
        invitationId: newInv.id,
        storeName: currentStoreObj?.name
      },
      sentAt: new Date().toISOString(),
      isRead: false
    };
    setMailbox(m => [mail, ...m]);
  };

  const acceptStaffInvitation = (invitationId: string) => {
    const inv = staffInvitations.find(i => i.id === invitationId);
    if (!inv) return;
    setStaffInvitations(prev => prev.map(i => (i.id === invitationId ? { ...i, status: 'ACCEPTED' } : i)));

    const newMember: StaffMember = {
      id: `staff-${Date.now().toString().slice(-4)}`,
      userId: currentUser.id,
      storeId: inv.storeId,
      email: currentUser.email,
      fullName: currentUser.fullName,
      role: 'SELLER',
      isLocked: false,
      permissions: inv.permissions,
      joinedAt: new Date().toISOString()
    };
    setStaffMembers(prev => [...prev, newMember]);
  };

  const revokeStaffInvitation = (invitationId: string) => {
    setStaffInvitations(prev => prev.map(i => (i.id === invitationId ? { ...i, status: 'REVOKED' } : i)));
  };

  const toggleStaffLock = (staffId: string) => {
    setStaffMembers(prev => prev.map(s => (s.id === staffId ? { ...s, isLocked: !s.isLocked } : s)));
  };

  // User & Store lock by admin
  const toggleUserLock = (userId: string, reason: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isLocked: !u.isLocked } : u)));
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}`,
        action: 'USER_LOCK_TOGGLE',
        actorEmail: currentUser.email,
        actorRole: currentUser.activeRole,
        targetType: 'USER',
        targetId: userId,
        reason,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  const toggleStoreStatus = (storeId: string, status: StoreStatus, reason: string) => {
    setStores(prev => prev.map(s => (s.id === storeId ? { ...s, status } : s)));
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}`,
        action: 'STORE_STATUS_UPDATE',
        actorEmail: currentUser.email,
        actorRole: currentUser.activeRole,
        targetType: 'STORE',
        targetId: storeId,
        reason,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // AI Chatbot with Grounding
  const sendAiMessage = (text: string) => {
    const userMsg = {
      id: `ai-${Date.now()}`,
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAiMessages(prev => [...prev, userMsg]);

    // Simple RAG simulation against catalog
    setTimeout(() => {
      const lower = text.toLowerCase();
      let matched = products.filter(
        p =>
          !p.isAdminHidden &&
          p.saleStatus === 'PUBLISHED' &&
          (p.name.toLowerCase().includes(lower) ||
            p.shortDescription.toLowerCase().includes(lower) ||
            p.categoryName.toLowerCase().includes(lower) ||
            lower.includes('tai nghe') && p.slug.includes('tai-nghe') ||
            lower.includes('áo') && p.slug.includes('ao') ||
            lower.includes('bàn phím') && p.slug.includes('ban-phim') ||
            lower.includes('đèn') && p.slug.includes('den') ||
            lower.includes('chuột') && p.slug.includes('chuot'))
      );

      if (matched.length === 0) {
        matched = products.filter(p => !p.isAdminHidden && p.saleStatus === 'PUBLISHED').slice(0, 2);
      }

      let responseText = `Tôi đã tra cứu danh mục sản phẩm hiện có và tìm thấy các gợi ý phù hợp nhất với yêu cầu "${text}" của bạn:`;
      if (lower.includes('giá') || lower.includes('bao nhiêu')) {
        responseText = `Dưới đây là thông tin giá và các biến thể chính hãng đang có sẵn trong kho:`;
      } else if (lower.includes('voucher') || lower.includes('khuyến mãi') || lower.includes('giảm giá')) {
        responseText = `Hiện sàn đang có mã PBL6SUPER50 (giảm 50.000đ cho đơn từ 500K) và mã FREESHIP30! Ngoài ra TechHub có mã TECH100K giảm 100K.`;
      }

      const botMsg = {
        id: `ai-${Date.now() + 1}`,
        sender: 'assistant' as const,
        text: responseText,
        products: matched,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const markMailAsRead = (mailId: string) => {
    setMailbox(prev => prev.map(m => (m.id === mailId ? { ...m, isRead: true } : m)));
  };

  const resetAllData = () => {
    localStorage.clear();
    setUsers(SEED_USERS);
    setCurrentUser(SEED_USERS[0]);
    setStores(SEED_STORES);
    setProducts(SEED_PRODUCTS);
    setCart(SEED_CART);
    setOrders(SEED_ORDERS);
    setRefunds([]);
    setReviews(SEED_REVIEWS);
    setStoreApplications(SEED_STORE_APPLICATIONS);
    setStaffMembers(SEED_STAFF_MEMBERS);
    setStaffInvitations(SEED_STAFF_INVITATIONS);
    setStockMovements(SEED_STOCK_MOVEMENTS);
    setMailbox(SEED_MAILBOX);
    setAuditLogs(SEED_AUDIT_LOGS);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchUserRole,
        addresses,
        currentStore,
        products,
        categories,
        stores,
        updateProductSaleStatus,
        toggleAdminHideProduct,
        cart,
        addToCart,
        updateCartQuantity,
        removeCartItem,
        toggleCartSelection,
        toggleStoreCartSelection,
        vouchers,
        calculateQuote,
        confirmCheckout,
        simulatePaymentAttempt,
        orders,
        refunds,
        cancelOrder,
        updateOrderStatus,
        collectCodPayment,
        reviews,
        addReview,
        toggleAdminHideReview,
        storeApplications,
        submitStoreApplication,
        reviewStoreApplication,
        staffMembers,
        staffInvitations,
        inviteStaff,
        acceptStaffInvitation,
        revokeStaffInvitation,
        toggleStaffLock,
        stockMovements,
        adjustInventory,
        users,
        auditLogs,
        toggleUserLock,
        toggleStoreStatus,
        aiMessages,
        sendAiMessage,
        mailbox,
        markMailAsRead,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
