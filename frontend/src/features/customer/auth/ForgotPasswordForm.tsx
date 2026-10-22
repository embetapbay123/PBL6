import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSentSuccess(false);

    if (!email) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    try {
      setLoading(true);
      // Gửi request yêu cầu đặt lại mật khẩu (Dev Fixture / API Call)
      setSentSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gửi yêu cầu thất bại. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Quên mật khẩu</h2>
      <p className="text-sm text-center text-gray-600">
        Nhập địa chỉ email của bạn để nhận hướng dẫn đặt lại mật khẩu.
      </p>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {sentSuccess && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
          Yêu cầu đã được gửi! Vui lòng kiểm tra hộp thư email của bạn.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="example@domain.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
        </button>
      </form>

      <div className="text-center text-sm pt-2">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 font-medium hover:underline focus:outline-none"
        >
          Quay lại Đăng nhập
        </button>
      </div>
    </div>
  );
};