// GENERATED request aliases from the public contract; add runtime DTO validators when implementing.
import type { components } from '../../../shared/src/contracts.generated';
export type QuoteCheckoutRequest = components['schemas']['CheckoutRequest'];
export type ConfirmCheckoutRequest = components['schemas']['CheckoutConfirmRequest'];
export type GetPurchaseGroupOrdersRequest = Record<string, never>;
export type ListOwnOrdersRequest = Record<string, never>;
export type GetOwnOrderRequest = Record<string, never>;
export type CancelOwnOrderRequest = components['schemas']['CancelOrder'];
export type ListStoreOrdersRequest = Record<string, never>;
export type GetStoreOrderRequest = Record<string, never>;
export type TransitionStoreOrderRequest = components['schemas']['OrderTransition'];
export type CancelStoreOrderRequest = components['schemas']['CancelOrder'];
export type CollectCodRequest = components['schemas']['CODCollection'];
