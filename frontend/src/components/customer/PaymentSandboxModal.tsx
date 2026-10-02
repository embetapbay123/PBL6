import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  CreditCard,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Store
} from 'lucide-react';

interface PaymentSandboxModalProps {
  order: Order | null;
  onClose: () => void;
}

export const PaymentSandboxModal: React.FC<PaymentSandboxModalProps> = ({ order, onClose }) => {
  const { simulatePaymentAttempt } = useApp();

  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [cardNumber, setCardNumber] = useState('9704 1985 0000 1234');
  const [cardHolder, setCardHolder] = useState('NGUYEN VAN AN');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [order]);

  if (!order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAction = (result: 'SUCCESS' | 'FAIL' | 'RECOVERING') => {
    setIsProcessing(true);
    setTimeout(() => {
      simulatePaymentAttempt(order.id, result);
      setIsProcessing(false);
      setSimulationResult(result);
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Cổng Thanh Toán Giả Lập (Sandbox Gateway)</h3>
              <p className="text-xs text-slate-400">Order ID: {order.id} • {order.storeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Expiration Timer Box */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Thời gian giữ tồn kho của đơn hàng:</span>
            </div>
            <span className="font-mono font-bold text-base text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-300">
              {timeFormatted}
            </span>
          </div>

          {/* Order Snapshot */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                {order.storeName}
              </span>
              <span className="text-[11px] text-slate-500">Mã nhóm: {order.purchaseGroupId}</span>
            </div>
            <div className="divide-y divide-slate-200/60 pt-1">
              {order.items.map(it => (
                <div key={it.id} className="py-1.5 flex justify-between">
                  <span className="line-clamp-1">{it.productName} ({it.variantTitle}) × {it.quantity}</span>
                  <span className="font-semibold text-slate-800">{formatVnd(it.totalVnd)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm text-slate-900">
              <span>Tổng số tiền cần thanh toán:</span>
              <span className="text-emerald-600 text-base">{formatVnd(order.payableVnd)}</span>
            </div>
          </div>

          {/* Mock Card Form */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Thẻ thử nghiệm Sandbox (Mock Test Card)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Số thẻ ATM / Visa Sandbox:</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Tên chủ thẻ:</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Hết hạn:</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-mono text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">CVV:</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={e => setCvv(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-mono text-xs text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Scenario Buttons (Directly tests PBL6 Failure Modes & Happy Path) */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Chọn kịch bản kiểm thử (Test Simulation Actions):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleAction('SUCCESS')}
                disabled={isProcessing}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                <span>1. Thành công</span>
                <span className="text-[10px] font-normal text-emerald-100">Happy path</span>
              </button>

              <button
                onClick={() => handleAction('RECOVERING')}
                disabled={isProcessing}
                className="p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer"
                title="Giả lập thanh toán thành công nhưng lỗi consume kho tạm thời, Order vào trạng thái RECOVERING để worker retry"
              >
                <RefreshCw className="w-5 h-5" />
                <span>2. RECOVERING</span>
                <span className="text-[10px] font-normal text-amber-100">Lỗi tạm & Retry</span>
              </button>

              <button
                onClick={() => handleAction('FAIL')}
                disabled={isProcessing}
                className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
                <span>3. Thất bại</span>
                <span className="text-[10px] font-normal text-rose-100">Payment FAILED</span>
              </button>
            </div>
          </div>

          {simulationResult && (
            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs text-center animate-in fade-in">
              Đã mô phỏng kết quả: <strong className="text-emerald-400">{simulationResult}</strong>! Đang cập nhật trạng thái đơn...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
