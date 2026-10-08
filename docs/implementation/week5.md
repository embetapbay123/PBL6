# Week 5 — RAG/chat, moderation và các màn còn lại

**Kế hoạch dự kiến**, cập nhật 06/10/2026; 5 ngày làm việc/tuần. [Roadmap toàn bộ](roadmap.md) quy định mốc, điều kiện và cách xử lý trễ; Status thực tế xem [Kanban](https://github.com/users/embetapbay123/projects/1/views/3). Task dưới đây gồm phần tiếp tục/kiểm lại, không có nghĩa mở lại scope đã Done.

## Kết quả cuối tuần

Hoàn thiện chức năng còn lại trên ba Web và Android, tập trung chat có dữ liệu Catalog hiện hành và vận hành moderation/report.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#57](https://github.com/embetapbay123/PBL6/issues/57), [#56](https://github.com/embetapbay123/PBL6/issues/56), [#58](https://github.com/embetapbay123/PBL6/issues/58) | RAG retrieval + session/history Guest/Customer, fallback/timeout, Product card xác minh M1; bắt đầu evaluation trên bộ câu hỏi cố định và ALS split đã chuẩn bị. | Ngày 2 chat endpoint lát cắt; ngày 4 history/scope/card/timeout để Web và Android ráp. |
| Thịnh | [#17](https://github.com/embetapbay123/PBL6/issues/17), [#20](https://github.com/embetapbay123/PBL6/issues/20), [#18](https://github.com/embetapbay123/PBL6/issues/18), [#19](https://github.com/embetapbay123/PBL6/issues/19) | Product/Review hide/restore có audit/event; Seller Voucher/report/staff/Order đủ UI. Nối Store metrics M4 theo scope khi tuần 6 bàn giao. | Ngày 2 moderation M1 cho Admin; ngày 5 demo Seller theo permission và hai Store. |
| Hoa | [#35](https://github.com/embetapbay123/PBL6/issues/35), [#34](https://github.com/embetapbay123/PBL6/issues/34), [#30](https://github.com/embetapbay123/PBL6/issues/30) | Android chat/consent/Store application/invitation; hoàn tất Order/refund/review UI và report commerce còn thiếu. Không thêm logic Payment ở client. | Ngày 4 Android chat + consent, ngày 5 demo các luồng Customer/Store account. |
| Trí | [#47](https://github.com/embetapbay123/PBL6/issues/47), [#48](https://github.com/embetapbay123/PBL6/issues/48), [#46](https://github.com/embetapbay123/PBL6/issues/46) | Admin taxonomy/moderation và Voucher/Order/report, kiểm scope/version/audit ở UI; chốt các màn User/Store còn thiếu. | Ngày 3 Admin taxonomy/moderation bằng M1 thật; ngày 5 Admin demo đủ commerce. |
| Hatsaphone | [#70](https://github.com/embetapbay123/PBL6/issues/70), [#71](https://github.com/embetapbay123/PBL6/issues/71) | For-you/related và chat/history cùng AuthProvider/client; consent/invitation còn thiếu. Làm loading/error/fallback/mobile viewport, không nhận retrieval/train/evaluation BE. | Ngày 3 recommendation; ngày 5 chat/history + consent nối M4 thật. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

Công bàn giao chat ngày 2 thay vì chờ evaluation xong; Thịnh bàn giao moderation ngày 2 cho Trí. AI metrics/evaluation đầy đủ tiếp tuần 6, không đóng #58 từ demo chọn lọc.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: nối dependency thật, gửi PR nhỏ để review; ghi owner/operation đang chờ và tiếp tục phần độc lập.
4. Ngày 4: chạy integration/e2e và các case sai quyền, concurrency/retry phù hợp; sửa lỗi đúng owner.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Chat không đọc history người khác; prompt injection/context thiếu có fallback; card không bán/giá đổi được loại hoặc làm mới.
- Moderation phát event làm mới index; quyền Store/Admin và audit được kiểm.
- Web/Android recommendation/chat chạy API thật; mock và provider sandbox được ghi rõ trong bằng chứng.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.
