import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  ShoppingCart,
  Package,
  Sparkles,
  Mail,
  Store as StoreIcon,
  ShieldCheck,
  RefreshCw,
  User,
  Search,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAiChat: () => void;
  openMailbox: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openAiChat,
  openMailbox,
  searchQuery,
  setSearchQuery
}) => {
  const { currentUser, switchUserRole, cart, orders, mailbox, resetAllData } = useApp();

  const unreadMails = mailbox.filter(m => !m.isRead).length;
  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const awaitingOrders = orders.filter(
    o => o.customerId === currentUser.id && o.paymentStatus === 'AWAITING_PAYMENT'
  ).length;

  const roleLabelMap: Record<UserRole, { title: string; color: string }> = {
    CUSTOMER: { title: 'Khách hàng (Customer)', color: 'bg-blue-100 text-blue-800' },
    STORE_OWNER: { title: 'Chủ Gian Hàng (Store Owner)', color: 'bg-emerald-100 text-emerald-800' },
    SELLER: { title: 'Nhân viên Bán (Seller)', color: 'bg-amber-100 text-amber-800' },
    ADMIN: { title: 'Quản Trị Viên Sàn (Admin)', color: 'bg-purple-100 text-purple-800' },
    GUEST: { title: 'Khách Vãng Lai (Guest)', color: 'bg-gray-100 text-gray-800' }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Demo Bar for RBAC & Utilities */}
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PBL6 MARKETPLACE (2.1 DRAFT DEMO)
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Đang đóng vai:</span>
          <div className="relative inline-block">
            <select
              value={`${currentUser.activeRole}:${currentUser.storeId || ''}`}
              onChange={e => {
                const [role, storeId] = e.target.value.split(':');
                switchUserRole(role as UserRole, storeId || undefined);
              }}
              className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded border border-slate-700 cursor-pointer font-medium hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="CUSTOMER:">Customer (Nguyễn Văn An - customer@pbl6.vn)</option>
              <option value="STORE_OWNER:store-1">Store Owner (Trần Thị Bình - TechHub)</option>
              <option value="SELLER:store-1">Seller Nhân Viên (Lê Văn Cường - TechHub)</option>
              <option value="STORE_OWNER:store-2">Store Owner (Phạm Thị Dung - Fashionistar)</option>
              <option value="ADMIN:">Administrator (Quản trị sàn - admin@pbl6.vn)</option>
              <option value="GUEST:">Khách vãng lai (Guest - Chưa đăng nhập)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openMailbox}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-200 hover:text-white transition"
            title="Hộp thư demo (Mã OTP, email kích hoạt, lời mời nhân viên)"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Mock Mailbox</span>
            {unreadMails > 0 && (
              <span className="bg-amber-500 text-slate-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {unreadMails}
              </span>
            )}
          </button>

          <button
            onClick={resetAllData}
            className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
            title="Khôi phục toàn bộ dữ liệu mẫu ban đầu"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold shadow-md group-hover:scale-105 transition">
              P6
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">PBL6</span>
              <span className="text-emerald-600 font-bold text-lg">Market</span>
              <span className="text-[10px] block text-slate-400 font-mono -mt-1">MULTI-STORE PLATFORM</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, tai nghe, áo bomber, đèn..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-sm rounded-full border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Main Action Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                currentTab === 'home'
                  ? 'text-emerald-600 bg-emerald-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Khám phá
            </button>

            {/* Portal Navigation buttons based on user role */}
            {(currentUser.activeRole === 'SELLER' || currentUser.activeRole === 'STORE_OWNER') && (
              <button
                onClick={() => setCurrentTab('portal-store')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  currentTab === 'portal-store'
                    ? 'text-emerald-700 bg-emerald-100 font-semibold'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <StoreIcon className="w-4 h-4" />
                <span>Store Portal</span>
              </button>
            )}

            {currentUser.activeRole === 'ADMIN' && (
              <button
                onClick={() => setCurrentTab('portal-admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  currentTab === 'portal-admin'
                    ? 'text-purple-700 bg-purple-100 font-semibold'
                    : 'text-purple-600 hover:bg-purple-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* AI Assistant Button */}
            <button
              onClick={openAiChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm hover:shadow transition hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trợ lý AI</span>
            </button>

            {/* Orders link */}
            <button
              onClick={() => setCurrentTab('orders')}
              className={`relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition ${
                currentTab === 'orders' ? 'bg-slate-100 text-emerald-600' : ''
              }`}
              title="Đơn hàng của tôi"
            >
              <Package className="w-5 h-5" />
              {awaitingOrders > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {awaitingOrders}
                </span>
              )}
            </button>

            {/* Cart link */}
            <button
              onClick={() => setCurrentTab('cart')}
              className={`relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition ${
                currentTab === 'cart' ? 'bg-slate-100 text-emerald-600' : ''
              }`}
              title="Giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile Tag */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left text-xs">
                <p className="font-semibold text-slate-800 line-clamp-1">{currentUser.fullName}</p>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium ${
                    roleLabelMap[currentUser.activeRole].color
                  }`}
                >
                  {currentUser.activeRole}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
