# Thiết kế AI 2.1 Draft

Kế hoạch dataset, baseline, metric và mẫu báo cáo kết quả ở [AI evaluation](ai-evaluation.md). Tài liệu này mô tả luồng dữ liệu và hành vi phục vụ; chưa có kết quả kiểm thử thực tế.

## Chatbot RAG

M1 phát ProductChanged với version sau khi Product/Variant/giá/trạng thái được lưu. M4 xây lại embedding bất đồng bộ và lưu `product_id, source_version, updated_at, status`. Query người dùng tạo query embedding, tìm Top-K context, kiểm tra lại Product còn hiển thị/Store active và giá hiện hành qua M1, sau đó chỉ gửi dữ liệu cần thiết đến LLM. Card sản phẩm lấy ID/giá từ dữ liệu đã kiểm tra; nếu index trễ hoặc M1 không xác minh được, loại card đó. Thiếu context thì hỏi thêm tiêu chí. Nội dung Product được coi là dữ liệu, không phải lệnh thay System Prompt.

Chat nhiều lượt lưu ChatSession/Message theo User khi đăng nhập hoặc anonymous key phiên Guest. Customer chỉ xem lịch sử mình. Không ghi password, JWT, API key, địa chỉ/điện thoại không cần thiết vào prompt/log. Giới hạn số lượt, độ dài input và rate theo User/IP trong cấu hình demo. Metric: latency đến câu trả lời hoàn chỉnh, groundedness, relevance, hallucination rate và lỗi retrieval/LLM, có tập câu hỏi/nhãn và kết quả đo riêng.

## Recommendation

Luồng baseline: Product liên quan dựa Category, ProductType, gần giá, cùng Store; “Dành cho bạn” từ search, view, cart và purchase khi có consent cá nhân hóa. Event có ID chống trùng, timestamp và product_id xác thực; trước khi ghi event của User phải loại secret/PII và kiểm consent. Implicit interaction dataset chứa user_id, product_id, event_type, weight, occurred_at; weight được version hóa trong cấu hình huấn luyện. Search chỉ chuyển thành tín hiệu product khi có click/impression gắn product, không gán mọi kết quả của một truy vấn cho User. `GET /recommendations/for-you` trả thêm `recently_viewed_product_ids` theo event view mới nhất sau khi lọc Product/Store hiện hành; thiếu hoặc rút consent thì mảng này rỗng và serving chỉ dùng gợi ý chung.

Huấn luyện offline tối thiểu một CF/Matrix Factorization từ implicit feedback. Model artifact và version chỉ được đưa vào serving sau khi có cấu hình/dataset/evaluation tương ứng. Nếu model chưa có, User/model cold-start hoặc serving lỗi, fallback về baseline rồi sản phẩm bán chạy/mới nhất. Product ẩn, hết trạng thái bán hoặc Store bị khóa bị loại trước khi trả danh sách. Cách chia tập, metric và tiêu chí so baseline được quản lý ở [AI evaluation](ai-evaluation.md).

Ngưỡng nghiệm thu và phương pháp chia dữ liệu được ghi duy nhất ở [AI evaluation](ai-evaluation.md), để thiết kế và kết quả không lệch nhau.
