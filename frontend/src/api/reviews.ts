import { callOperation } from './operations'; 
import type { operations } from './generated.d.ts';

// 1. Lấy danh sách đánh giá của sản phẩm
export type ListProductReviewsResponse = operations["listProductReviews"]["responses"]["200"]["content"]["application/json"];
export type ListProductReviewsQuery = operations["listProductReviews"]["parameters"]["query"];

export async function listProductReviews(productId: string, query?: ListProductReviewsQuery): Promise<ListProductReviewsResponse> {
  return await callOperation('listProductReviews', { path: { id: productId }, query });
}

// 2. Viết đánh giá mới sau khi mua hàng
export type CreateReviewBody = operations["createReview"]["requestBody"]["content"]["application/json"];
export type CreateReviewResponse = operations["createReview"]["responses"]["201"]["content"]["application/json"];

export async function createProductReview(productId: string, body: CreateReviewBody): Promise<CreateReviewResponse> {
  return await callOperation('createReview', { path: { id: productId }, body });
}

// 3. Sửa đánh giá
export type UpdateReviewBody = operations["updateReview"]["requestBody"]["content"]["application/json"];
export type UpdateReviewResponse = operations["updateReview"]["responses"]["200"]["content"]["application/json"];

export async function updateProductReview(reviewId: string, body: UpdateReviewBody): Promise<UpdateReviewResponse> {
  return await callOperation('updateReview', { path: { id: reviewId }, body });
}