import type {RouteObject} from 'react-router-dom';
import {ProductsSample} from './ProductsSample';
import {OwnerLanding} from '../../bootstrap/components';
export const customerRoutes:RouteObject[]=[{path:'/',element:<ProductsSample/>},{path:'/customer/*',element:<OwnerLanding owner="Hatsaphone" feature="User Web"/>}];
