import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/customer/orders" className="text-indigo-600 hover:underline mb-4 inline-block">
        &larr; Quay lại lịch sử đơn hàng
      </Link>
      <h1 className="text-2xl font-bold mb-4">Chi tiết đơn hàng: {id}</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Trạng thái: Đang giao hàng</h2>
        <p className="text-gray-600 mb-1">Ngày đặt hàng: 2026-10-10</p>
        <p className="text-gray-600">Địa chỉ giao hàng: 123 Đường ABC, Đà Nẵng</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-semibold mb-4">Danh sách sản phẩm</h3>
        <div className="border-b pb-2 mb-2 flex justify-between">
          <span>Sản phẩm mẫu A x 1</span>
          <span>150,000 ₫</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-4">
          <span>Tổng cộng</span>
          <span className="text-indigo-600">150,000 ₫</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;