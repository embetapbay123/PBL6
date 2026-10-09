import { ContextInternalController } from './auth/context.internal.controller';
process.env.SERVICE_ID = 'M3';
import { bootstrap } from '../../shared/src/bootstrap';
import { AuthSkeletonController } from './auth/auth.skeleton.controller';
import { ProfileSkeletonController } from './profile/profile.skeleton.controller';
import { StoreSkeletonController } from './store/store.skeleton.controller';
import { StaffSkeletonController } from './staff/staff.skeleton.controller';
import { AdministrationSkeletonController } from './administration/administration.skeleton.controller';
import { AuthController } from './auth/auth.controller';
bootstrap('M3',[ContextInternalController,AuthController,AuthSkeletonController,ProfileSkeletonController,StoreSkeletonController,StaffSkeletonController,AdministrationSkeletonController]).catch((error: unknown)=>{
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`Startup failed: ${detail}`);
  process.exit(1);
});
