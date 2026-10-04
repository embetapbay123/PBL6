// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../shared/src/auth';

@Controller()
@UseGuards(AuthGuard)
export class VoucherSkeletonController {}
