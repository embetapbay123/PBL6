# F00/F10 — phục hồi hoàn online và khởi động lại worker

01/11/2026. Đây là PROGRESS của toàn bộ52 finding/F00–F18/sáu chuỗi, không thu hẹp mục tiêu thành riêng hoàn tiền. **17/52 finding gốc VERIFIED,35 còn chưa nghiệm thu đầy đủ**. Bổ sung P1 **CF-036-01** được sửa/xác minh riêng ngoài52; không cộng trùng CR-006/007.

Runtime cuối: **Node36, frontend36, AI36** trên stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. M2 thêm migration021; M1/M3 không migration mới. Giữ nguyên toàn bộ baseline/manifest/report cũ.

## Lỗi và cách sửa

Baseline35 có đơn online đã thu120000, yêu cầu trả hàng đã kiểm/kho APPLIED, provider trả FAILED với0effect. Worker dừng; API phục hồi404, UI không có công việc tiếp theo. Hàm nội bộ chưa được nối API còn gửi lại cùng mã provider FAILED, không tiến tiếp với provider giữ idempotency. Bằng chứng thật: `refund-recovery-baseline35.json` và checkpoint cùng tên trong thư mục đó.

Đã thêm preview và command theo đơn cho **Owner đúng Store hoặc Admin có platform.admin**. SELLER/Customer không có quyền gửi phục hồi. Preview lấy số tiền/version từ server; command yêu cầu version Order/Refund, căn cứ và operation ID quản lý. Không cho client nhập số tiền, không xác nhận hoàn online bằng tay.

Luồng mới:

1. FAILED đã đối chiếu, đúng khoản thu/đơn/điều kiện trả hàng → tiếp nhận yêu cầu quản lý có idempotency. Đây chưa phải hoàn tiền thành công.
2. Worker lookup **lệnh provider cũ**. UNKNOWN/lỗi/timeout/sai amount hoặc sai identity → tiếp tục đối soát, không gửi lệnh hoàn mới.
3. Lookup xác nhận FAILED chưa thực hiện → tạo execution mới, lưu quan hệ với execution cũ rồi gửi. Nếu lookup thấy SUCCEEDED, ghi nhận khoản cũ và kết thúc đối soát; không tạo lượt mới. NOT_FOUND có thẩm quyền cho phép xếp lại chính execution cũ.
4. Chỉ receipt thành công đúng identity/amount mới cập nhật Payment, Refund, event và ledger tiền cùng transaction. Đổi trạng thái đơn trong lúc xử lý chặn lượt mới.

Provider phải có idempotency bền vững và lookup có thẩm quyền: **FAILED trong contract này phải xác nhận chưa có hiệu lực tiền**. Adapter không bảo đảm được điều đó phải trả UNKNOWN hoặc bị tắt. Đợt này chỉ có adapter integration kiểm thử; chưa chứng minh provider ngân hàng thật.

Parent Refund, key gốc, Payment/Order liên quan và amount **bất biến**. `refund_job.execution_operation_id` tách lệnh provider khỏi operation logic ban đầu. `refund_execution` lưu identity/payload lệnh bất biến; `refund_recovery_request` giữ người yêu cầu, căn cứ, version và quan hệ phục hồi. Không tạo Refund thứ hai hoặc đổi FK snapshot hiện có để làm retry qua.

UI có xem khoản hoàn gồm phí giao, yêu cầu đối soát, trạng thái chờ, lỗi/làm mới; polling tối đa60giây. Reload/mất ACK giữ body/key quản lý cũ, không tự POST. Dialog mất quyền bị chặn ở API; lỗi GET không phát lại giao dịch. Customer biết chưa hoàn thành và cần Owner/Admin đối soát. Lịch sử sau bán có yêu cầu phục hồi và bước xếp lại, không trả raw provider reference/chứng từ.

Mã chính: `payment/refund-recovery.service.ts`, `refund-execution.ts`, `refund.runner.ts`, `payment.controller.ts`, M2_021; `RefundRecoveryPanel.tsx`, các view trả hàng/hoàn về. Thêm4operation Owner/Admin, tổng159public/14internal =173operation; frontend fixture mode cũng chặn hai mutation tiền mới.

