import type { RouteObject } from 'react-router-dom';
import { ProductsSample } from './ProductsSample';
import { ProductDetail } from './ProductDetail';
import { CartPage } from './CartPage';
import { CheckoutPage } from './CheckoutPage';
import { OrderHistoryPage } from './OrderHistoryPage';
import { OrderDetailPage } from './OrderDetailPage';
import { ProfilePage } from './ProfilePage';
import { AddressPage } from './AddressPage';
import { storeApplicationCustomerRoutes } from './StoreApplicationPage';
import { OwnerLanding, ProtectedRoute } from '../../bootstrap/components';

export const customerRoutes: RouteObject[] = [
  { path: '/', element: <ProductsSample /> },
  { path: '/products/:id', element: <ProductDetail /> },
  { path: '/cart', element: <ProtectedRoute roles={['CUSTOMER']}><CartPage /></ProtectedRoute> },
  { path: '/checkout', element: <ProtectedRoute roles={['CUSTOMER']}><CheckoutPage /></ProtectedRoute> },
  { path: '/customer/orders', element: <ProtectedRoute roles={['CUSTOMER']}><OrderHistoryPage /></ProtectedRoute> },
  { path: '/customer/orders/:id', element: <ProtectedRoute roles={['CUSTOMER']}><OrderDetailPage /></ProtectedRoute> },
  { path: '/customer/profile', element: <ProtectedRoute roles={['CUSTOMER']}><ProfilePage /></ProtectedRoute> },
  { path: '/customer/addresses', element: <ProtectedRoute roles={['CUSTOMER']}><AddressPage /></ProtectedRoute> },
  ...storeApplicationCustomerRoutes,
  { path: '/customer/*', element: <OwnerLanding owner="Hatsaphone" feature="User Web" /> },
];