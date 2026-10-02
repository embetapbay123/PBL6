# Kế hoạch đánh giá AI — 2.1 Draft

**Trạng thái:** thiết kế kiểm thử, **chưa thực thi**. Tài liệu này quy định cách chứng minh chatbot RAG và recommendation đạt yêu cầu; không chứa kết quả đo giả. Thiết kế pipeline ở [AI design](ai-design.md), yêu cầu ở FR-AI-*, FR-REC-*, NFR-AI-01/02, các luồng ở [Use Case AI](use-cases.md#uc-chat-talk).

## 1. Dữ liệu và phiên bản

Mỗi run ghi `dataset_version`, khoảng thời gian thu thập, số User/Product/interaction sau lọc, tỷ lệ sparsity, consent policy, `catalog_snapshot_at`, commit/config huấn luyện, random seed, model version và thời điểm phục vụ. Chỉ dùng interaction của User đã đồng ý cá nhân hóa; event trùng được khử theo event_id. Search query chỉ trở thành tín hiệu Product khi có click/impression gắn Product cụ thể. Tách tập theo thời gian cho từng User; không lấy hành vi sau thời điểm test vào train hoặc candidate popularity.

| Tập | Mục đích | Quy tắc |
| --- | --- | --- |
| Train | Học preference/model, tính baseline popularity | Event trước mốc split |
| Validation | Chọn tham số/weight/điểm dừng | Sau train, trước test; không được dùng để báo kết quả cuối |
| Test | So sánh model và baseline | Event cuối theo thời gian, khóa trước khi chọn model |

Ghi rõ cách xử lý User/Product mới, event bị xóa do rút consent, Product đã ẩn và Store bị khóa. Candidate phải là Product công khai tại thời điểm phục vụ; khi đánh giá offline dùng cùng catalog snapshot cho các phương pháp để so sánh công bằng.

## 2. Recommendation

Chạy tối thiểu baseline Content/Behavioral và một model CF/Matrix Factorization trên **cùng test split và candidate set**. K=10. Báo `Precision@10`, `Recall@10`, `NDCG@10`, catalog coverage, số User đủ dữ liệu và tỷ lệ cold-start/fallback. Nêu rõ quy tắc tie-break và loại Product đã mua nếu kịch bản test yêu cầu. Tách metric cho User có lịch sử và cold-start; không gộp fallback vào điểm của model mà không ghi chú.

| Run | Dataset/version | Split/seed | Model | Baseline | P@10 | R@10 | NDCG@10 | Coverage | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chưa chạy | — | — | CF/MF dự kiến | Content/Behavioral | — | — | — | — | Chưa thực thi |

**Tiêu chí:** pipeline tạo được Top-K và lưu model artifact/version; có đủ metric và phép so sánh cùng split; ít nhất một trong P@10/R@10/NDCG@10 vượt baseline theo mục tiêu MVP. Nếu không đạt, báo kết quả thật và đánh dấu tiêu chí chưa đạt, không thay split sau khi xem test. Khi model lỗi, không có dữ liệu hoặc User chưa consent, kiểm chứng thứ tự fallback: baseline phù hợp → bán chạy/mới nhất; mọi Product card vẫn xác minh hiện hành với M1.

## 3. Chatbot RAG

Tạo bộ câu hỏi có nhãn gồm: nhu cầu có Product phù hợp, hỏi giá/thuộc tính, nhiều lượt có tham chiếu ngữ cảnh, Product vừa đổi giá/ẩn, Store bị khóa, thiếu dữ liệu và câu hỏi ngoài phạm vi. Với mỗi câu, lưu Product context được truy xuất, dữ liệu M1 xác minh tại thời điểm trả lời, output và đánh giá thủ công. Chấm riêng tỷ lệ card hợp lệ, groundedness, relevance, hallucination (giá/thông số/sản phẩm bịa) và latency hoàn chỉnh; ghi cách chấm, số người chấm và bất đồng nếu có. Không dùng vài câu demo làm kết luận chất lượng tổng thể.

## 4. Bằng chứng và báo cáo

Mỗi run cần file cấu hình, bản thống kê dataset không chứa PII, log phiên bản model/index, bảng metric, ví dụ pass/fail và lý do fallback. Kết quả test phải nối TC-AI-* trong [Test Plan](test-plan.md) và không được ghi PASS trước khi chạy. Product bị ẩn/đổi giá và User rút consent là các case bắt buộc. Không đưa password, JWT, API key, địa chỉ hoặc số điện thoại vào dataset đánh giá/prompt báo cáo.
