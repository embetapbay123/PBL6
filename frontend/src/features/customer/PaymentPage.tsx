import { Link, useParams } from "react-router-dom";
import { PaymentPanel } from "./PaymentPanel";

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div role="alert">Thiếu mã đơn hàng.</div>;
  return (
    <main className="container mx-auto px-4 py-8 max-w-xl">
      <nav className="ui-actions mb-6" aria-label="Điều hướng thanh toán">
        <Link to={`/customer/orders/${id}`}>
          &larr; Xem chi tiết đơn #{id.slice(-8).toUpperCase()}
        </Link>
        <Link to="/customer/orders">Đơn hàng của tôi</Link>
      </nav>
      <h1 className="text-2xl font-bold mb-4">
        Thanh toán đơn #{id.slice(-8).toUpperCase()}
      </h1>
      <p className="mb-4">
        Mở ứng dụng ngân hàng để quét mã QR hoặc dùng đúng nội dung chuyển khoản
        bên dưới. Kiểm tra số tiền và thông tin người nhận trong ứng dụng trước
        khi xác nhận. Kết quả sẽ được cập nhật tại đây.
      </p>
      <PaymentPanel orderId={id} />
    </main>
  );
}
