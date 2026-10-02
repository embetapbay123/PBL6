process.env.SERVICE_ID = 'M1';
import { bootstrap } from '../../shared/src/bootstrap';
import { CatalogSkeletonController } from './catalog/catalog.skeleton.controller';
import { InventorySkeletonController } from './inventory/inventory.skeleton.controller';
import { ReviewSkeletonController } from './review/review.skeleton.controller';
import { ModerationSkeletonController } from './moderation/moderation.skeleton.controller';
import { CatalogController } from './catalog/catalog.controller';
import { InventoryInternalController } from './inventory/inventory.internal.controller';
bootstrap('M1',[InventoryInternalController,CatalogController,CatalogSkeletonController,InventorySkeletonController,ReviewSkeletonController,ModerationSkeletonController]).catch(()=>{ console.error('Startup failed: check service configuration and dependencies.'); process.exit(1); });
