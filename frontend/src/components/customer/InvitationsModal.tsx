import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserPlus, CheckCircle2, Shield, Clock } from 'lucide-react';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({ isOpen, onClose }) => {
  const { staffInvitations, acceptStaffInvitation, currentUser } = useApp();

  if (!isOpen) return null;

  // Invitations sent to currentUser's email
  const myInvitations = staffInvitations.filter(i => i.invitedEmail === currentUser.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Lời Mời Vận Hành Store Của Tôi (C09)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-500">
            Danh sách lời mời làm nhân viên bán hàng (Seller) gửi tới email{' '}
            <strong className="text-slate-800 font-mono">{currentUser.email}</strong>.
          </p>

          {myInvitations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Không có lời mời nào hiện tại.
            </div>
          ) : (
            myInvitations.map(inv => (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{inv.storeName}</h4>
                    <p className="text-slate-500 text-[11px]">Vai trò được phân bổ: <strong>Nhân viên Bán (Seller)</strong></p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Hết hạn: {new Date(inv.expiresAt).toLocaleDateString('vi-VN')}</span>
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      inv.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : inv.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>

                {/* 4 Permission groups */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5 text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tập 4 nhóm quyền được cấp:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <span className={inv.permissions.canManageProduct ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {inv.permissions.canManageProduct ? '✓' : '✗'} Quản lý Sản phẩm
                    </span>
                    <span className={inv.permissions.canManageInventory ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {inv.permissions.canManageInventory ? '✓' : '✗'} Quản lý Tồn kho
                    </span>
                    <span className={inv.permissions.canManageOrder ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {inv.permissions.canManageOrder ? '✓' : '✗'} Xử lý Đơn hàng Store
                    </span>
                    <span className={inv.permissions.canCollectCod ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {inv.permissions.canCollectCod ? '✓' : '✗'} Thu tiền mặt COD
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {inv.status === 'PENDING' && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        acceptStaffInvitation(inv.id);
                        alert(`Chúc mừng! Bạn đã trở thành nhân viên của gian hàng ${inv.storeName}!`);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Chấp nhận tham gia Store</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