## Chuyển tiếp và rollback

- Migration021 được áp khi reader/worker35 còn chạy. Backfill chỉ identity lệnh từ job đang có; không tạo receipt hoặc tiền. Hash của **96movement và danh tính/số tiền22Refund** trước–sau giữ nguyên: `migration21-before.json`, `migration21-after.json`.
- Consumer/simulator36 lên trước API writer. API36 chạy `REFUND_RECOVERY_WRITES=0`: Admin thật đọc được yêu cầu FAILED cũ, POST503 và0command mới. Sau đó bật1, preview mới cho phục hồi: `recovery-writer-off36.json`, `recovery-writer-on36.json`.
- Rollback bằng tắt nhận recovery mới, **giữ reader/worker36** để đọc/lookup các execution đã phát sinh. Replay command đã nhận vẫn đọc được; SQL kiểm tiền kết thúc sau khi tắt writer. Không hạ consumer về35 sau khi đã có execution mới, không xóa ledger để rollback.
- Đúng yêu cầu FAILED tạo trước migration đã được Admin thật phục hồi, hoàn120000 một lần và đóng Return qua HTTP: `legacy-online-recovery36.json`. Không thay bằng một fixture mới hoặc ép SQL trạng thái.

## Nghiệm thu thật

| Nhánh | Bằng chứng |
| --- | --- |
| FAILED → Owner đối soát → execution mới | UI1440 và390; mất ACK sau command commit, reload/replay giữ body/key; một recovery row và một khoản hoàn thành công. |
| Thu hồi quyền khi form mở | Admin khóa Store thật; Owner không gửi được, dữ liệu tài chính vẫn FAILED; mở lại và đọc quyền mới mới tiếp tục. SELLER/Customer403, Owner Store khác404; version cũ409. |
| Hai người xử lý | Owner/Admin POST cạnh tranh trên cùng đơn, một200/một409; không thêm control hoặc tiền. |
| Lookup UNKNOWN | Provider cũ được tra soát; không có execution mới. Kết quả cũ xác nhận SUCCEEDED sau đó được ghi nhận, không resend refund. |
| Simulator restart | FAILED cũ giữ nguyên ledger/counter sau restart, không biến đổi chỉ vì đổi mode. Rule theo đúng correlation, không đổi mode cho giao dịch khác. |
| Worker crash sau provider commit | SQL barrier chặn INSERT ledger tiền, xác minh worker đang bị khóa sau khi provider có1effect. KILL process thật, nhả barrier, khởi động lại; chờ lease30giây hết tự nhiên, lookup cùng execution. Không sửa lease bằng SQL; refund_calls1/effects1. |
| Provider mất ACK | Adapter thực trong stack commit rồi trả503; local UNKNOWN/Payment chưa ghi hoàn, sau đó lookup SUCCEEDED. Một refund call, một effect: `provider-lost-ack-runtime36.json`. |

Runtime desktop tạo3đơn cho FAILED/UNKNOWN/crash; mobile chạy nhánh Owner/Customer và simulator restart. Một lượt mobile bổ sung đợi badge COMPLETED ở cả hai phiên sau readback vì ảnh trước còn chụp lúc nút đang tải. Không đếm viewport hoặc lượt chạy lại thành nhiệm vụ mới. Admin phục hồi được kiểm qua HTTP thật; UI Admin được fixture kiểm riêng, chưa gọi đó là walkthrough Admin thật.

SQL cuối chọn đúng6đơn thuộc4lineage: **6Refund,9execution,4control,6effect provider**, mỗi đơn thu/hoàn120000 gồm phí giao20000. Tổng đã hoàn720000;12movement thu/hoàn,6event REFUNDED,0biên nhận COD. Ba execution FAILED có0effect; execution hiện hành của từng đơn SUCCEEDED. Key Refund gốc không đổi, không cộng tổng amount của các execution để tính tiền hoàn.

