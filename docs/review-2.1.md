# Biên bản tự kiểm bộ tài liệu 2.1 Draft

**Ngày:** 29/09/2026. **Phạm vi:** `docs/` hiện hành; `docs_old` và `docs/legacy` giữ nguyên. Đây là tự kiểm tài liệu thiết kế, chưa phải biên bản nghiệm thu sản phẩm.

## Đã hoàn thiện ở mức tài liệu

| Mục | Kết quả |
| --- | --- |
| Nền nghiệp vụ | SRS 2.1 đọc độc lập; scope/BR/state/RBAC theo ADR-23: Order trước thanh toán, một Order/Store, Payment riêng Order, không có entity Purchase/Checkout. |
| Use Case | Giữ 64 mã UC; thay nội dung CRUD mẫu bằng trigger, dữ liệu vào/ra, tiền/hậu điều kiện, luồng chính và ngoại lệ theo mục tiêu; 13 sơ đồ Use Case được nhúng vào đúng nhóm. 92 Story có GWT, FR/NFR dẫn đến tiêu chí TC riêng. Sơ đồ AI đã sửa để Owner xem metric trong phạm vi Store. |
| Thiết kế | 9 ERD được render/nhúng, từ điển dữ liệu thêm bảng nguồn sự thật; kiến trúc giải thích ranh giới M1–M4; 8 sequence, 2 activity và 6 state có nguồn/hình để đọc. |
| Contract | OpenAPI 2.1 giữ 96 operation trên 85 path, có tên tiếng Việt và 25 ví dụ request hợp schema; bỏ schema `Resource` chung khỏi request/response, thêm auth/scope, page typed và schema miền. Body tạo mới/PATCH được tách riêng; các thao tác cạnh tranh yêu cầu `expected_version`. API spec có ví dụ và danh mục lỗi; integration contract có envelope/retry/đối soát. |
| Chất lượng | 98 FR và 28 NFR có dòng trace và TC Given–When–Then riêng; 47 kịch bản TC nhóm cùng 126 TC theo yêu cầu đều chưa thực thi; security/privacy, AI evaluation, UI flow và checklist demo đã tách/rà. |

## Kiểm tra tĩnh đã chạy

- `python scripts/check_docs.py`: 57 Markdown, 98 FR, 28 NFR, 92 US, 64 UC, 41 BR, 47 TC nhóm và 96 API; không có lỗi link, ảnh hoặc mã định danh.
- `node scripts/check_openapi.mjs`: OpenAPI 2.1.0-draft hợp lệ, 85 path.
- 25 ví dụ request trong OpenAPI được đối chiếu bằng JSON Schema; không có ví dụ sai schema.
- 64 đặc tả UC được kiểm tra có actor, trigger, điều kiện, dữ liệu, mã liên quan, luồng chính đánh số và ngoại lệ gắn bước.
- `node scripts/check_diagrams.mjs`: parse 9 Mermaid ERD.
- PlantUML `-checkonly`: 39 sơ đồ Use Case/Sequence/Activity/State, kể cả bản kỹ thuật, hợp lệ.
- 38 SVG Use Case/ERD/Sequence/Activity/State đều là XML hợp lệ và đã có liên kết/nhúng trong trang liên quan.

## Chưa thể xác nhận bằng tài liệu

1. Chưa có backend/migration chạy cùng bộ contract này, nên chưa chứng minh DB constraint, API response, callback và worker hoạt động như thiết kế.
2. Chưa có run kiểm thử, load test, dataset/model evaluation hoặc demo; mọi TC và metric AI giữ **chưa thực thi**. Không nâng Draft lên Approved chỉ vì kiểm tra cú pháp qua.
3. Owner/reviewer theo [project plan](project-plan.md) cần rà nội dung UC–ERD–API từng miền và ký xác nhận; các phân công hiện là đề xuất, chưa có deadline.
4. Chính sách giữ/xóa dữ liệu chat và hành vi sau rút consent, cùng lệnh migration/rollback thực tế, cần được chốt trước môi trường ngoài demo và ghi ADR nếu thay đổi hành vi MVP.

Mọi phát hiện mới được đối chiếu [decision log](decisions.md) rồi sửa đồng thời SRS/FR/BR/UC/ERD/API/TC liên quan. Báo cáo lịch sử nguồn trước 2.0 vẫn nằm ở [RA_SOAT.md](RA_SOAT.md).
