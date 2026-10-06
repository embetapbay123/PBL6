# Tài liệu PBL6 — thiết kế 2.1 và khung triển khai 2.2

**Bàn giao 02/10/2026:** [Khung triển khai 2.2](implementation/README.md) chốt 4 service M1–M4, có code/migration/luồng mẫu và backlog từng member. [ADR](implementation/scaffold-decisions.md) ghi session/provider và [trạng thái 99 API](implementation/endpoint-status.md) phân biệt mẫu/mock/501.

**Member nhận việc hiện tại:** [Week 2](implementation/week2.md); kế hoạch trước ở Week 1.

**Member nhận việc tuần 1:** bắt đầu ở [Week 1: task, link và chi tiết từng người](implementation/week1.md) → [nền code/DTO/client/fixture](implementation/foundation-handoff.md) → README module/API của task. [Bảng giao toàn bộ task](implementation/task-assignment.md), [ownership](implementation/service-ownership.md) và [backlog](implementation/member-backlog.md) là phạm vi lâu dài; phần `legacy` chỉ dùng tham khảo lịch sử.

**Nguồn hiện hành:** tài liệu 2.1 mô tả nghiệp vụ đích; [ADR khung 2.2](implementation/scaffold-decisions.md) bổ sung quyết định runtime/provider/session; OpenAPI là contract, endpoint-status là trạng thái triển khai. Các Test Case nghiệp vụ còn chờ thực thi; kết quả kiểm khung đã chạy được ghi riêng ở [validation record](implementation/validation-record.md). Khi thay contract phải cập nhật tài liệu/test chịu ảnh hưởng, không suy ra chức năng hoàn thành chỉ từ thiết kế.

Xem [danh mục tài liệu cần hoàn thiện](documentation-roadmap.md) để biết bộ bàn giao, phần đã có và thứ tự rà soát trước khi triển khai.

[Biên bản tự kiểm 2.1](review-2.1.md) ghi phần đã được kiểm tra tĩnh và những nội dung cần kết quả triển khai/kiểm thử thực tế.

Bộ tài liệu thiết kế cho marketplace nhiều Store: Customer chọn sandbox/COD theo Store khi xác nhận giỏ; hệ thống tạo một Order cho mỗi Store trước khi thu tiền, mỗi Order có Payment riêng. Các Order cùng lần mua chỉ chia sẻ `purchase_group_id`. Bộ tài liệu còn bao gồm voucher cộng dồn, đánh giá sau mua, chatbot RAG và recommendation. **Draft** nghĩa là chưa có bằng chứng triển khai/kiểm thử hoặc phê duyệt nghiệm thu. Các lựa chọn phạm vi đã xác nhận ở [Decision log](decisions.md).

## Đọc theo thứ tự

1. [Phạm vi và thuật ngữ](scope.md) → [SRS](srs.md) → [FR/NFR](functional-requirements.md) → [quy tắc nghiệp vụ](business-rules.md) → [bảng chuyển trạng thái chi tiết](state-transitions.md).
2. [RBAC](rbac.md) → [User Stories](user-stories.md) → [Use Case và phân rã](use-cases.md). Có [một sơ đồ tổng quan và 12 sơ đồ nhóm](diagrams/use-case/).
3. [Kiến trúc](architecture.md) → [hướng dẫn đọc từng ERD](diagrams/erd/README.md) → [từ điển dữ liệu](data-dictionary.md) → [8 sequence dễ đọc](diagrams/sequence/README.md), [2 activity dễ đọc](diagrams/activity/README.md) và [sáu state](diagrams/state/). Bản sequence/activity kỹ thuật được giữ riêng trong [technical](diagrams/technical/README.md).
4. [API contract](api-spec.md) và [OpenAPI 3.0 JSON](contracts/openapi.json) → [contract tích hợp](integration-contract.md) → [bảo mật/riêng tư/audit](security-privacy.md) → [thiết kế AI](ai-design.md) và [kế hoạch đánh giá AI](ai-evaluation.md).
5. [UI flow](ui-flows.md) → [Test Plan/Test Case](test-plan.md) và [tiêu chí từng FR/NFR](requirements-acceptance.md) → [ma trận truy vết](traceability.md) → [hướng dẫn triển khai/demo](deployment.md) → [kế hoạch deliverable](project-plan.md).

## Nguồn và trạng thái

Năm bản Markdown chuyển nguyên nội dung tài liệu Word/Excel ở [legacy](legacy/), bản nhị phân gốc ở `docs_old`. [Báo cáo rà soát](RA_SOAT.md) mô tả các vấn đề của bộ nguồn trước 2.0; [ghi nhận chuyển đổi](CHUYEN_DOI.md) có hash và phương pháp. Tài liệu 2.1 dùng mã FR cũ làm cơ sở và bổ sung mã mới cho phạm vi đã chốt. Không lấy câu checkout một Store trong legacy làm quy tắc hiện hành.

| Thành phần | Số lượng/định dạng | Trạng thái |
| --- | --- | --- |
| Functional Requirements | 98 FR, 28 NFR | Draft, chưa kiểm thử |
| User Stories | 92 Story | Draft, có tiêu chí GWT mức story |
| Use Case | 64 mục chi tiết; 1 + 12 PlantUML | Draft, đã rà actor, quan hệ UML và luồng vòng đời theo [review](review-usecase-response.md) |
| ERD | 1 tổng quan + 8 Mermaid; 54 entity, có SVG nhúng | Draft, chờ so với DB triển khai |
| Sơ đồ động | 8 sequence, 2 activity, 6 state PlantUML; bảng vòng đời trong [Business Rules](business-rules.md) và [State Transitions](state-transitions.md) | Draft |
| API | OpenAPI 3.0 JSON, 99 operation; metadata ownership/status | Design contract + mẫu/stub theo implementation 2.2 |
| Test Case | Kịch bản nghiệp vụ, bảo mật, tích hợp, tải và AI | Chưa thực thi |

Mã sơ đồ lưu dạng văn bản để nhóm chỉnh sửa và render. Các script trong `scripts/` chỉ dùng tạo bản đầu và yêu cầu `--force` khi tệp đích đã có; sau khi nhóm sửa nội dung, tránh chạy lại nếu chưa kiểm soát diff. Mỗi quyết định mới phải cập nhật SRS/FR, BR, UC, ERD, API và Test Case liên quan trước khi gắn nhãn Approved.
