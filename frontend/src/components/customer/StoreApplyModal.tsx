import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Store, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface StoreApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreApplyModal: React.FC<StoreApplyModalProps> = ({ isOpen, onClose }) => {
  const { storeApplications, submitStoreApplication, currentUser } = useApp();

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [businessCode, setBusinessCode] = useState('');

  if (!isOpen) return null;

  // Existing applications by current user
  const myApplications = storeApplications.filter(a => a.userId === currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !businessCode.trim()) {
      alert('Vui lòng điền đầy đủ tên Gian hàng và Mã số kinh doanh!');
      return;
    }

    submitStoreApplication(storeName.trim(), description.trim(), businessCode.trim());
    alert('Đơn đăng ký mở Store đã được gửi lên Ban Quản Trị Sàn để phê duyệt!');
    setStoreName('');
    setDescription('');
    setBusinessCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Đăng Ký Mở Gian Hàng Store (C09)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800">Thông tin đăng ký gian hàng mới:</h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên Gian Hàng:</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="VD: TechGear Flagship Store"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mã số đăng ký kinh doanh / CCCD:</label>
              <input
                type="text"
                value={businessCode}
                onChange={e => setBusinessCode(e.target.value)}
                placeholder="VD: 0401998822-001"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mô tả ngành hàng & Sản phẩm kinh doanh:</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả tóm tắt mặt hàng bạn dự định bán..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Gửi đơn duyệt mở Store</span>
            </button>
          </form>

          {/* List of my previous applications */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-800">Lịch sử đơn đăng ký của bạn:</h4>
            {myApplications.length === 0 ? (
              <p className="text-slate-400">Bạn chưa nộp đơn đăng ký nào.</p>
            ) : (
              myApplications.map(app => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-bold text-slate-900">{app.storeName}</h5>
                    <p className="text-slate-500 text-[11px]">Mã KD: {app.businessCode}</p>
                    <p className="text-slate-400 text-[10px]">
                      Nộp lúc: {new Date(app.createdAt).toLocaleString('vi-VN')}
                    </p>
                    {app.rejectionReason && (
                      <p className="text-rose-600 text-[11px] font-semibold mt-1">
                        Lý do từ chối: {app.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div>
                    {app.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Chờ duyệt</span>
                      </span>
                    )}
                    {app.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Đã duyệt</span>
                      </span>
                    )}
                    {app.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
