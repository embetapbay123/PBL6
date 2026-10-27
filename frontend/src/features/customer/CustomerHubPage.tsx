import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConsentSettings } from './ConsentSettings';
import { StoreApplicationForm } from './StoreApplicationForm';
import { InvitationsModal } from './InvitationsModal';
import { CustomerSubNav } from './CustomerSubNav';

export const CustomerHubPage: React.FC = () => {
  const [invitations, setInvitations] = useState(false);
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <CustomerSubNav />
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trung tâm Khách hàng & Cài đặt</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý quyền riêng tư, sự đồng ý và các tiện ích tài khoản.</p>
        </div>
      </div>
      
      {/* 1. Quản lý Consent */}
      <ConsentSettings />

      {/* 2. Đăng ký mở cửa hàng */}
      <StoreApplicationForm />
      <button onClick={() => setInvitations(true)} className="boot-button">Xem lời mời Store (Modal)</button>
      <InvitationsModal isOpen={invitations} onClose={() => setInvitations(false)} />
    </div>
  );
};

export default CustomerHubPage;
