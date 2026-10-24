import React, { useState } from 'react';

export interface Invitation {
  id: string;
  storeName: string;
  role: string;
  invitedAt: string;
}

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations?: Invitation[];
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  invitations = [],
  onAccept,
  onReject,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    if (onAccept) await onAccept(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    if (onReject) await onReject(id);
    setProcessingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-bold text-gray-800">
            Lời mời tham gia cửa hàng (Store Invitations)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl"
          >
            &times;
          </button>
        </div>

        {invitations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            Bạn chưa có lời mời tham gia cửa hàng nào.
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {invitations.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 rounded-lg flex items-center justify-between bg-gray-50"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">{item.storeName}</h4>
                  <p className="text-sm text-gray-600">Vai trò: <span className="font-medium">{item.role}</span></p>
                  <p className="text-xs text-gray-400 mt-1">Ngày mời: {item.invitedAt}</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAccept(item.id)}
                    disabled={processingId === item.id}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                  >
                    Chấp nhận
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processingId === item.id}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationsModal;