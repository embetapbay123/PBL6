import { FormEvent, useMemo, useState, useRef } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useRoutes,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Store,
  ShieldCheck,
  User,
  Search,
  Menu,
  X,
  Settings,
  LayoutDashboard,
  Boxes,
  Ticket,
  Users,
  BarChart3,
} from "lucide-react";
import { AuthProvider, useAuth } from "../api/auth-context";
import { api } from "../api/client";
import { dataMode } from "../api/operations";
import { customerRoutes } from "../features/customer/routes";
import { sellerRoutes } from "../features/seller/routes";
import { adminRoutes } from "../features/admin/routes";
import { AuthPage } from "../features/customer/auth/AuthPage";
import { CustomerChatWidget } from "../features/customer/CustomerChatWidget";
import { ErrorView, Loading } from "../bootstrap/components";
import "../bootstrap/bootstrap.css";
import "./live.css";

function ScopedQueries() {
  const { session } = useAuth();
  const context = session?.context;
  const scope = JSON.stringify([
    context?.user_id ?? "guest",
    context?.roles,
    context?.role_permissions,
    context?.store_membership,
    context?.token_version,
  ]);
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 10000 } },
      }),
    [scope],
  );
  return (
    <QueryClientProvider client={client}>
      <Market key={scope} />
    </QueryClientProvider>
  );
}
function Profile() {
  const { session } = useAuth();
  const { data, error, isLoading } = useQuery({
    queryKey: ["profile", session?.context?.user_id],
    queryFn: api.profile,
    enabled: !!session,
  });
  return (
    <section className="boot-card">
      <h1>Hồ sơ</h1>
      {!session ? (
        <p>Đăng nhập để xem hồ sơ.</p>
      ) : isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} />
      ) : (
        <>
          <h2>{data?.display_name}</h2>
          <p>{data?.email}</p>
          <p>{data?.phone}</p>
          {session?.context?.roles.includes("CUSTOMER") && (
            <Link to="/customer/profile">Cập nhật thông tin tài khoản</Link>
          )}
          <Link to="/change-password">Đổi mật khẩu</Link>
        </>
      )}
    </section>
  );
}
function ApplicationRoutes() {
  return useRoutes([
    ...[
      "/login",
      "/auth",
      "/register",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
      "/change-password",
    ].map((path) => ({ path, element: <AuthPage /> })),
    { path: "/profile", element: <Profile /> },
    ...customerRoutes,
    ...sellerRoutes,
    ...adminRoutes,
    {
      path: "*",
      element: (
        <section className="boot-card">
          <h1>Không tìm thấy trang</h1>
          <Link to="/">Tiếp tục khám phá sản phẩm</Link>
        </section>
      ),
    },
  ]);
}
const merchantLinks = [
  ["/seller", "Tổng quan", LayoutDashboard],
  ["/seller/products", "Sản phẩm Store", ShoppingBag],
  ["/seller/inventory", "Tồn kho", Boxes],
  ["/seller/orders", "Đơn hàng Store", Package],
  ["/seller/vouchers", "Voucher Store", Ticket],
  ["/seller/staff", "Nhân viên & lời mời", Users],
  ["/seller/settings", "Thông tin gian hàng", Settings],
  ["/seller/reports", "Báo cáo", BarChart3],
] as const;
function Market() {
  const { session } = useAuth(),
    location = useLocation(),
    navigate = useNavigate();
  const roles = session?.context?.roles ?? [],
    membership = session?.context?.store_membership;
  const admin = roles.includes("ADMIN"),
    merchant = roles.some((r) => r === "STORE_OWNER" || r === "SELLER"),
    owner = membership?.role === "OWNER";
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState("");
  const isComposingRef = useRef(false);
  const portal = location.pathname.startsWith("/seller")
    ? "seller"
    : location.pathname.startsWith("/admin")
      ? "admin"
      : undefined;
  const role = admin
    ? "Quản trị viên"
    : owner
      ? "Chủ gian hàng"
      : merchant
        ? "Nhân viên Store"
        : session
          ? "Khách hàng"
          : "Khách vãng lai";
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate("/?q=" + encodeURIComponent(search.trim()));
  };
  const can = (code: string) =>
    owner || !!membership?.permissions?.includes(code);
  return (
    <div className="live-market min-h-screen bg-slate-50 text-slate-900">
      <header className="market-header sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="bg-slate-900 text-slate-200 text-xs">
          <div className="market-width flex items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              PBL6 MARKETPLACE
            </span>
            <span>{role}</span>
          </div>
        </div>
        <div className="market-width flex items-center justify-between gap-4 py-4">
          <Link
            to="/"
            aria-label="Trang chủ PBL6"
            className="flex items-center gap-2 shrink-0"
          >
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 grid place-items-center text-white font-extrabold shadow">
              P6
            </span>
            <span className="leading-tight">
              <strong className="text-lg">
                PBL6<span className="text-emerald-600">Market</span>
              </strong>
              <small className="block text-[10px] tracking-widest text-slate-400">
                MULTI-STORE PLATFORM
              </small>
            </span>
          </Link>
          {location.pathname !== "/" && (
            <form
              onSubmit={submitSearch}
              className="hidden md:flex flex-1 max-w-lg relative"
            >
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                aria-label="Tìm kiếm toàn sàn"
                className="w-full rounded-full bg-slate-100 border border-transparent pl-10 pr-9 py-2 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="Bạn đang tìm sản phẩm gì?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposingRef.current) {
                    submitSearch(e);
                  }
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 rounded-full"
                  title="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
            </form>
          )}
          <div className="flex items-center gap-2">
            <Link to="/cart" aria-label="Giỏ hàng" className="market-icon-link">
              <ShoppingCart size={20} />
              <span className="hidden sm:inline">Giỏ hàng</span>
            </Link>
            <Link
              to="/login"
              data-testid="account-link"
              aria-label={session ? "Tài khoản" : "Đăng nhập"}
              className="market-account"
            >
              <User size={17} />
              <span className="hidden sm:inline">
                {session ? "Tài khoản" : "Đăng nhập"}
              </span>
            </Link>
            <button
              className="md:hidden market-icon-link"
              aria-label={mobile ? "Đóng menu" : "Mở menu"}
              onClick={() => setMobile((v) => !v)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav
          aria-label="Điều hướng chính"
          className={
            "market-width market-navigation " + (mobile ? "mobile-open" : "")
          }
          onClick={() => setMobile(false)}
        >
          <NavLink end to="/">
            Sản phẩm
          </NavLink>
          <NavLink to="/customer/orders">Đơn hàng của tôi</NavLink>
          <NavLink to="/profile">Hồ sơ</NavLink>
          <NavLink to="/customer/settings">Cài đặt & quyền riêng tư</NavLink>
          {merchant && (
            <NavLink to="/seller">
              <Store size={15} />
              Store Portal
            </NavLink>
          )}
          {admin && (
            <NavLink to="/admin">
              <ShieldCheck size={15} />
              Admin Portal
            </NavLink>
          )}
        </nav>
      </header>
      <div
        className={
          "market-width market-body " + (portal ? "market-portal" : "")
        }
      >
        {portal === "seller" && merchant && (
          <aside className="market-sidebar" aria-label="Menu Store">
            <p className="text-xs font-bold tracking-widest text-slate-400 mb-5">
              QUẢN LÝ GIAN HÀNG
            </p>
            {merchantLinks
              .filter(([path]) =>
                path.includes("staff") ||
                path.includes("settings") ||
                path.includes("reports") ||
                path.includes("vouchers")
                  ? owner
                  : path.includes("inventory")
                    ? can("inventory.store.read_adjust")
                    : path.includes("orders")
                      ? can("order.store.read_status_cancel")
                      : true,
              )
              .map(([to, label, Icon]) => (
                <NavLink key={to} end to={to}>
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
          </aside>
        )}
        {portal === "admin" && admin && (
          <aside className="market-sidebar" aria-label="Menu quản trị">
            <p className="text-xs font-bold tracking-widest text-slate-400 mb-5">
              QUẢN TRỊ NỀN TẢNG
            </p>
            {[
              ["dashboard", "Tổng quan"],
              ["users", "Tài khoản"],
              ["stores", "Gian hàng"],
              ["roles", "Phân quyền"],
              ["catalog", "Danh mục & kiểm duyệt"],
              ["orders", "Đơn hàng toàn sàn"],
              ["vouchers", "Ưu đãi toàn sàn"],
              ["ai", "Vận hành AI"],
            ].map(([tab, label]) => (
              <Link
                key={tab}
                to={"/admin?tab=" + tab}
                className={location.search === "?tab=" + tab ? "active" : ""}
              >
                <LayoutDashboard size={16} />
                {label}
              </Link>
            ))}
            <NavLink to="/admin/store-applications">
              <Store size={16} />
              Hồ sơ mở gian hàng
            </NavLink>
          </aside>
        )}
        <main className="live-content min-w-0">
          {dataMode === "fixture" && (
            <p role="alert" className="boot-error">
              Dữ liệu fixture · không thực hiện giao dịch.
            </p>
          )}
          <ApplicationRoutes />
        </main>
      </div>
      <div className="market-chat">
        <CustomerChatWidget />
      </div>
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="market-width py-8 flex flex-wrap justify-between gap-4">
          <div>
            <strong>
              PBL6<span className="text-emerald-600">Market</span>
            </strong>
            <p className="text-xs text-slate-400 mt-2">
              Khám phá nhiều gian hàng. Theo dõi từng đơn hàng.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-500">
            <Link to="/customer/orders">Theo dõi đơn hàng</Link>
            <Link to="/customer/store-applications">Mở gian hàng</Link>
            <Link to="/customer/settings">Quyền riêng tư</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
export function LiveApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScopedQueries />
      </BrowserRouter>
    </AuthProvider>
  );
}
