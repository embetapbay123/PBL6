// GENERATED request aliases from the public contract; add runtime DTO validators when implementing.
import type { components } from '../../../shared/src/contracts.generated';
export type ListProductReviewsRequest = Record<string, never>;
export type CreateReviewRequest = components['schemas']['ReviewCreate'];
export type UpdateReviewRequest = components['schemas']['ReviewUpdate'];
export type HideReviewRequest = components['schemas']['ModerationAction'];
export type RestoreReviewRequest = components['schemas']['ModerationAction'];
