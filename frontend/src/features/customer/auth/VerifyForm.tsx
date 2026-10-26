import React, { useState } from 'react';

interface VerifyFormProps {
  email?: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const VerifyForm: React.FC<VerifyFormProps> = ({
  email = '',
  onSuccess,
  onSwitchToLogin,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(false);

    if (!code) {
      setError('Vui lòng nhập mã xác thực OTP.');
      return;
    }

    try {
      setLoading(true);
      // Gửi request xác thực mã OTP (Dev Fixture / API Call)
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Xác thực thất bại. Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResendSuccess(false);
    try {
      // Gửi yêu cầu gửi lại mã OTP
      setResendSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Xác thực tài khoản</h2>
      <p className="text-sm text-center text-gray-600">
        Mã xác thực OTP đã được gửi đến email <span className="font-medium text-gray-800">{email || 'của bạn'}</span>.
      </p>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {resendSuccess && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
          Mã xác thực mới đã được gửi thành công!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Mã xác thực (OTP)</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 text-center text-lg tracking-widest border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="123456"
            maxLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Xác thực'}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm pt-2">
        <button
          type="button"
          onClick={handleResendCode}
          className="text-blue-600 hover:underline focus:outline-none"
        >
          Gửi lại mã OTP
        </button>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-gray-600 hover:underline focus:outline-none"
        >
          Quay lại Đăng nhập
        </button>
      </div>
    </div>
  );
};