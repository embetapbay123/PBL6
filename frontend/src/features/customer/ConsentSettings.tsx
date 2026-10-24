import React, { useEffect, useState } from 'react';
import { 
  getPersonalizationConsent, 
  updatePersonalizationConsent, 
  type PersonalizationConsentView 
} from '../../api/consent';

export const ConsentSettings: React.FC = () => {
  const [consentData, setConsentData] = useState<PersonalizationConsentView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  // Tải trạng thái consent hiện tại khi component được mount
  useEffect(() => {
    fetchConsentStatus();
  }, []);

  const fetchConsentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPersonalizationConsent();
      setConsentData(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải trạng thái consent.');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay đổi trạng thái cấp quyền (Grant / Revoke)
  const handleToggleConsent = async () => {
    if (!consentData) return;

    const newStatus = consentData.status === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    
    try {
      setUpdating(true);
      setError(null);
      const updated = await updatePersonalizationConsent({
        status: newStatus,
        expected_version: consentData.version,
      });
      setConsentData(updated);
    } catch (err: any) {
      setError(err?.message || 'Cập nhật consent thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Đang tải cấu hình quyền riêng tư...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Cài đặt Quyền Cá Nhân Hóa (Personalization Consent)</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <div>
          <p className="font-medium text-gray-700">Cho phép sử dụng dữ liệu cá nhân hóa AI</p>
          <p className="text-sm text-gray-500">
            Trạng thái hiện tại: <span className="font-semibold">{consentData?.status}</span> 
            {consentData?.version ? ` (Phiên bản: ${consentData.version})` : ''}
          </p>
        </div>

        <button
          onClick={handleToggleConsent}
          disabled={updating}
          className={`px-4 py-2 rounded text-white font-medium transition-colors ${
            consentData?.status === 'GRANTED' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {updating 
            ? 'Đang xử lý...' 
            : consentData?.status === 'GRANTED' 
              ? 'Thu hồi (Revoke)' 
              : 'Cấp quyền (Grant)'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        * Theo yêu cầu của issue #71, việc thay đổi trạng thái này sẽ cập nhật trực tiếp qua API backend thực tế để phục vụ hệ thống AI.
      </p>
    </div>
  );
};

export default ConsentSettings;