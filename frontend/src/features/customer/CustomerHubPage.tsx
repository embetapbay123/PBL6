import React,{useState} from 'react';
import { ConsentSettings } from './ConsentSettings';
import { StoreApplicationForm } from './StoreApplicationForm';
import {InvitationsModal} from './InvitationsModal';

export const CustomerHubPage: React.FC = () => {
  const [invitations,setInvitations]=useState(false);
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Trung tâm Khách hàng & Cài đặt</h1>
      
      {/* 1. Quản lý Consent */}
      <ConsentSettings />

      {/* 2. Đăng ký mở cửa hàng */}
      <StoreApplicationForm />
      <button onClick={()=>setInvitations(true)}>Xem lời mời Store</button>
      <InvitationsModal isOpen={invitations} onClose={()=>setInvitations(false)}/>
    </div>
  );
};

export default CustomerHubPage;
