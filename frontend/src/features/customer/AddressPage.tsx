import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { callOperation } from '../../api/operations';

/* ------------------------------------------------------------------ */
/* Contract với backend (M3) - CHỈNH Ở ĐÂY nếu tên field khác thực tế  */
/* Checkout đã dùng GET /me/addresses nên path này đúng theo review.    */
/* ------------------------------------------------------------------ */
const ADDRESSES_PATH = '/me/addresses';


interface ApiAddress {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  city: string;
  is_default?: boolean;
}


interface Address {
  id: string;
  name: string;
  phone: string;
  detail: string;
  isDefault: boolean;
}

const fromApi = (a: ApiAddress): Address => ({
  id: a.id,
  name: a.recipient_name,
  phone: a.phone,
  detail: [a.line1, a.ward, a.district, a.city].filter(Boolean).join(', '),
  isDefault: Boolean(a.is_default),
});


const extractList = (data: unknown): ApiAddress[] => {
  if (Array.isArray(data)) return data as ApiAddress[];
  const items = (data as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as ApiAddress[]) : [];
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const describeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    return error.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
  }
  return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
};

export const AddressPage: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newLine1, setNewLine1] = useState('');
  const [newWard, setNewWard] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);


  const fetchAddresses = useCallback(async () => {
    const data = await callOperation('listAddresses', { query: { page: 1, size: 100 } });
    if (mounted.current) setAddresses(extractList(data).map(fromApi));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await fetchAddresses();
    } catch (error) {
      if (mounted.current) setLoadError(describeError(error));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchAddresses]);

  useEffect(() => {
    void load();
  }, [load]);

  
  const runMutation = async (mutate: () => Promise<unknown>): Promise<boolean> => {
    setActionError(null);
    try {
      await mutate();
    } catch (error) {
      if (mounted.current) setActionError(describeError(error));
      return false;
    }
    try {
      await fetchAddresses();
    } catch (error) {
      if (mounted.current) {
        setActionError(
          'Đã lưu nhưng không thể tải lại danh sách. ' + describeError(error),
        );
      }
    }
    return true;
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const phone = newPhone.trim();
    const line1 = newLine1.trim();
    const ward = newWard.trim();
    const district = newDistrict.trim();
    const city = newCity.trim();
    if (!line1 || !ward || !district || !city || !name || !phone || adding) return;

    setAdding(true);
    const ok = await runMutation(() =>
      callOperation('createAddress', {
        body: {
          recipient_name: name,
          phone,
          line1,
          ward,
          district,
          city,
          is_default: addresses.length === 0,
        },
      }),
    );
    if (mounted.current) {
      setAdding(false);
      // chỉ xóa form khi server nhận thành công
      if (ok) {
        setNewName('');
        setNewPhone('');
        setNewLine1('');
        setNewWard('');
        setNewDistrict('');
        setNewCity('');
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    await runMutation(() =>
      callOperation('updateAddress', {
        path: { id },
        body: { is_default: true },
      }),
    );
    if (mounted.current) setBusyId(null);
  };

  const handleDelete = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    await runMutation(() => callOperation('deleteAddress', { path: { id } }));
    if (mounted.current) setBusyId(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl" role="status">
        <p className="text-sm text-gray-600">Đang tải sổ địa chỉ...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div role="alert" className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex gap-4 mb-6 border-b pb-3">
        <Link to="/customer/profile" className="text-gray-500 hover:text-gray-900 pb-1">
          Thông tin cá nhân
        </Link>
        <Link to="/customer/addresses" className="font-semibold text-emerald-600 border-b-2 border-emerald-600 pb-1">
          Sổ địa chỉ nhận hàng
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Sổ địa chỉ nhận hàng (Addresses)</h1>

      {actionError && (
        <div role="alert" className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Form thêm địa chỉ mới */}
      <form onSubmit={handleAddAddress} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Thêm địa chỉ mới</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="addr-name" className="block text-sm font-medium text-gray-700 mb-1">
              Tên người nhận
            </label>
            <input
              id="addr-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div>
            <label htmlFor="addr-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              id="addr-phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="090XXXXXXX"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="addr-line1" className="block text-sm font-medium text-gray-700 mb-1">
            Số nhà, tên đường
          </label>
          <input
            id="addr-line1"
            type="text"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            className="w-full border rounded-md p-2"
            placeholder="123 Đường ABC"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="addr-ward" className="block text-sm font-medium text-gray-700 mb-1">
              Phường/xã
            </label>
            <input
              id="addr-ward"
              type="text"
              value={newWard}
              onChange={(e) => setNewWard(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="Hòa Khánh"
              required
            />
          </div>
          <div>
            <label htmlFor="addr-district" className="block text-sm font-medium text-gray-700 mb-1">
              Quận/huyện
            </label>
            <input
              id="addr-district"
              type="text"
              value={newDistrict}
              onChange={(e) => setNewDistrict(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="Liên Chiểu"
              required
            />
          </div>
          <div>
            <label htmlFor="addr-city" className="block text-sm font-medium text-gray-700 mb-1">
              Tỉnh/thành phố
            </label>
            <input
              id="addr-city"
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="Đà Nẵng"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {adding ? 'Đang thêm...' : 'Thêm địa chỉ'}
        </button>
      </form>

      {/* Danh sách địa chỉ */}
      <div className="space-y-4">
        {addresses.length === 0 && (
          <p className="text-sm text-gray-600">
            Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ nhận hàng ở form phía trên.
          </p>
        )}
        {addresses.map((addr) => {
          const busy = busyId === addr.id;
          return (
            <div
              key={addr.id}
              className="bg-white shadow rounded-lg p-6 flex justify-between items-start"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{addr.name}</span>
                  <span className="text-gray-500 text-sm">({addr.phone})</span>
                  {addr.isDefault && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">{addr.detail}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr.id)}
                    disabled={busyId !== null}
                    className="text-indigo-600 hover:underline text-right disabled:opacity-50"
                  >
                    {busy ? 'Đang xử lý...' : 'Thiết lập mặc định'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(addr.id)}
                  disabled={busyId !== null}
                  className="text-red-600 hover:underline text-right disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AddressPage;
