# Đánh giá sau mua — M1

Các handler tạo, sửa, liệt kê công khai, liệt kê Admin, ẩn và hiện lại đánh giá dùng PostgreSQL. Mỗi OrderItem có tối đa một đánh giá; tạo lại cùng nội dung trả bản ghi cũ, nội dung khác trả 409.

M1 gọi VerifyReviewEligibility của M2 để kiểm tra OrderItem thuộc người mua và Order đã COMPLETED. Khi không truyền product_id, M2 trả mã Product chuẩn của mục đã mua; client không cần cung cấp mã này. Triển khai M2 với contract mới trước M1. Compose đã thêm COMMERCE_URL=http://m2:3102; triển khai ngoài Compose phải cấu hình URL tương ứng.

Sửa nội dung kiểm tra lại ownership, eligibility và expected_version; không bỏ quyết định HIDDEN. Admin cần platform.admin, lý do không trống và version hiện hành. Mỗi thay đổi ghi review_audit và m1_audit cùng transaction. API công khai chỉ đọc Review VISIBLE của Product ACTIVE/VISIBLE thuộc Store active; không trả danh tính người mua.

Kiểm thử: backend/tests/unit/reviews.test.ts, backend/tests/integration/reviews.test.ts, frontend/tests/reviews.spec.ts, frontend/tests/admin-catalog.spec.ts. Xem [bằng chứng nghiệm thu](../../../../docs/implementation/frontend-verification-handoff.md) để phân biệt HTTP thật và fixture trình duyệt.
