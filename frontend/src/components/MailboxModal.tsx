import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, CheckCircle2, UserPlus, KeyRound, ExternalLink } from 'lucide-react';

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInvitations: () => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({ isOpen, onClose, onOpenInvitations }) => {
  const { mailbox, markMailAsRead, currentUser } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Hộp Thư Demo (Mock Mailbox)</h3>
              <p className="text-xs text-slate-400">
                Mô phỏng máy chủ mail nội bộ gửi OTP, link kích hoạt tài khoản & lời mời nhân viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mailbox.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Mail className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium">Chưa có email nào trong hộp thư demo.</p>
            </div>
          ) : (
            mailbox.map(mail => (
              <div
                key={mail.id}
                onClick={() => markMailAsRead(mail.id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  mail.isRead
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-amber-50/60 border-amber-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {mail.type === 'VERIFY_EMAIL' && (
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    {mail.type === 'STAFF_INVITATION' && (
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <UserPlus className="w-4 h-4" />
                      </span>
                    )}
                    {mail.type === 'RESET_PASSWORD' && (
                      <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                        <KeyRound className="w-4 h-4" />
                      </span>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">{mail.subject}</h4>
                      <p className="text-xs text-slate-500">
                        Người nhận: <span className="font-mono text-slate-700">{mail.toEmail}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(mail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mt-3 text-xs bg-white p-3 rounded-lg border border-slate-200/80">
                  {mail.type === 'VERIFY_EMAIL' && (
                    <div className="space-y-2">
                      <p>Chào bạn, vui lòng nhấn liên kết bên dưới để hoàn tất xác minh tài khoản PBL6 Marketplace:</p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          alert('Xác minh email thành công! Trạng thái email_verified_at đã cập nhật.');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác minh email ngay</span>
                      </button>
                    </div>
                  )}

                  {mail.type === 'STAFF_INVITATION' && (
                    <div className="space-y-2">
                      <p>
                        Gian hàng <strong className="text-slate-900">{mail.data.storeName}</strong> vừa gửi lời mời bạn tham gia đội ngũ nhân viên vận hành (Seller).
                      </p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onClose();
                          onOpenInvitations();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem và chấp nhận lời mời</span>
                      </button>
                    </div>
                  )}

                  {mail.type === 'RESET_PASSWORD' && (
                    <div className="space-y-1">
                      <p>Mã xác nhận bảo mật khôi phục mật khẩu (có hiệu lực trong 10 phút):</p>
                      <div className="font-mono text-base font-bold text-purple-700 tracking-wider bg-purple-50 p-2 rounded inline-block">
                        {mail.data.resetToken}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Mailbox URL: mock-mailbox.pbl6.local</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
