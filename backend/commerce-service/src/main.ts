process.env.SERVICE_ID = 'M2';
import { bootstrap } from '../../shared/src/bootstrap';
import { CartController } from './cart/cart.controller';
import { VoucherController } from './voucher/voucher.controller';
import { ReportController } from './report/report.controller';
import { OrderController } from './order/order.controller';
import { CartSkeletonController } from './cart/cart.skeleton.controller';
import { OrderSkeletonController } from './order/order.skeleton.controller';
import { VoucherSkeletonController } from './voucher/voucher.skeleton.controller';
import { PaymentSkeletonController } from './payment/payment.skeleton.controller';
import { PaymentController } from './payment/payment.controller';
import { ReportSkeletonController } from './report/report.skeleton.controller';
import { SePayController } from './payment/sepay.controller';
import { ReviewEligibilityInternalController } from './order/review-eligibility.internal.controller';

bootstrap('M2', [
  ReviewEligibilityInternalController,
  SePayController,
  CartController,
  VoucherController,
  ReportController,
  OrderController,
  CartSkeletonController,
  OrderSkeletonController,
  VoucherSkeletonController,
  PaymentSkeletonController,
  PaymentController,
  ReportSkeletonController,
]).catch(() => {
  console.error('Startup failed: check service configuration and dependencies.');
  process.exit(1);
});

