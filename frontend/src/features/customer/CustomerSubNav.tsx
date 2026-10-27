import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/customer/profile', label: 'Thông tin cá nhân' },
  { to: '/customer/addresses', label: 'Sổ địa chỉ' },
  { to: '/customer/orders', label: 'Đơn hàng của tôi' },
  { to: '/customer/invitations', label: 'Lời mời Store' },
  { to: '/customer/store-applications', label: 'Mở gian hàng' },
  { to: '/customer/settings', label: 'Cài đặt' },
];

export function CustomerSubNav() {
  return (
    <nav
      className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-white rounded-lg border border-gray-200 shadow-sm"
      aria-label="Điều hướng tài khoản khách hàng"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        padding: '0.5rem',
        background: '#ffffff',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <NavLink
        to="/profile"
        className="px-3 py-1.5 text-xs font-semibold rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        style={{
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#64748b',
          textDecoration: 'none',
          borderRadius: '0.375rem',
        }}
      >
        ← Trung tâm TK
      </NavLink>
      <span className="text-gray-300" style={{ color: '#cbd5e1' }}>|</span>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
          style={({ isActive }) => ({
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#ffffff' : '#334155',
            backgroundColor: isActive ? '#059669' : 'transparent',
            borderRadius: '0.375rem',
            textDecoration: 'none',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
