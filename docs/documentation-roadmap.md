# Danh mục tài liệu cần hoàn thiện cho PBL6

**Trạng thái:** theo dõi hoàn thiện 2.1 Draft, 29/09/2026; chưa được nghiệm thu. Sơ đồ Use Case và ERD đã được vẽ và có hình nhúng; các đặc tả hiện cần reviewer kiểm chéo với triển khai khi code xuất hiện.

## Bộ tài liệu bàn giao

| Nhóm | Tài liệu chính | Hiện trạng | Việc cần làm trước khi chốt |
| --- | --- | --- | --- |
| 1. Phạm vi | [Scope và glossary](scope.md), [Decision log](decisions.md) | Đã có bản nháp | Xác nhận MVP/ngoài phạm vi và các quyết định mới nhất: Order trước thanh toán, trả từng Order, không có entity Purchase/Checkout. |
| 2. Yêu cầu | [SRS](srs.md), [FR/NFR](functional-requirements.md), [Business Rules](business-rules.md), [State transitions](state-transitions.md) | SRS 2.1 đã viết lại; FR/BR là bản thiết kế | Reviewer đối chiếu từng nhóm yêu cầu và các chỉ tiêu NFR với test. |
| 3. Quyền truy cập | [RBAC matrix](rbac.md) | Đã có bản nháp | Soát quyền Customer/Owner/Seller/Admin theo từng API và màn hình; khóa User/Store, thu hồi quyền, audit. |
| 4. Hành vi người dùng | [Use Case specification](use-cases.md), [User Stories](user-stories.md), [sơ đồ Use Case](diagrams/use-case/) | 64 UC đã chi tiết hóa; 13 sơ đồ có SVG nhúng | Reviewer rà từng UC và GWT với hình, quyền, API; chỉnh khi phát hiện lệch, không thay mã âm thầm. |
| 5. Giao diện | [UI flows và screen catalog](ui-flows.md) | Đã có mã màn C/S/A và trạng thái lỗi | Đối chiếu với UI triển khai; wireframe có thể bổ sung sau nếu nhóm cần. |
| 6. Kiến trúc | [Architecture](architecture.md), [sơ đồ Sequence/Activity/State](diagrams/) | Đã có context/container, ownership M1–M4, giao tiếp và bản sơ đồ nghiệp vụ/kỹ thuật | Reviewer đối chiếu ranh giới transaction, deployment view và lỗi xuyên service với code khi có triển khai. |
| 7. Dữ liệu | [ERD và data dictionary](data-dictionary.md), [các sơ đồ ERD](diagrams/erd/) | 9 ERD và từ điển dữ liệu đã có | Rà cột/constraint/index, vòng đời dữ liệu, snapshot, audit/consent, và đối chiếu với UC/API. ID xuyên service chỉ là tham chiếu logic. |
| 8. Giao diện phần mềm | [API specification](api-spec.md), [OpenAPI](contracts/openapi.json) | 96 operation đã có schema/scope thiết kế | Reviewer đối chiếu request/response/error với client/backend khi triển khai. |
| 9. Tích hợp | [Event/integration contract](integration-contract.md) | Đã có command/event, envelope, retry/dedup và ca đối soát ở mức thiết kế | Reviewer chốt payload từng event và timeout thực tế theo code; thử callback, worker và đối soát khi có môi trường chạy. |
| 10. AI | [AI design](ai-design.md), [AI evaluation](ai-evaluation.md) | Đã tách thiết kế và kế hoạch đánh giá | Chạy dataset/model/test thật, điền kết quả trung thực; giữ **chưa thực thi** trước khi có run. |
| 11. Chất lượng | [Test plan/Test cases](test-plan.md), [requirements acceptance](requirements-acceptance.md), [traceability](traceability.md) | Đã có case thiết kế, chưa chạy | Soát phủ FR/UC/API, dữ liệu test, expected result, case lỗi và quyền; giữ kết quả thực thi trống đến khi có bằng chứng. |
| 12. Bàn giao | [Deployment/demo](deployment.md), [project plan](project-plan.md) | Có env gợi ý, dependency, migration/seed dự kiến, health, kịch bản demo và owner/reviewer đề xuất | Thay lệnh/env giả định bằng cấu hình backend thật, chạy checklist và lưu bằng chứng; chưa ghi bước chưa chạy là đạt. |

## Tài liệu nên bổ sung thành file riêng

| Tài liệu | Lý do | Mức ưu tiên |
| --- | --- | --- |
| [Security, privacy và audit specification](security-privacy.md) | Đã tập hợp token, mật khẩu, PII, consent, khóa và audit; retention thực tế còn cần chốt khi triển khai. | Rà trước khi code auth và dữ liệu người dùng |
| [API error catalog và example payload](api-spec.md) | Đã đặt trong API spec; reviewer cần đối chiếu tên code với backend/client khi code. | Rà trước khi tích hợp client–backend |
| [Release/operations checklist](deployment.md) | Đã đặt trong deployment guide; lệnh và log thực tế còn chờ code. | Rà trước khi demo/triển khai |

## Thứ tự viết và kiểm tra

1. **Baseline nghiệp vụ:** scope/ADR → SRS → FR/NFR/BR/state → RBAC. Mọi tài liệu phải thống nhất: một lần xác nhận giỏ tạo một Order/Store, thanh toán từng Order, không có bảng Purchase/Checkout.
2. **Luồng người dùng:** đối chiếu UC đã vẽ với đặc tả UC, User Story và UI flow. Chỉ sửa sơ đồ khi đặc tả đã chốt cho thấy hình sai hoặc thiếu.
3. **Thiết kế để code:** kiến trúc → ERD/data dictionary → API/OpenAPI → event contract → security/privacy. Mỗi dữ liệu trong API phải có nguồn hoặc quy tắc suy ra; mỗi thay đổi trạng thái phải có owner.
4. **Nghiệm thu và bàn giao:** Test Case/traceability → AI evaluation → deployment/demo → review chéo. Không chuyển Draft thành Approved chỉ vì file đã viết xong.

**Điều kiện chốt một tài liệu:** có owner/reviewer; thuật ngữ và mã định danh thống nhất; liên kết tới yêu cầu/UC/API/test liên quan; ví dụ và luồng lỗi cụ thể; không còn mâu thuẫn với [Decision log](decisions.md). Tài liệu thiết kế chưa thay thế kết quả chạy code hoặc kiểm thử thực tế.
