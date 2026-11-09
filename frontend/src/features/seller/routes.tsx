import type {RouteObject} from 'react-router-dom';
import {lazy} from 'react';
import {ProtectedRoute,OwnerLanding} from '../../bootstrap/components';
const ProductEdit=lazy(()=>import('../../bootstrap/ProductEdit').then(module=>({default:module.ProductEdit})));
const ProductCreatePage=lazy(()=>import('./ProductCreatePage').then(module=>({default:module.ProductCreatePage})));
const StaffPage=lazy(()=>import('./StaffPage').then(module=>({default:module.StaffPage})));
const SellerProductList=lazy(()=>import('./ProductList').then(module=>({default:module.SellerProductList})));
const SellerOverview=lazy(()=>import('../../live/SellerWorkspace').then(module=>({default:module.SellerOverview})));
const StoreSettings=lazy(()=>import('../../live/SellerWorkspace').then(module=>({default:module.StoreSettings})));
const StoreInventory=lazy(()=>import('../../live/SellerWorkspace').then(module=>({default:module.StoreInventory})));
const StoreOrders=lazy(()=>import('../../live/SellerWorkspace').then(module=>({default:module.StoreOrders})));
const ShippingQueue=lazy(()=>import('../shipping/ShippingAdmin').then(module=>({default:module.ShippingQueue})));
const StoreReports=lazy(()=>import('../../live/SellerWorkspace').then(module=>({default:module.StoreReports})));
const VoucherPanel=lazy(()=>import('../../live/VoucherPanel').then(module=>({default:module.VoucherPanel})));
const MessagesPage=lazy(()=>import('../customer/MessagesPage').then(module=>({default:module.MessagesPage})));
const ReturnsPage=lazy(()=>import('../returns/ReturnsPage').then(module=>({default:module.ReturnsPage})));
const DeliveryReturnsPage=lazy(()=>import('../returns/DeliveryReturnsPage').then(module=>({default:module.DeliveryReturnsPage})));
const StoreAuditPage=lazy(()=>import('./StoreAuditPage').then(module=>({default:module.StoreAuditPage})));
export const sellerRoutes:RouteObject[]=[
  {path:'/seller',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><SellerOverview/></ProtectedRoute>},
  {path:'/seller/settings',element:<ProtectedRoute roles={['STORE_OWNER']}><StoreSettings/></ProtectedRoute>},
  {path:'/seller/inventory',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><StoreInventory/></ProtectedRoute>},
  {path:'/seller/orders',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><StoreOrders/></ProtectedRoute>},
  {path:'/seller/shipping',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ShippingQueue/></ProtectedRoute>},
  {path:'/seller/messages/:id?',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><MessagesPage scope="STORE"/></ProtectedRoute>},
  {path:'/seller/delivery-returns',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><DeliveryReturnsPage/></ProtectedRoute>},
  {path:'/seller/returns',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ReturnsPage scope="STORE"/></ProtectedRoute>},
  {path:'/seller/returns/:id',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ReturnsPage scope="STORE"/></ProtectedRoute>},
  {path:'/seller/reports',element:<ProtectedRoute roles={['STORE_OWNER']}><StoreReports/></ProtectedRoute>},
  {path:'/seller/vouchers',element:<ProtectedRoute roles={['STORE_OWNER']}><VoucherPanel scope="STORE"/></ProtectedRoute>},
  {path:'/seller/products',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><SellerProductList/></ProtectedRoute>},
  {path:'/seller/products/new',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ProductCreatePage/></ProtectedRoute>},
  {path:'/seller/products/:id/edit',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ProductEdit/></ProtectedRoute>},
  {path:'/seller/audit',element:<ProtectedRoute roles={['STORE_OWNER']}><StoreAuditPage/></ProtectedRoute>},
  {path:'/seller/staff',element:<ProtectedRoute roles={['STORE_OWNER']}><StaffPage/></ProtectedRoute>},
  {path:'/seller/*',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><OwnerLanding owner="Thịnh" feature="Seller Web"/></ProtectedRoute>}];
