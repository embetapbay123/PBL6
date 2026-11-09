import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

const primaryNavItems = [
  { to: "/customer/orders", label: "Đơn hàng của tôi" },
  { to: "/customer/addresses", label: "Sổ địa chỉ" },
  { to: "/customer/returns", label: "Đổi trả" },
  { to: "/customer/favorites", label: "Yêu thích" },
  { to: "/customer/reviews", label: "Đánh giá của tôi" },
  { to: "/customer/profile", label: "Thông tin cá nhân" },
];

const secondaryNavItems = [
  { to: "/customer/messages", label: "Tin nhắn" },
  { to: "/customer/notifications", label: "Thông báo" },
  { to: "/customer/invitations", label: "Lời mời Store" },
  { to: "/customer/store-applications", label: "Mở gian hàng" },
  { to: "/customer/settings", label: "Cài đặt" },
];

export function CustomerSubNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSecondaryActive = secondaryNavItems.some((item) =>
    location.pathname.startsWith(item.to)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className="customer-account-nav"
      aria-label="Điều hướng tài khoản khách hàng"
    >
      <NavLink to="/profile" className="customer-account-home">
        ← Trung tâm tài khoản
      </NavLink>
      {primaryNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="customer-nav-dropdown-wrapper relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={`customer-nav-more-btn ${isSecondaryActive ? "active" : ""}`}
        >
          Thêm ▾
        </button>
        {moreOpen && (
          <div className="customer-nav-dropdown-menu absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 min-w-[150px]">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 ${isActive ? "font-semibold text-emerald-600 bg-emerald-50" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
