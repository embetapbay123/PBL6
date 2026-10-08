// All auth operations are implemented in AuthController; keeping empty skeleton controller to avoid breaking bootstrap imports.
import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../shared/src/auth';
@Controller() @UseGuards(AuthGuard)
export class AuthSkeletonController {}

