import React from 'react';
import { ConsentSettings } from './ConsentSettings';
import { StoreApplicationForm } from './StoreApplicationForm';

export const CustomerHubPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Trung tâm Khách hàng & Cài đặt</h1>
      
      {/* 1. Quản lý Consent */}
      <ConsentSettings />

      {/* 2. Đăng ký mở cửa hàng */}
      <StoreApplicationForm />
    </div>
  );
};

export default CustomerHubPage;