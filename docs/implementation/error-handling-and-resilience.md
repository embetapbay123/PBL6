# Xử lý lỗi, transaction và phục hồi

Bổ sung [integration contract](../integration-contract.md), [state transitions](../state-transitions.md). Phần thanh toán/kho dưới đây là quy tắc phải hoàn thiện; khung chỉ có helper và event mẫu.

| HTTP | Ý nghĩa / client xử lý |
| --- | --- |
| 400/422 | Sai định dạng/validation; sửa input, không retry nguyên request |
| 401 | Chưa xác thực/phiên bị thu hồi; refresh một lần nếu phù hợp rồi login |
| 403 | Không có quyền; không tự retry hoặc dùng account khác |
| 404 | Không thấy hoặc ngoài scope; không lộ tài nguyên |
| 409 | VERSION_CONFLICT, IDEMPOTENCY_CONFLICT/state conflict; tải lại/đối chiếu |
| 429 | Rate limited, Retry-After; client giảm tốc |
| 501 | FEATURE_NOT_IMPLEMENTED, nghiệp vụ chưa được member code |
| 503/504 | Dependency/timeout; không suy ra mutation thất bại chắc chắn |
| 500 | Lỗi bất ngờ; correlation để điều tra, không trả stack/SQL/secret |

Khung Node và M4 trả `{code,message,correlation_id,details}`. Internal HTTP budget hữu hạn; client Web 7 giây, chỉ tự refresh khi 401, không tự retry mutation. M4 Identity 1 giây/Catalog 2 giây. DB Node statement timeout 3 giây/pool10; cần điều chỉnh theo đo tải, không tăng vô hạn.

## Transaction và idempotency

- M2 tạo batch Order/Payment trong transaction cục bộ sau bước kho theo baseline. Hoa/Công dùng cùng EntityManager; không tự tạo transaction nested cho Payment rồi commit trước Order.
- M1 reserve/consume/release là transaction khác. M2 dùng operation ID ổn định, ghi trạng thái điều phối và outbox/recovery; không có transaction ACID xuyên service.
- Helper `once` khóa advisory theo caller+operation ID; fingerprint payload chuẩn hóa, result/effect cùng transaction. Cùng ID/payload trả lại result, khác payload 409. Member phải dùng helper/ràng buộc phù hợp cho command và tạo Order, không chỉ kiểm trước insert.
- Mẫu Product update khóa row, kiểm expected_version và ghi audit/outbox nguyên tử. Chưa có state machine/check StockReservation/Order/Payment đầy đủ.
- Provider timeout cho create/refund là UNKNOWN về kết quả: query/reconcile theo reference trước retry. Không tạo key mới hoặc ghi FAILED chỉ vì response mất.

## Event worker đã có

Envelope version 1.0; publisher confirm + mandatory return check. Outbox pending giữ lại nếu chưa có binding/confirm lỗi. Retry exponential+jitter tối đa khoảng 300 giây; attempts/next_attempt_at bền vững. Consumer mẫu prefetch1, inbox + effect cùng transaction rồi ACK, duplicate không lặp effect. JSON/schema hỏng vào dead-letter queue; lỗi DB tạm thời requeue sau 1 giây. Consumer nghiệp vụ phải bổ sung phân loại lỗi/giới hạn retry bền vững, không dùng retry vô hạn mẫu làm chính sách production.

Queue `pbl6.m1.bootstrap.v1`, `pbl6.m2.bootstrap.v1` chỉ nghe bootstrap.example.v1 để dạy cơ chế. Thêm event mới phải có binding/consumer/version/ownership/test trước khi dùng. Không đánh dấu outbox published khi broker chưa route được. Tác dụng ngoài DB (provider/email) cần reference/idempotency/reconciliation riêng; inbox không tự đảm bảo exactly-once external effect.

## Tình huống member phải xử lý

| Sự cố | Hành vi đích | Owner |
| --- | --- | --- |
| Hai checkout SKU cuối | Tối đa một reservation; không tồn âm | Thịnh + Hoa |
| Reserve xong, M2 tạo đơn lỗi | Release cùng operation ID; job tìm reservation mồ côi | Hoa + Thịnh |
| Response tạo Order mất | Replay cùng key/payload trả cùng group, không đơn mới | Hoa |
| COD consume lỗi/crash | Giữ bước đang xử lý, recovery cùng ID; Seller chưa xử lý sớm | Hoa + Thịnh |
| SePay trùng/muộn/sai tiền | Verify/dedup/state; không paid từ return URL; late event đối soát theo rule | Công |
| Refund timeout/crash | Giữ pending/unknown; query reference, không hoàn kép | Công |
| User/Store khóa | Quyền hiện hành từ M3; từ chối request nhạy cảm | Trí + owner |
| AI lỗi/index cũ | Fallback có nhãn, card còn hợp lệ; không bịa thông tin giao dịch | Công |

Không xóa outbox/inbox/payment event để xử lý sự cố. Runbook phải lưu case/operation/correlation, trạng thái và action có audit. Khôi phục service bằng restart không thay việc đối soát dữ liệu nghiệp vụ.
