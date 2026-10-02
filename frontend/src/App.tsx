import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { ProductCard } from './components/customer/ProductCard';
import { ProductDetailModal } from './components/customer/ProductDetailModal';
import { CartView } from './components/customer/CartView';
import { CheckoutView } from './components/customer/CheckoutView';
import { OrdersView } from './components/customer/OrdersView';
import { PaymentSandboxModal } from './components/customer/PaymentSandboxModal';
import { ReviewModal } from './components/customer/ReviewModal';
import { StoreApplyModal } from './components/customer/StoreApplyModal';
import { InvitationsModal } from './components/customer/InvitationsModal';
import { MailboxModal } from './components/MailboxModal';
import { AiChatDrawer } from './components/customer/AiChatDrawer';
import { SellerPortal } from './components/portal/SellerPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { Product, Order, OrderItem } from './types';
import {
  Sparkles,
  Store,
  Tag,
  ShieldCheck,
  TrendingUp,
  Heart,
  ChevronRight,
  UserPlus
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    products,
    categories,
    stores,
    currentUser,
    staffInvitations
  } = useApp();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [reviewingItem, setReviewingItem] = useState<{ item: OrderItem; order: Order } | null>(null);
  const [storeApplyModalOpen, setStoreApplyModalOpen] = useState<boolean>(false);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState<boolean>(false);
  const [mailboxModalOpen, setMailboxModalOpen] = useState<boolean>(false);
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);

  // Invitations count for current user
  const myPendingInvitations = staffInvitations.filter(
    i => i.invitedEmail === currentUser.email && i.status === 'PENDING'
  ).length;

  // Filter public products for customer
  const publicProducts = products.filter(p => {
    // Only published and not admin hidden
    if (p.saleStatus !== 'PUBLISHED' || p.isAdminHidden) return false;
    // Category filter
    if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.shortDescription.toLowerCase().includes(q);
      const matchStore = p.storeName.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchStore) return false;
    }
    return true;
  });

  // Recommended products (C10 "Dành cho bạn")
  const recommendedProducts = publicProducts.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAiChat={() => setAiChatOpen(true)}
        openMailbox={() => setMailboxModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Invitations Alert Banner if user has pending invitations */}
      {myPendingInvitations > 0 && currentTab !== 'portal-store' && currentTab !== 'portal-admin' && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <UserPlus className="w-4 h-4 text-blue-200" />
              <span>Bạn có {myPendingInvitations} lời mời tham gia nhân viên vận hành gian hàng (Seller)!</span>
            </span>
            <button
              onClick={() => setInvitationsModalOpen(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg font-bold text-xs transition"
            >
              Xem lời mời ngay
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-8 md:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-sm border border-emerald-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nền tảng Thương mại Điện tử Đa Gian Hàng PBL6</span>
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Mua sắm đa Store, <br />
                  <span className="text-emerald-400">Thanh toán linh hoạt từng đơn</span>
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Trải nghiệm giỏ hàng thông minh gom sản phẩm từ nhiều Store, áp dụng voucher Store + sàn cộng dồn, và chủ động chọn trả Sandbox hoặc COD cho từng gian hàng.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setAiChatOpen(true)}
                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Hỏi Trợ Lý AI Gợi Ý</span>
                  </button>

                  <button
                    onClick={() => setStoreApplyModalOpen(true)}
                    className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-emerald-300" />
                    <span>Đăng ký Mở Gian Hàng (C09)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <span>Danh mục Ngành hàng</span>
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ngành hàng
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat.name} ({cat.itemCount})
                  </button>
                ))}
              </div>
            </div>

            {/* AI Recommendation: Dành cho bạn (C10) */}
            {recommendedProducts.length > 0 && selectedCategory === 'ALL' && !searchQuery && (
              <div className="space-y-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-6 rounded-3xl border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" />
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Dành Riêng Cho Bạn (AI Recommended)</h3>
                      <p className="text-xs text-slate-500">Mô hình gợi ý hành vi & cá nhân hóa grounded từ M4 AI</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {recommendedProducts.map(prod => (
                    <ProductCard
                      key={`rec-${prod.id}`}
                      product={prod}
                      onSelect={p => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Main Product Catalog Grid (C01) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Khám phá Sản phẩm</h2>
                  <p className="text-xs text-slate-500">
                    {publicProducts.length} sản phẩm chính hãng đang hiển thị trên sàn
                  </p>
                </div>
              </div>

              {publicProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <p className="font-semibold text-sm">Không tìm thấy sản phẩm nào khớp với tìm kiếm.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {publicProducts.map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={p => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'cart' && (
          <CartView
            onProceedToCheckout={() => setCurrentTab('checkout')}
            onContinueShopping={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutView
            onBackToCart={() => setCurrentTab('cart')}
            onCheckoutSuccess={() => {
              setCurrentTab('orders');
              alert('Đặt hàng thành công! Đã tạo các Order riêng cho từng Store.');
            }}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView
            onPayOrder={order => setPayingOrder(order)}
            onReviewItem={(item, order) => setReviewingItem({ item, order })}
          />
        )}

        {currentTab === 'portal-store' && <SellerPortal />}

        {currentTab === 'portal-admin' && <AdminPortal />}
      </main>

      {/* Floating AI Chat Launcher if drawer closed */}
      {!aiChatOpen && (
        <button
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition flex items-center gap-2 group cursor-pointer"
          title="Mở Trợ lý AI"
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span className="hidden group-hover:inline text-xs font-bold pr-1">Hỏi Trợ Lý AI</span>
        </button>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-600 text-base">PBL6 MARKETPLACE</span>
            <span>—</span>
            <span>Thiết kế hệ thống 2.1 Draft & OpenAPI Contract Full Simulation</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setStoreApplyModalOpen(true)}
              className="hover:text-emerald-600 transition"
            >
              Đăng ký mở Store
            </button>
            <button
              onClick={() => setMailboxModalOpen(true)}
              className="hover:text-emerald-600 transition"
            >
              Hộp thư Demo (Mock Mailbox)
            </button>
            <button
              onClick={() => setInvitationsModalOpen(true)}
              className="hover:text-emerald-600 transition"
            >
              Lời mời nhân viên
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onProceedToCart={() => {
          setSelectedProduct(null);
          setCurrentTab('cart');
        }}
      />

      <PaymentSandboxModal
        order={payingOrder}
        onClose={() => setPayingOrder(null)}
      />

      <ReviewModal
        item={reviewingItem?.item || null}
        order={reviewingItem?.order || null}
        onClose={() => setReviewingItem(null)}
      />

      <StoreApplyModal
        isOpen={storeApplyModalOpen}
        onClose={() => setStoreApplyModalOpen(false)}
      />

      <InvitationsModal
        isOpen={invitationsModalOpen}
        onClose={() => setInvitationsModalOpen(false)}
      />

      <MailboxModal
        isOpen={mailboxModalOpen}
        onClose={() => setMailboxModalOpen(false)}
        onOpenInvitations={() => setInvitationsModalOpen(true)}
      />

      <AiChatDrawer
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onSelectProduct={p => {
          setSelectedProduct(p);
        }}
      />
    </div>
  );
};
