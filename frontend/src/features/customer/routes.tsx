import type {RouteObject} from 'react-router-dom';
import {ProductsSample} from './ProductsSample';
import {OwnerLanding} from '../../bootstrap/components';
import {storeApplicationCustomerRoutes} from './StoreApplicationPage';
export const customerRoutes:RouteObject[]=[{path:'/',element:<ProductsSample/>},...storeApplicationCustomerRoutes,{path:'/customer/*',element:<OwnerLanding owner="Hatsaphone" feature="User Web"/>}];
