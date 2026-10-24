import { useParams } from 'react-router-dom';
import { PaymentPanel } from './PaymentPanel';

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div role="alert">Thiếu mã đơn hàng.</div>;
  return (
    <main>
      <h1>Thanh toán đơn hàng</h1>
      <PaymentPanel orderId={id} />
    </main>
  );
}
