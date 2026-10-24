import React, { useState } from 'react';
import { submitStoreApplication } from '../../api/store-applications';

export const StoreApplicationForm: React.FC = () => {
  const [storeName, setStoreName] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Gọi API thực tế để gửi đơn đăng ký mở cửa hàng
      await submitStoreApplication({
        proposed_name: storeName,
        contact: businessLicense,
      });

      setSuccessMessage('Gửi đơn đăng ký mở cửa hàng thành công! Vui lòng chờ quản trị viên phê duyệt.');
      setStoreName('');
      setBusinessLicense('');
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi đơn đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Đăng ký mở cửa hàng (Store Application)</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tên cửa hàng của bạn"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giấy phép kinh doanh / Mã số</label>
          <input
            type="text"
            value={businessLicense}
            onChange={(e) => setBusinessLicense(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập số giấy phép kinh doanh"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Đang gửi đơn...' : 'Gửi đơn đăng ký'}
        </button>
      </form>
    </div>
  );
};

export default StoreApplicationForm;