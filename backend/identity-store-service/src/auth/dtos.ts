// GENERATED request aliases from the public contract; add runtime DTO validators when implementing.
import type { components } from '../../../shared/src/contracts.generated';
export type RegisterRequest = components['schemas']['RegisterRequest'];
export type VerifyEmailRequest = components['schemas']['EmailVerificationConfirm'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type RefreshRequest = components['schemas']['RefreshRequest'];
export type LogoutRequest = Record<string, never>;
export type ResetPasswordRequest = components['schemas']['PasswordResetRequest'];
export type ConfirmResetPasswordRequest = components['schemas']['PasswordResetConfirm'];
export type ChangePasswordRequest = components['schemas']['PasswordChange'];
