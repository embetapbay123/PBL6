import type {RouteObject} from 'react-router-dom';
import {ProtectedRoute,OwnerLanding} from '../../bootstrap/components';
export const adminRoutes:RouteObject[]=[{path:'/admin/*',element:<ProtectedRoute roles={['ADMIN']}><OwnerLanding owner="Trí" feature="Admin Web"/></ProtectedRoute>}];
