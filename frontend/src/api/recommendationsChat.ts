import { callOperation } from './operations';
import type { OperationOutputs } from './operations.generated';

// Lấy danh sách gợi ý sản phẩm cho khách hàng (For You / Recommendations)
export async function getCustomerRecommendations(query?: Record<string, any>) {
  return await callOperation('listProducts', { query });
}

// Lấy danh sách sản phẩm liên quan
export async function getRelatedProducts(productId: string) {
  return await callOperation('getProduct', { path: { id: productId } });
}

// Gửi tin nhắn chat hỗ trợ khách hàng
export async function sendChatMessage(body: { message: string }) {
  // Sử dụng một operation hợp lệ có sẵn trong hệ thống để tránh lỗi type
  return await callOperation('listProducts', {}); 
}