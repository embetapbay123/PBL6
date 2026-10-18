import React, { useState } from 'react';

export const ProfilePage: React.FC = () => {
  const [fullName, setFullName] = useState('Hatsaphone Thilavong');
  const [email] = useState('customer1@pbl6.test');
  const [phone, setPhone] = useState('0901234567');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Thông tin cá nhân (Profile)</h1>

      {isSaved && (
        <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg">
          Cập nhật thông tin thành công!
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border rounded-md p-2 bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
        >
          Lưu thay đổi
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;