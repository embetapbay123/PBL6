import type {RouteObject} from 'react-router-dom';
import {ProtectedRoute,OwnerLanding} from '../../bootstrap/components';
import {ProductEdit} from '../../bootstrap/ProductEdit';
export const sellerRoutes:RouteObject[]=[{path:'/seller/products/:id/edit',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><ProductEdit/></ProtectedRoute>},{path:'/seller/*',element:<ProtectedRoute roles={['SELLER','STORE_OWNER']}><OwnerLanding owner="Thịnh" feature="Seller Web"/></ProtectedRoute>}];
