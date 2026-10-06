# Week 6 — Đủ chức năng, AI metrics và tích hợp toàn hệ thống

**Kế hoạch dự kiến**, cập nhật 06/10/2026; 5 ngày làm việc/tuần. [Roadmap toàn bộ](roadmap.md) quy định mốc, điều kiện và cách xử lý trễ; Status thực tế xem [Kanban](https://github.com/users/embetapbay123/projects/1/views/3). Task dưới đây gồm phần tiếp tục/kiểm lại, không có nghĩa mở lại scope đã Done.

## Kết quả cuối tuần

Chốt feature complete: mọi scope nghiệp vụ đã được triển khai và tích hợp trên client tương ứng. Chưa tuyên bố đạt NFR tải/recovery cuối chỉ từ mốc này.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#58](https://github.com/embetapbay123/PBL6/issues/58), [#59](https://github.com/embetapbay123/PBL6/issues/59), [#60](https://github.com/embetapbay123/PBL6/issues/60) | Evaluation RAG/ALS có dataset/model/index/config/run ID, metrics PLATFORM/STORE đúng M3; hoàn tất Payment recovery; tổng hợp thiếu sót 99 public/11 internal/7 event và dựng RC đầu. | Ngày 2 metric/evaluation cho report/UI; ngày 5 RC chức năng + danh sách FR/NFR chưa kiểm. |
| Thịnh | [#20](https://github.com/embetapbay123/PBL6/issues/20), [#17](https://github.com/embetapbay123/PBL6/issues/17), [#15](https://github.com/embetapbay123/PBL6/issues/15) | Nối Seller report/Store AI metrics; rà đủ Catalog/Taxonomy/Inventory/Review/moderation/Seller, expiry/restock và upload. Sửa thiếu sót tích hợp M1. | Ngày 3 Seller đủ dữ liệu metrics; ngày 5 toàn scope M1/Seller có demo và test. |
| Hoa | [#30](https://github.com/embetapbay123/PBL6/issues/30), [#32](https://github.com/embetapbay123/PBL6/issues/32), [#34](https://github.com/embetapbay123/PBL6/issues/34), [#35](https://github.com/embetapbay123/PBL6/issues/35), [#36](https://github.com/embetapbay123/PBL6/issues/36) | Nối AI metrics vào report đúng contract; rà toàn M2/Android và build APK đầu để test thiết bị từ tuần 6. Hoàn thiện phần thiếu, không chờ tuần 8 mới cài APK. | Ngày 3 báo cáo đủ nguồn; ngày 5 APK RC với Auth→checkout→Payment→Review→AI. |
| Trí | [#49](https://github.com/embetapbay123/PBL6/issues/49), [#48](https://github.com/embetapbay123/PBL6/issues/48), [#43](https://github.com/embetapbay123/PBL6/issues/43) | Admin AI metrics/health trạng thái vận hành có dữ liệu thật, Store scope đúng; rà Auth/Store/staff/Admin và effective permission. | Ngày 4 Admin AI metrics; ngày 5 Admin đầy đủ và test revoked permissions. |
| Hatsaphone | [#5](https://github.com/embetapbay123/PBL6/issues/5), [#62](https://github.com/embetapbay123/PBL6/issues/62), [#63](https://github.com/embetapbay123/PBL6/issues/63), [#64](https://github.com/embetapbay123/PBL6/issues/64), [#65](https://github.com/embetapbay123/PBL6/issues/65), [#66](https://github.com/embetapbay123/PBL6/issues/66), [#67](https://github.com/embetapbay123/PBL6/issues/67), [#68](https://github.com/embetapbay123/PBL6/issues/68), [#69](https://github.com/embetapbay123/PBL6/issues/69), [#70](https://github.com/embetapbay123/PBL6/issues/70), [#71](https://github.com/embetapbay123/PBL6/issues/71) | Rà đủ 11 scope Customer Web, phone/keyboard/form/loading/empty/error và session; sửa các lát cắt còn thiếu. Không viết lại màn đã merge. | Ngày 5 Customer Web đầy đủ, có bằng chứng từng flow và lỗi. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

M4 metrics ngày 2 → M2 report, Seller và Admin. Hoa bàn giao APK RC ngày 5 để có hai tuần kiểm thiết bị/sửa lỗi. Owner service tự sửa lỗi nghiệp vụ, Công điều phối review/tích hợp.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: nối dependency thật, gửi PR nhỏ để review; ghi owner/operation đang chờ và tiếp tục phần độc lập.
4. Ngày 4: chạy integration/e2e và các case sai quyền, concurrency/retry phù hợp; sửa lỗi đúng owner.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Đối chiếu đủ 71 issue theo acceptance: còn thiếu thì không đóng và không gọi feature complete; sample/mock/501 không được tính là nghiệp vụ hoàn thiện.
- Evaluation lưu Precision@K/Recall@K/NDCG@K và baseline; RAG groundedness/relevance/card/latency theo bộ câu hỏi cố định. Chất lượng không đủ phải sửa, không chỉ có file report.
- Ba Web + Android chạy mọi luồng đích trên môi trường chung; endpoint/status/README/contract đồng bộ, CI xanh.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.
