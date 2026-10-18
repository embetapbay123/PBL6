import React, { useState } from 'react';

interface Address {
  id: string;
  name: string;
  phone: string;
  detail: string;
  isDefault: boolean;
}

export const AddressPage: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: 'ADDR-01',
      name: 'Hatsaphone',
      phone: '0901234567',
      detail: '123 Đường ABC, Phường Hòa Khánh, Quận Liên Chiểu, Đà Nẵng',
      isDefault: true,
    },
  ]);

  const [newDetail, setNewDetail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetail || !newName || !newPhone) return;

    const newAddr: Address = {
      id: `ADDR-${Date.now()}`,
      name: newName,
      phone: newPhone,
      detail: newDetail,
      isDefault: addresses.length === 0,
    };

    setAddresses([...addresses, newAddr]);
    setNewName('');
    setNewPhone('');
    setNewDetail('');
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter((addr) => addr.id !== id));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Sổ địa chỉ nhận hàng (Addresses)</h1>

      {/* Form thêm địa chỉ mới */}
      <form onSubmit={handleAddAddress} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Thêm địa chỉ mới</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên người nhận</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border rounded-md p-2"
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
          <input
            type="text"
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            className="w-full border rounded-md p-2"
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Thêm địa chỉ
        </button>
      </form>

      {/* Danh sách địa chỉ */}
      <div className="space-y-4">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white shadow rounded-lg p-6 flex justify-between items-start">
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
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-indigo-600 hover:underline text-right"
                >
                  Thiết lập mặc định
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-red-600 hover:underline text-right"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddressPage;