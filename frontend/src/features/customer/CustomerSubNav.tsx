import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/customer/profile', label: 'Thông tin cá nhân' },
  { to: '/customer/addresses', label: 'Sổ địa chỉ' },
  { to: '/customer/orders', label: 'Đơn hàng của tôi' },
  { to: '/customer/messages', label: 'Tin nhắn' },
  { to: '/customer/notifications', label: 'Thông báo' },
  { to: '/customer/returns', label: 'Đổi trả' },
  { to: '/customer/favorites', label: 'Yêu thích' },
  { to: '/customer/invitations', label: 'Lời mời Store' },
  { to: '/customer/store-applications', label: 'Mở gian hàng' },
  { to: '/customer/settings', label: 'Cài đặt' },
];

export function CustomerSubNav() {
  return <nav className="customer-account-nav" aria-label="Điều hướng tài khoản khách hàng">
    <NavLink to="/profile" className="customer-account-home">← Trung tâm tài khoản</NavLink>
    {navItems.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>isActive?'active':undefined}>{item.label}</NavLink>)}
  </nav>;
}