Bốn variant quantity thương mại10/reserved0; tổng delta quantity/reserved trong ledger cũng10/0. Sáu Return COMPLETED/APPLIED. Product/taxonomy có tag không còn ACTIVE; sau các proof đã dùng Admin API khóa hiển thị8Store đúng tag (gồm Store phụ và lượt mobile cũ), kiểm Guest bị chặn và không còn đơn/return mở. Giữ giao dịch, lịch sử và ledger; proof quyền tài chính được chụp trước bước thu hồi hiển thị. Xem thêm `refund-recovery-visibility36.json`. Bằng chứng: `refund-recovery-final-state36-accepted.json`; readback trước khi bổ sung badge UI được giữ ở file không hậu tố accepted.

## Gate và source

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Backend unit cuối |365PASS/51suite|`backend-unit-recovery36-final.json`|
| PostgreSQL isolated |58PASS/8suite|`refund-recovery-integration36-final.json`|
| Edge fixture hồi quy |83PASS/11file|`after-sale-fixtures36-final.json`|
| Runtime desktop |PASS, có checkpoint từng nhánh|`refund-recovery-runtime36-desktop-run2.json`|
| Runtime mobile có badge cuối |PASS|`refund-recovery-runtime36-mobile-accepted.json`|
| Provider HTTP503 sau commit |PASS|`provider-lost-ack-runtime36.json`|
| Legacy/migration/writer gates |PASS|Các proof nêu trên|
| Python contract/catalog/network |24PASS|`ai-contracts36.xml`|
| Source/image |Node268; frontend-contract-test-config235; AI43 và copied index;10image khớp|`runtime-image-recovery36.json`|

AI29 giữ business code cũ nhưng bundle sinh tự động còn166operation trong khi source đã thêm API35/36. Không thay đổi14API nội bộ nên không làm sai các bằng chứng M2 đã có; tuy nhiên không đủ để gọi toàn stack khớp source mới. Đợt36 đã build bundle173, cập nhật test số operation và xác minh hash trong image AI mới. Giữ image/manifest29 nguyên lịch sử; dùng overlay `compose-core-fix-refund36.yaml` sau overlay28 để chọn AI36.

`deployed-source-manifest-36.json` giữ snapshot trước nhánh rollback; source cuối là `deployed-source-manifest-36-final.json`. Frontend/test trước kiểm badge giữ `frontend-source-recovery36-final.json`; bản accepted có cùng app và bổ sung assertion harness. Không sửa hash baseline cũ.

## Giới hạn và lượt lỗi

- Build đầu lỗi kiểu mock SUCCEEDED có receipt optional; sửa discriminated return trong test, không nới kiểm receipt. UI đầu10PASS/1FAIL vì label bao textarea có giá trị sau reload; liên kết label bằng ID rõ ràng, lượt sau qua. Script crash đầu lỗi cú pháp, chưa tạo dữ liệu; giữ report, kiểm list/parse rồi chạy lại.
- Verifier đầu nối stock_movement bằng variant_id sai schema; sửa JOIN inventory_id, giữ nguyên kỳ vọng ledger. Không sửa tiền/tồn hoặc làm fixture khớp hành vi sai.
- Python24 qua có cảnh báo không ghi được pytest cache trong image chạy user app; không ảnh hưởng kết quả. Frontend build qua, chunk chính vẫn khoảng540kB; không suy thành nghiệm thu hiệu năng.
- Đây là Edge viewport1440/390, thêm768/1024 ở form fixture. Chưa native zoom, screen reader, bàn phím ảo, thiết bị thật hoặc nghiên cứu người dùng: USER_VALIDATION_PENDING.
- Provider là simulator riêng, identity được seed/capture kiểm thử; không tuyên bố ngân hàng thật, giao hàng/nhận kiện vật lý hoặc xác minh email đăng ký từ các ca này.
- F09 exchange/conversion và toàn ma trận còn mở. CH01–05 gần nhất21/CH06 gần nhất29 vẫn cần chạy cùng baseline cuối; không dùng các subcase này thay sáu chuỗi. Toàn bộ35 finding còn lại phải được sửa/nghiệm thu theo ma trận; chưa kết luận sẵn sàng vận hành.
