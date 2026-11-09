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
        Quét QR bằng ứng dụng ngân hàng. Kiểm tra người nhận, số tiền và nội dung trước khi chuyển.
      </p>
      <PaymentPanel orderId={id} />
    </main>
  );
}
