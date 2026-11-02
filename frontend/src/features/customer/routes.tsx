import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { MarketplaceHome } from './MarketplaceHome';
import { StorePage } from './StorePage';
import { FavoritesPage } from './FavoritesPage';
import { storeApplicationCustomerRoutes } from './StoreApplicationPage';
import { OwnerLanding, ProtectedRoute } from '../../bootstrap/components';
const ProductDetail=lazy(()=>import('./ProductDetail').then(module=>({default:module.ProductDetail})));
const CartPage=lazy(()=>import('./CartPage').then(module=>({default:module.CartPage})));
const CheckoutPage=lazy(()=>import('./CheckoutPage').then(module=>({default:module.CheckoutPage})));
const PaymentPage=lazy(()=>import('./PaymentPage').then(module=>({default:module.PaymentPage})));
const ProfilePage=lazy(()=>import('./ProfilePage').then(module=>({default:module.ProfilePage})));
const AddressPage=lazy(()=>import('./AddressPage').then(module=>({default:module.AddressPage})));
const InvitationsPage=lazy(()=>import('./InvitationsPage').then(module=>({default:module.InvitationsPage})));
const OrderHistoryPage=lazy(()=>import('./OrderHistoryPage').then(module=>({default:module.OrderHistoryPage})));
const OrderDetailPage=lazy(()=>import('./OrderDetailPage').then(module=>({default:module.OrderDetailPage})));
const CustomerHubPage=lazy(()=>import('./CustomerHubPage').then(module=>({default:module.CustomerHubPage})));
const MessagesPage=lazy(()=>import('./MessagesPage').then(module=>({default:module.MessagesPage})));
const NotificationsPage=lazy(()=>import('./NotificationsPage').then(module=>({default:module.NotificationsPage})));
const ReturnsPage=lazy(()=>import('../returns/ReturnsPage').then(module=>({default:module.ReturnsPage})));
const OwnReviewsPage=lazy(()=>import('./OwnReviewsPage').then(module=>({default:module.OwnReviewsPage})));

export const customerRoutes: RouteObject[] = [
  { path: '/', element: <MarketplaceHome /> },
  { path: '/products/:id', element: <ProductDetail /> },
  { path: '/stores/:id', element: <StorePage /> },
  { path: '/cart', element: <ProtectedRoute roles={['CUSTOMER']}><CartPage /></ProtectedRoute> },
  { path: '/checkout', element: <ProtectedRoute roles={['CUSTOMER']}><CheckoutPage /></ProtectedRoute> },
  { path: '/orders/:id/pay', element: <ProtectedRoute roles={['CUSTOMER']}><PaymentPage /></ProtectedRoute> },
  { path: '/customer/profile', element: <ProtectedRoute roles={['CUSTOMER']}><ProfilePage /></ProtectedRoute> },
  { path: '/customer/favorites', element: <ProtectedRoute roles={['CUSTOMER']}><FavoritesPage /></ProtectedRoute> },
  { path: '/customer/reviews', element: <ProtectedRoute roles={['CUSTOMER']}><OwnReviewsPage /></ProtectedRoute> },
  { path: '/customer/messages/:id?', element: <ProtectedRoute roles={['CUSTOMER']}><MessagesPage scope="CUSTOMER"/></ProtectedRoute> },
  { path: '/customer/notifications', element: <ProtectedRoute roles={['CUSTOMER']}><NotificationsPage/></ProtectedRoute> },
  { path: '/customer/returns', element: <ProtectedRoute roles={['CUSTOMER']}><ReturnsPage scope="CUSTOMER"/></ProtectedRoute> },
  { path: '/customer/addresses', element: <ProtectedRoute roles={['CUSTOMER']}><AddressPage /></ProtectedRoute> },
  ...storeApplicationCustomerRoutes,
  { path: '/customer/invitations', element: <ProtectedRoute roles={['CUSTOMER']}><InvitationsPage /></ProtectedRoute> },
  { path: '/customer/settings', element: <ProtectedRoute roles={['CUSTOMER']}><CustomerHubPage /></ProtectedRoute> },
  {path:'/customer/orders',element:<ProtectedRoute roles={['CUSTOMER']}><OrderHistoryPage/></ProtectedRoute>},
  {path:'/customer/orders/:id',element:<ProtectedRoute roles={['CUSTOMER']}><OrderDetailPage/></ProtectedRoute>},
  { path: '/customer/*', element: <OwnerLanding owner="Hatsaphone" feature="User Web" /> },
];
