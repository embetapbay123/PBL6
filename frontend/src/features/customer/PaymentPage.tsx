import { Link, useParams } from 'react-router-dom';
import { PaymentPanel } from './PaymentPanel';

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div role="alert">Thiếu mã đơn hàng.</div>;
  return (
    <main className="container mx-auto px-4 py-8 max-w-xl">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link to={`/customer/orders/${id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
          &larr; Xem chi tiết đơn #{id}
        </Link>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <Link to="/customer/orders" style={{ color: '#4b5563', textDecoration: 'underline' }}>
          Đơn hàng của tôi
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Thanh toán đơn hàng #{id}</h1>
      <PaymentPanel orderId={id} />
    </main>
  );
}
