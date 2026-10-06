# Công — Payment/COD và consent/tracking

Nhánh `codex/cong-week2-foundations`, scope [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54), lát cắt [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55). [PR #90](https://github.com/embetapbay123/PBL6/pull/90) đã merge vào main (`1b6028a`) ngày 06/10/2026. PAY-01/PAY-04 Done; AI-01 còn nghiệm thu đủ nguồn thật. [CI main đạt](https://github.com/embetapbay123/PBL6/actions/runs/37455617355).

## Hoa lấy điểm nối nào

- [PaymentPort](../../backend/commerce-service/src/payment/payment.port.ts), [service](../../backend/commerce-service/src/payment/payment.service.ts), [README](../../backend/commerce-service/src/payment/README.md). Dùng manager của transaction tạo nhóm Order; `createForOrder` và `recordCodCollection` đã thật, giữ operation ID/payload qua worker retry và correlation. Không tạo repository global/transaction tiền thứ hai.
- Payment read/attempt có runtime DTO/ownership/version/expiry; QR/reference do server cấp. Cấu hình tài khoản SePay Test là lựa chọn rõ ràng; thiếu config trả 503 trước ghi. Callback/refund vẫn 501; confirm vẫn chờ durable orchestration/kho đúng owner, không được mở success giả.
- Điểm gọi collectCod giữ logic Order/quyền/version của Hoa; chỉ bổ sung correlation và HTTP 200 đúng contract. Không tự đánh dấu ORDER-05 hoàn tất thay Hoa.

## Client và AI lấy điểm nối nào

- [Consent](../../backend/ai-service/app/consent/README.md): GET/PATCH thật, Customer ownership/version, withdraw xóa hành vi, retention 30 ngày và audit nguyên tử. Web/Android nối qua typed operation hiện có; không gửi user_id trong body.
- [Tracking](../../backend/ai-service/app/tracking/README.md): worker-m4 durable queue/DLQ, schema/source/inbox/version và consent trước ghi; OrderCompleted không lặp PURCHASE. Dataset revision/invalidation là nền cho AI-02/03, không phải model recommendation/RAG đã hoàn thiện.
- #55 giữ mở vì producer M1 search/view và nghiệm thu đủ nguồn thật chưa đạt. Thịnh vẫn sở hữu producer M1; Trí sở hữu event M3; Hoa sở hữu OrderCompleted M2. Có fixture/broker test không thay end-to-end nguồn thật.

## Setup và trạng thái

Chạy migration theo README: M2 thêm 005, M4 thêm 004/005. Không sửa 001–003 hoặc commit `.env`; cập nhật `.env.example` với cấu hình QR để trống, mặc định disabled. Compose có thêm worker-m4. 99 public/11 internal/7 event không thay request/response: public trên main là 28 IMPLEMENTED / 8 SAMPLE / 4 MOCK / 59 pending; internal giữ 4 implemented / 2 sample / 5 stub. collectCod và các task nghiệp vụ rộng vẫn theo acceptance của owner, không nâng metadata chỉ vì port đã có.

Test mới dùng PostgreSQL, transaction/audit rollback, cạnh tranh/replay/amount/state, guard/DTO và HTTP COD; M4 dùng schema test riêng, consent/version/deletion/retention/inbox rollback và broker fixture. Bằng chứng chạy nằm trong [validation record](validation-record.md). PR #90 đã self-review và merge bằng bypass theo yêu cầu chủ repo; không có approval của member khác. Hoa tiếp nghiệm thu controller/luồng Order với port đã bàn giao. Week 2/roadmap là mục tiêu, Kanban chỉ chuyển Review khi có PR và test; không tự đóng issue theo lịch.
