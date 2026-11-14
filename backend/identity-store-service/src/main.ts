import {AuditActorsController} from './administration/audit-actors.controller';
import {storeAuditController} from '../../shared/src/store-audit';
import { auditLogController } from '../../shared/src/audit-log';
import { ContextInternalController } from './auth/context.internal.controller';
process.env.SERVICE_ID = 'M3';
import { bootstrap } from '../../shared/src/bootstrap';
import { AuthSkeletonController } from './auth/auth.skeleton.controller';
import { ProfileSkeletonController } from './profile/profile.skeleton.controller';
import { StoreInternalController, StoreSkeletonController } from './store/store.skeleton.controller';
import { StaffSkeletonController } from './staff/staff.skeleton.controller';
import { AdministrationSkeletonController } from './administration/administration.skeleton.controller';
import { AuthController } from './auth/auth.controller';
import { MessagingController } from './messaging/messaging.controller';
import { OwnChatMediaController,StoreChatMediaController } from './messaging/media.controller';
bootstrap('M3',[auditLogController('M3'),storeAuditController('M3'),AuditActorsController,MessagingController,OwnChatMediaController,StoreChatMediaController,ContextInternalController,AuthController,AuthSkeletonController,ProfileSkeletonController,StoreSkeletonController,StoreInternalController,StaffSkeletonController,AdministrationSkeletonController]).catch((error: unknown)=>{
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`Startup failed: ${detail}`);
  process.exit(1);
});
