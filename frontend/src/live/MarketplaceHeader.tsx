import { CanDiscardChangesContext } from "../components/UnsavedChangesBoundary";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "../chat/ChatProvider";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  Heart,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  User,
  X,
  House,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useAuth } from "../api/auth-context";
import { callOperation } from "../api/operations";
const logoutNoticeKey = "pbl6_logout_unconfirmed";
const logoutNoticeEvent = "pbl6:logout-notice";
const logoutWarning =
  "Đã thoát trên trình duyệt này. Chưa xác nhận được việc thu hồi phiên trên máy chủ; hãy thử đăng nhập lại khi có mạng.";
function readLogoutNotice() {
  try {
    return sessionStorage.getItem(logoutNoticeKey) === "1";
  } catch {
    return false;
  }
}
function publishLogoutNotice(failed: boolean) {
  try {
    failed
      ? sessionStorage.setItem(logoutNoticeKey, "1")
      : sessionStorage.removeItem(logoutNoticeKey);
  } catch {
    /* The live event still provides feedback without storage. */
  }
  window.dispatchEvent(new CustomEvent(logoutNoticeEvent, { detail: failed }));
}
export function MarketplaceHeader() {
  const chat = useChat();
  const { session, logout, restoring } = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [mobile, setMobile] = useState(false),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    composing = useRef(false);
  const cache = useQueryClient(),
    canDiscard = useContext(CanDiscardChangesContext),
    leaving = useRef(false);
  const [signingOut, setSigningOut] = useState(false),
    [signOutError, setSignOutError] = useState(() =>
      readLogoutNotice() ? logoutWarning : "",
    );
  useEffect(() => {
    const show = (failed: boolean) => {
      setSignOutError(failed ? logoutWarning : "");
      if (failed) setMenu(true);
    };
    const listen = (event: Event) =>
      show((event as CustomEvent<boolean>).detail);
    show(readLogoutNotice());
    window.addEventListener(logoutNoticeEvent, listen);
    return () => window.removeEventListener(logoutNoticeEvent, listen);
  }, []);
  useEffect(() => {
    if (session) publishLogoutNotice(false);
  }, [session?.context?.user_id]);
  async function signOut() {
    if (leaving.current || !canDiscard()) return;
    leaving.current = true;
    setSigningOut(true);
    publishLogoutNotice(false);
    try {
      await logout();
      setMenu(false);
      navigate("/", { replace: true });
    } catch {
      publishLogoutNotice(true);
    } finally {
      cache.clear();
      leaving.current = false;
      setSigningOut(false);
    }
  }
  const roles = session?.context?.roles ?? [],
    customer = roles.includes("CUSTOMER"),
    merchant = roles.some((role) => ["STORE_OWNER", "SELLER"].includes(role)),
    admin = roles.includes("ADMIN"),
    portal = /^\/(seller|admin)(\/|$)/.test(location.pathname);
  const cart = useQuery({
    queryKey: ["cart-summary"],
    enabled: customer,
    queryFn: () =>
      callOperation("listCartItems", { query: { page: 1, size: 1 } }),
    staleTime: 30000,
  });
  const notifications = useQuery({
    queryKey: ["notifications", "header"],
    enabled: customer,
    staleTime: 15000,
    refetchInterval: 30000,
    queryFn: () =>
      callOperation("listNotifications", { query: { page: 1, size: 1 } }),
  });
  useEffect(() => {
    setMenu(false);
    setMobile(false);
    setSearch(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!menu) return;
    const down = (event: PointerEvent) => {
        if (!root.current?.contains(event.target as Node)) setMenu(false);
      },
      key = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setMenu(false);
          trigger.current?.focus();
        }
      };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!composing.current)
      navigate("/?q=" + encodeURIComponent(search.trim()));
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header
        className={
          "commerce-header" + (portal ? " commerce-workspace-header" : "")
        }
      >
        <div className="commerce-utility">
          <div className="market-width">
            <span>
              {import.meta.env.VITE_DEMO_LOGIN_ENABLED === "1"
                ? "PBL6 Market · Bản trải nghiệm với dữ liệu mẫu"
                : "PBL6 · Marketplace"}
            </span>
            <div>
              {merchant ? (
                <Link to="/seller">Kênh người bán</Link>
              ) : (
                <Link to="/customer/store-applications">
                  Bán hàng cùng PBL6
                </Link>
              )}
              {admin && <Link to="/admin">Quản trị hệ thống</Link>}
              <Link to="/customer/orders">Theo dõi đơn hàng</Link>
            </div>
          </div>
        </div>
        <div className="market-width commerce-header-main">
          <Link to="/" className="commerce-brand" aria-label="Trang chủ PBL6">
            <span className="commerce-brand-mark">P6</span>
            <strong>
              PBL6<span> Market</span>
            </strong>
          </Link>
          {!portal && (
            <form
              className="commerce-global-search"
              role="search"
              onSubmit={submit}
            >
              <Search size={20} />
              <input
                aria-label="Tìm kiếm toàn sàn"
                type="search"
                placeholder="Tìm kiếm sản phẩm trên toàn sàn…"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
              />
              <button aria-label="Tìm toàn sàn" type="submit">
                Tìm kiếm
              </button>
            </form>
          )}
          <div className="commerce-header-actions">
            {!portal && (!session || customer) && (
              <>
                <Link
                  className="header-icon"
                  to="/customer/notifications"
                  aria-label={
                    notifications.data?.unread
                      ? "Thông báo, " + notifications.data.unread + " chưa đọc"
                      : "Thông báo"
                  }
                >
                  <Bell size={22} />
                  {!!notifications.data?.unread && (
                    <b className="header-notification-badge" aria-hidden="true">
                      {notifications.data.unread > 99
                        ? "99+"
                        : notifications.data.unread}
                    </b>
                  )}
                </Link>
                <Link
                  className="header-icon header-cart"
                  to="/cart"
                  aria-label="Giỏ hàng"
                >
                  <ShoppingCart size={23} />
                  {!!cart.data?.total && (
                    <b>{cart.data.total > 99 ? "99+" : cart.data.total}</b>
                  )}
                </Link>
                {!/^\/customer\/messages(\/|$)/.test(location.pathname) && (
                  <button
                    className="header-icon market-header-chat"
                    data-chat-opener
                    disabled={restoring}
                    type="button"
                    aria-label={
                      chat.ui.status === "minimized"
                        ? "Khôi phục chat"
                        : "Mở chat"
                    }
                    title={
                      restoring ? "Đang khôi phục phiên đăng nhập…" : "Chat"
                    }
                    aria-controls="chat-center-dialog"
                    aria-expanded={chat.ui.status === "open"}
                    onClick={() => chat.openChat()}
                  >
                    <MessageSquare size={22} />
                  </button>
                )}
              </>
            )}
            <div ref={root} className="account-menu">
              <button
                ref={trigger}
                className="account-trigger"
                aria-label="Menu tài khoản"
                aria-expanded={menu}
                aria-controls="account-dropdown"
                onClick={() => setMenu(!menu)}
              >
                <User size={22} />
                <span>{session ? "Tài khoản" : "Đăng nhập"}</span>
                <ChevronDown size={14} />
              </button>
              {menu && (
                <nav
                  id="account-dropdown"
                  className="account-dropdown"
                  aria-label="Menu tài khoản"
                >
                  <strong>
                    {session ? "Tài khoản của bạn" : "Chào mừng đến PBL6"}
                  </strong>
                  {!session ? (
                    <>
                      <Link to="/login" data-testid="account-link">
                        Đăng nhập
                      </Link>
                      <Link to="/register">Đăng ký</Link>
                    </>
                  ) : (
                    <>
                      <Link to="/profile">Tài khoản của tôi</Link>
                      {customer && (
                        <>
                          <Link to="/customer/orders">Đơn hàng</Link>
                          <Link to="/customer/wallet">Ví số dư</Link>
                          <Link to="/customer/favorites">Yêu thích</Link>
                          <Link to="/customer/addresses">Sổ địa chỉ</Link>
                        </>
                      )}
                    </>
                  )}
                  {merchant && <Link to="/seller">Store Portal</Link>}
                  {admin && <Link to="/admin">Admin Portal</Link>}
                  {session && (
                    <div className="account-menu-footer">
                      <button
                        type="button"
                        className="account-signout"
                        disabled={signingOut}
                        onClick={() => void signOut()}
                      >
                        <LogOut size={16} aria-hidden="true" />
                        {signingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                      </button>
                    </div>
                  )}
                  {signOutError && (
                    <p className="account-menu-error" role="alert">
                      {signOutError}
                    </p>
                  )}
                </nav>
              )}
            </div>
            <button
              className="market-menu-toggle"
              aria-label={mobile ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {!portal && (location.pathname === "/" || mobile) && (
          <nav
            className={
              "market-width market-navigation" + (mobile ? " mobile-open" : "")
            }
            aria-label="Điều hướng chính"
          >
            <NavLink to="/" end>
              Sản phẩm
            </NavLink>
            <Link to="/#danh-muc">Danh mục ngành hàng</Link>
            <Link to="/customer/favorites">Sản phẩm đã lưu</Link>
            <Link to="/customer/messages">Tin nhắn</Link>
            <div className="market-portal-links">
              {admin && (
                <Link to="/admin">
                  <ShieldCheck size={16} />
                  Quản trị
                </Link>
              )}
              <Link
                className="navigation-sell"
                to={merchant ? "/seller" : "/customer/store-applications"}
              >
                <Store size={17} />
                {merchant ? "Quản lý Store" : "Đăng ký bán hàng"}
              </Link>
            </div>
          </nav>
        )}
        {portal && (
          <div className="market-width commerce-back">
            <Link to="/">← Về trang mua sắm</Link>
            <span>
              {location.pathname.startsWith("/admin")
                ? "KHÔNG GIAN QUẢN TRỊ"
                : "KÊNH NGƯỜI BÁN"}
            </span>
          </div>
        )}
      </header>
      {!portal && (
        <nav
          className="market-mobile-dock"
          aria-label="Điều hướng nhanh trên điện thoại"
        >
          <NavLink to="/" end>
            <House />
            Khám phá
          </NavLink>
          <NavLink to="/customer/favorites" aria-label="Danh sách yêu thích">
            <Heart />
            Đã lưu
          </NavLink>
          <NavLink to="/cart" aria-label="Mở giỏ hàng">
            <ShoppingCart />
            Giỏ hàng
          </NavLink>
          {(!session || customer) &&
          !location.pathname.startsWith("/customer/messages") ? (
            <button
              type="button"
              data-chat-opener
              disabled={restoring}
              aria-label={
                chat.ui.status === "minimized" ? "Khôi phục chat" : "Mở chat"
              }
              aria-controls="chat-center-dialog"
              aria-expanded={chat.ui.status === "open"}
              onClick={() => chat.openChat()}
            >
              <MessageSquare />
              Chat
              {chat.ui.status === "minimized" && (
                <span className="sr-only">Có hội thoại đang thu nhỏ</span>
              )}
            </button>
          ) : (
            <NavLink to="/customer/messages">
              <MessageSquare />
              Tin nhắn
            </NavLink>
          )}
          <NavLink to="/profile" aria-label="Hồ sơ của tôi">
            <User />
            Cá nhân
          </NavLink>
        </nav>
      )}
    </>
  );
}
