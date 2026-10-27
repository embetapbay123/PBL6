import type {RouteObject} from 'react-router-dom';
import {ProtectedRoute,OwnerLanding} from '../../bootstrap/components';
import {ProductEdit} from '../../bootstrap/ProductEdit';
import {ProductCreate} from '../../bootstrap/ProductCreate';
import {StaffPage} from './StaffPage';
import {SellerProductList} from './ProductList';
import {SellerOverview,StoreSettings,StoreInventory,StoreOrders,StoreReports} from '../../live/SellerWorkspace';
import {VoucherPanel} from '../../live/VoucherPanel';
export const sellerRoutes:RouteObject[]=[
  {path:'/seller',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><SellerOverview/></ProtectedRoute>},
  {path:'/seller/settings',element:<ProtectedRoute roles={['STORE_OWNER']}><StoreSettings/></ProtectedRoute>},
  {path:'/seller/inventory',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><StoreInventory/></ProtectedRoute>},
  {path:'/seller/orders',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><StoreOrders/></ProtectedRoute>},
  {path:'/seller/reports',element:<ProtectedRoute roles={['STORE_OWNER']}><StoreReports/></ProtectedRoute>},
  {path:'/seller/vouchers',element:<ProtectedRoute roles={['STORE_OWNER']}><VoucherPanel scope="STORE"/></ProtectedRoute>},
  {path:'/seller/products',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><SellerProductList/></ProtectedRoute>},
  {path:'/seller/products/new',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ProductCreate/></ProtectedRoute>},
  {path:'/seller/products/:id/edit',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ProductEdit/></ProtectedRoute>},
  {path:'/seller/staff',element:<ProtectedRoute roles={['STORE_OWNER']}><StaffPage/></ProtectedRoute>},
  {path:'/seller/*',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><OwnerLanding owner="Thịnh" feature="Seller Web"/></ProtectedRoute>}];
