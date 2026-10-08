import type { RouteObject } from 'react-router-dom';
import { ProductsSample } from './ProductsSample';
import { ProductDetail } from './ProductDetail'; // Import เพิ่มตรงนี้
import { OwnerLanding } from '../../bootstrap/components';

export const customerRoutes: RouteObject[] = [
  { path: '/', element: <ProductsSample /> },
  { path: 'products/:id', element: <ProductDetail /> }, // เพิ่มต่อตรงนี้
  { path: '/customer/*', element: <OwnerLanding owner="Hatsaphone" feature="User Web" /> }
];