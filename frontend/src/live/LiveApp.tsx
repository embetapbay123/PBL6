import {Button as UiButton} from '../components/ui/Button';
import { RouteFocus } from "../components/RouteFocus";
import { UnsavedChangesBoundary } from "../components/UnsavedChangesBoundary";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  NavLink,
  useLocation,
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
  MapPin,
  Mail,
  MessageSquare,
  Key,
} from "lucide-react";
import { AuthProvider, useAuth } from "../api/auth-context";
import { api, sessionScope } from "../api/client";
import { dataMode, callOperation } from "../api/operations";
import { customerRoutes } from "../features/customer/routes";
import { sellerRoutes } from "../features/seller/routes";
import { adminRoutes } from "../features/admin/routes";
import { AuthPage } from "../features/customer/auth/AuthPage";
import { ToastProvider } from "../components/ToastProvider";
import { ChatProvider } from "../chat/ChatProvider";
import { ChatCenter } from "../chat/ChatCenter";
import { SellerChatLauncher } from "../chat/SellerChatLauncher";
import { ErrorView, Loading } from "../bootstrap/components";
import "../bootstrap/bootstrap.css";
import "./commerce.css";
import "../chat/chat-workspace.css";
import "../styles/ui-components.css";
import "../styles/seller-workspace.css";
import "../styles/customer-polish.css";
import { StoreContextNotice } from "../components/StoreContextNotice";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { listenFavoritesChange } from "../features/customer/favorite-state";

function ScopedQueries() {
  const { session } = useAuth();
  const scope = sessionScope(session);
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 10000 } },
      }),
    [scope],
  );
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  useEffect(() => listenFavoritesChange(client), [client]);
  return (
    <QueryClientProvider client={client} key={scope}>
      <UnsavedChangesBoundary>
        <ToastProvider key={scope}>
          <ChatProvider>
            <Market />
          </ChatProvider>
        </ToastProvider>
      </UnsavedChangesBoundary>
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
  const roles = session?.context?.roles ?? [];
  const isMerchant = roles.includes("STORE_OWNER") || roles.includes("SELLER");
  const isAdmin = roles.includes("ADMIN");

  const personalLinks = [
    [
      "/customer/profile",
      "Thông tin cá nhân",
      "Chỉnh sửa tên và thông tin liên hệ",
      User,
    ],
    [
      "/customer/orders",
      "Đơn hàng của tôi",
      "Theo dõi, thanh toán và xử lý đơn mua",
      Package,
    ],
    [
      "/customer/favorites",
      "Sản phẩm yêu thích",
      "Những sản phẩm bạn đã lưu",
      ShoppingBag,
    ],
    [
      "/customer/messages",
      "Tin nhắn với gian hàng",
      "Trao đổi và xem lịch sử hội thoại",
      MessageSquare,
    ],
    [
      "/customer/notifications",
      "Thông báo",
      "Cập nhật đơn hàng và đổi trả",
      Mail,
    ],
    [
      "/customer/returns",
      "Yêu cầu đổi trả",
      "Theo dõi yêu cầu và phản hồi",
      Package,
    ],
    ["/customer/addresses", "Sổ địa chỉ", "Quản lý địa chỉ nhận hàng", MapPin],
    [
      "/customer/invitations",
      "Lời mời Store",
      "Xem lời mời tham gia gian hàng",
      Users,
    ],
    [
      "/customer/store-applications",
      "Đăng ký mở gian hàng",
      "Bắt đầu bán hàng trên PBL6 Market",
      Store,
    ],
    [
      "/customer/settings",
      "Cài đặt & Quyền riêng tư",
      "Quản lý quyền cá nhân hóa",
      Settings,
    ],
    ["/change-password", "Đổi mật khẩu", "Cập nhật mật khẩu đăng nhập", Key],
  ] as const;
  const additionalPaths = new Set(['/customer/messages', '/customer/notifications', '/customer/returns', '/customer/invitations', '/customer/store-applications']);
  const shortcut = ([path, label, description, Icon]: (typeof personalLinks)[number]) => (
    <Link to={path} key={path}>
      <span><Icon size={22} /></span>
      <div><strong>{label}</strong><small>{description}</small></div>
      <span className="account-shortcut-arrow" aria-hidden="true">→</span>
    </Link>
  );
  return (
    <section className="account-hub">
      <div className="seller-products-toolbar">
        <div>
          <h1>Trung tâm tài khoản</h1>
          <p>
            Quản lý thông tin, hoạt động mua sắm và các quyền truy cập của bạn.
          </p>
        </div>
        {session && (
          <Link className="ui-button ui-button-secondary" to="/login">
            Quản lý đăng nhập
          </Link>
        )}
      </div>
      {!session ? (
        <div className="boot-card">
          <h2>Chào mừng bạn đến PBL6 Market</h2>
          <p>
            Bạn chưa đăng nhập. Vui lòng đăng nhập để xem thông tin và lịch sử
            tài khoản.
          </p>
          <div className="ui-actions">
            <Link className="ui-button ui-button-primary" to="/login">
              Đăng nhập ngay
            </Link>
            <Link className="ui-button ui-button-secondary" to="/register">
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} />
      ) : (
        <>
          <div className="account-summary">
            <span className="account-avatar">
              <User size={28} />
            </span>
            <div>
              <h2>{data?.display_name || "Tài khoản của bạn"}</h2>
              <p>{data?.email}</p>
              {data?.phone && <p>{data.phone}</p>}
            </div>
            <span className="market-badge">
              {isAdmin
                ? "Quản trị viên"
                : isMerchant
                  ? "Đối tác bán hàng"
                  : "Khách hàng"}
            </span>
          </div>
          <div className="account-shortcut-grid">
            {personalLinks.filter(([path]) => !additionalPaths.has(path) && (roles.includes('CUSTOMER') || path === '/change-password')).map(shortcut)}
          </div>
          {roles.includes('CUSTOMER') && (
            <details className="account-additional-links">
              <summary>Hoạt động khác</summary>
              <div className="account-shortcut-grid">
                {personalLinks.filter(([path]) => additionalPaths.has(path)).map(shortcut)}
              </div>
            </details>
          )}
          {(isMerchant || isAdmin) && (
            <div className="account-portals">
              {isMerchant && (
                <Link className="ui-button ui-button-primary" to="/seller">
                  <Store size={18} />
                  Mở kênh người bán
                </Link>
              )}
              {isAdmin && (
                <Link className="ui-button ui-button-primary" to="/admin">
                  <ShieldCheck size={18} />
                  Mở trang quản trị
                </Link>
              )}
            </div>
          )}
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
const merchantSectionGroups = [
  {
    title: "Tổng quan",
    items: [["/seller", "Tổng quan", LayoutDashboard]],
  },
  {
    title: "Bán hàng",
    items: [
      ["/seller/orders", "Đơn hàng Store", Package],
      ["/seller/shipping", "Vận đơn giao hàng", Package],
      ["/seller/returns", "Đổi trả", Package],
      ["/seller/delivery-returns", "Giao thất bại / hoàn về", Package],
    ],
  },
  {
    title: "Hàng hóa",
    items: [
      ["/seller/products", "Sản phẩm Store", ShoppingBag],
      ["/seller/inventory", "Tồn kho", Boxes],
    ],
  },
  {
    title: "Khách hàng & Ưu đãi",
    items: [
      ["/seller/messages", "Tin nhắn khách hàng", MessageSquare],
      ["/seller/vouchers", "Voucher Store", Ticket],
    ],
  },
  {
    title: "Thiết lập & Báo cáo",
    items: [
      ["/seller/staff", "Nhân viên & lời mời", Users],
      ["/seller/settings", "Thông tin gian hàng", Settings],
      ["/seller/reports", "Báo cáo", BarChart3],
      ["/seller/audit", "Nhật ký Store", ShieldCheck],
    ],
  },
] as const;

const adminSectionGroups = [
  {
    title: "Tổng quan",
    items: [["dashboard", "Tổng quan", LayoutDashboard]],
  },
  {
    title: "Bán hàng & Vận hành",
    items: [
      ["orders", "Đơn hàng toàn sàn", Package],
      ["shipping", "Giao nhận hàng", Package],
      ["returns", "Yêu cầu đổi trả", ShoppingBag],
      ["delivery-returns", "Hồ sơ giao thất bại", Package],
    ],
  },
  {
    title: "Hàng hóa & Gian hàng",
    items: [
      ["catalog", "Danh mục & kiểm duyệt", Boxes],
      ["stores", "Gian hàng", Store],
      ["vouchers", "Ưu đãi toàn sàn", Ticket],
    ],
  },
  {
    title: "Tài khoản & Phân quyền",
    items: [
      ["users", "Tài khoản", Users],
      ["roles", "Phân quyền", Key],
    ],
  },
  {
    title: "Hệ thống",
    items: [
      ["reports", "Báo cáo thu / hoàn", BarChart3],
      ["ai", "Vận hành AI", MessageSquare],
      ["audit", "Nhật ký quản trị", ShieldCheck],
    ],
  },
] as const;

const adminTabTitles: Record<string, string> = {
  dashboard: "Tổng quan",
  users: "Tài khoản",
  stores: "Gian hàng",
  roles: "Phân quyền",
  catalog: "Danh mục & kiểm duyệt",
  orders: "Đơn hàng toàn sàn",
  shipping: "Giao nhận hàng",
  reports: "Báo cáo thu / hoàn",
  returns: "Yêu cầu đổi trả",
  "delivery-returns": "Hồ sơ giao thất bại",
  vouchers: "Ưu đãi toàn sàn",
  ai: "Vận hành AI",
  audit: "Nhật ký quản trị",
};
function Market() {
  const { session } = useAuth(),
    location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const roles = session?.context?.roles ?? [],
    membership = session?.context?.store_membership;
  const admin = roles.includes("ADMIN"),
    merchant = roles.some((r) => r === "STORE_OWNER" || r === "SELLER"),
    owner = membership?.role === "OWNER";
  const portal = location.pathname.startsWith("/seller")
    ? "seller"
    : location.pathname.startsWith("/admin")
      ? "admin"
      : undefined;
  const account =
    (location.pathname.startsWith("/customer/") &&
      !location.pathname.startsWith("/customer/messages")) ||
    location.pathname === "/profile" || location.pathname === "/change-password";
  const can = (code: string) =>
    owner || !!membership?.permissions?.includes(code);
  const unreadMessages=useQuery({queryKey:['store-unread',session?.context?.user_id,membership?.store_id],enabled:portal==='seller'&&membership?.status==='ACTIVE'&&!!membership.store_id&&can('order.store.read_status_cancel'),queryFn:()=>callOperation('listStoreConversations',{query:{page:1,size:1}}),refetchInterval:15000,refetchIntervalInBackground:false,retry:false});
  return (
    <div
      className={
        "live-market " +
        (portal ? "workspace-shell " : "storefront-shell ") + (portal==='seller'?'seller-workspace ':'') +
        (collapsed ? "sidebar-collapsed" : "")
      }
    >
      <MarketplaceHeader />
      {portal && (
        <div className="workspace-topbar market-width">
          <UiButton
            variant="secondary" type="submit"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Menu size={18} />
            <span>{collapsed ? "Mở rộng menu" : "Thu gọn menu"}</span>
          </UiButton>
          <nav aria-label="Breadcrumb">
            <Link to="/">PBL6 Market</Link>
            <span>/</span>
            <span>{portal === "seller" ? "Kênh người bán" : "Quản trị"}</span>
            {portal === "admin" && (
              <>
                <span>/</span>
                <span className="font-semibold text-slate-800">
                  {adminTabTitles[new URLSearchParams(location.search).get("tab") ?? "dashboard"] ?? "Tổng quan"}
                </span>
              </>
            )}
          </nav>
        </div>
      )}
      <div
        className={
          "market-width market-body " +
          (portal ? "market-portal" : account ? "account-layout" : "")
        }
      >
        {portal === "seller" && merchant && (
          <aside className="market-sidebar" aria-label="Menu Store">
            <p className="text-xs font-bold tracking-widest text-slate-400 mb-2">
              QUẢN LÝ GIAN HÀNG
            </p>
            {merchantSectionGroups.map((group) => {
              const visibleItems = group.items.filter(([path]) =>
                path.includes("audit") ||
                path.includes("staff") ||
                path.includes("settings") ||
                path.includes("reports") ||
                path.includes("vouchers")
                  ? owner
                  : path.includes("inventory")
                    ? can("inventory.store.read_adjust")
                    : path.includes("products")
                      ? can("product.store.read_write")
                      : path.includes("orders") ||
                          path.includes("messages") ||
                          path.includes("returns")
                        ? can("order.store.read_status_cancel")
                        : true,
              );
              if (!visibleItems.length) return null;
              return (
                <div key={group.title} className="market-sidebar-group">
                  <div className="market-sidebar-group-title">{group.title}</div>
                  {visibleItems.map(([to, label, Icon]) => (
                    <NavLink
                      key={to}
                      aria-label={
                        to === "/seller/messages" && unreadMessages.data?.unread_total
                          ? `${label} · ${unreadMessages.data.unread_total} tin chưa đọc`
                          : label
                      }
                      title={label}
                      end={to === "/seller"}
                      to={to}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {to === "/seller/messages" && !!unreadMessages.data?.unread_total && (
                        <span aria-hidden="true" className="chat-unread-badge">
                          {unreadMessages.data.unread_total > 99
                            ? "99+"
                            : unreadMessages.data.unread_total}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </aside>
        )}
        {portal === "admin" && admin && (
          <aside className="market-sidebar" aria-label="Menu quản trị">
            <p className="text-xs font-bold tracking-widest text-slate-400 mb-2">
              QUẢN TRỊ NỀN TẢNG
            </p>
            {adminSectionGroups.map((group) => (
              <div key={group.title} className="market-sidebar-group">
                <div className="market-sidebar-group-title">{group.title}</div>
                {group.items.map(([tab, label, Icon]) => {
                  const selected =
                    (new URLSearchParams(location.search).get("tab") ??
                      "dashboard") === tab && location.pathname === "/admin";
                  return (
                    <Link
                      key={tab}
                      aria-label={label}
                      title={label}
                      to={"/admin?tab=" + tab}
                      className={selected ? "active" : undefined}
                      aria-current={selected ? "page" : undefined}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
                {group.title === "Hàng hóa & Gian hàng" && (
                  <NavLink
                    aria-label="Hồ sơ mở gian hàng"
                    title="Hồ sơ mở gian hàng"
                    to="/admin/store-applications"
                  >
                    <Store size={16} />
                    <span>Hồ sơ mở gian hàng</span>
                  </NavLink>
                )}
              </div>
            ))}
          </aside>
        )}
        {account && (
          <aside className="account-sidebar" aria-label="Điều hướng tài khoản">
            <h2>Tài khoản của tôi</h2>
            {[
              ["/customer/profile", "Thông tin cá nhân"],
              ["/customer/orders", "Đơn hàng"],
              ["/customer/favorites", "Yêu thích"],
              ["/customer/addresses", "Sổ địa chỉ"],
              ["/customer/settings", "Cài đặt"],
              ["/change-password", "Đổi mật khẩu"],
            ]
              .filter(
                ([path]) =>
                  !session ||
                  roles.includes("CUSTOMER") ||
                  path === "/profile" ||
                  path === "/change-password",
              )
              .map(([path, label]) => (
                <NavLink to={path} key={path} end>
                  {label}
                </NavLink>
              ))}
            {roles.includes("CUSTOMER") && (
              <details key={location.pathname} className="account-sidebar-more" onKeyDown={event => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}>
                <summary>Thêm</summary>
                <nav className="account-sidebar-extra-links" aria-label="Hoạt động tài khoản khác">
                  {[
                    ["/customer/messages", "Tin nhắn"],
                    ["/customer/notifications", "Thông báo"],
                    ["/customer/returns", "Đổi trả"],
                    ["/customer/invitations", "Lời mời gian hàng"],
                    ["/customer/store-applications", "Mở gian hàng"],
                  ].map(([path, label]) => <NavLink to={path} key={path}>{label}</NavLink>)}
                </nav>
              </details>
            )}
          </aside>
        )}
        <main id="main-content" className="live-content min-w-0" tabIndex={-1}>
          <RouteFocus />
          <StoreContextNotice />
          {dataMode === "fixture" && (
            <p role="alert" className="boot-error">
              Dữ liệu fixture · không thực hiện giao dịch.
            </p>
          )}
          <Suspense fallback={<Loading />}>
            <ApplicationRoutes />
          </Suspense>
        </main>
      </div>
      <ChatCenter />
      {portal === 'seller' && membership?.status === 'ACTIVE' && membership.store_id && can('order.store.read_status_cancel') && !/^\/seller\/(?:messages|orders)(?:\/|$)/i.test(location.pathname) && <SellerChatLauncher key={`${session?.context?.user_id}:${membership.store_id}`} unread={unreadMessages.data?.unread_total}/>}
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
            <Link to="/customer/addresses">Sổ địa chỉ</Link>
            <Link to="/customer/store-applications">Mở gian hàng</Link>
            <Link to="/customer/settings">Quyền riêng tư</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
const liveRouter = createBrowserRouter([
  { path: "*", element: <ScopedQueries /> },
]);
if (import.meta.hot) import.meta.hot.dispose(() => liveRouter.dispose());
export function LiveApp() {
  return (
    <AuthProvider>
      <RouterProvider router={liveRouter} />
    </AuthProvider>
  );
}
