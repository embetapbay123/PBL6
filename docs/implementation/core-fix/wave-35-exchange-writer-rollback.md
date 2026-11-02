# Đợt61 — Rollback writer hàng đổi, giữ đọc và đối chiếu

**Đã xác minh rollback riêng writer xuất hàng đổi.** 52/52 finding gốc vẫn VERIFIED; F00/F18 và nghiệm thu tổng vẫn IN_PROGRESS/NOT_ACCEPTED. Còn ma trận callback cuối, sáu chuỗi chung baseline và rà158nhiệm vụ. Không chạy mobile theo yêu cầu; nghiên cứu người thật vẫn `USER_VALIDATION_PENDING`.

Baseline mới `Node61c/AI56/frontend61`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Stack riêng frontend3109/gateway18080. Không migration, không đổi contract/enum/chính sách. AI/provider giữ56/37; không nhận là đã build/test AI mới. Manifest cũ giữ nguyên; không commit/deploy production.

## Thay đổi và nguyên nhân

Kế hoạch yêu cầu tắt writer nhưng tiếp tục đọc/đối chiếu giao dịch đã ghi. Trước61, M1 không có gate riêng cho dispatch hàng đổi. SQL baseline trên source56: **1FAIL** vì lệnh mới vẫn chạy khi cấu hình pause, **1PASS** đối chứng replay committed đã an toàn. Đây là hạng mục vận hành F18, không tự nâng thành bug P0/P1 hoặc cộng vào52finding gốc.

`InventoryService.dispatchExchange` kiểm gate sau replay operation/receipt và trước ghi snapshot/trừ tồn. Giá trị sai hoặc rỗng dừng lệnh mới; mặc định không khai báo tương thích. Command bị dừng không bị đóng dấu đã xử lý. M2 dùng lại command/key cũ; không có thao tác xuất mới trên UI khi còn pending. Reader không bị hạ phiên bản, snapshot không bị sửa hoặc dựng từ catalog hiện tại.

**CF-061-01, P2, CONFIRMED → FIXED/VERIFIED:** lượt HTTP thật61 cho thấy lớp `internalRequest` đổi503 pause thành `DEPENDENCY_UNAVAILABLE`, làm mất lý do chờ dù kho không bị ghi sai. Thêm allowlist đúng mã503 `EXCHANGE_DISPATCH_PAUSED`, giữ thông báo an toàn cố định; các503khác/500vẫn generic, không tự retry. UI giải thích giữ yêu cầu/chờ đối chiếu và cho làm mới GET. Định danh mã lỗi phục vụ đối chiếu theo convention hiện có, không đưa tên biến cấu hình vào luồng người dùng.

## Bằng chứng

Artifact root `artifacts/core-fix/fix-20261030T100153Z/`.

| Bằng chứng | Kết quả và phạm vi |
|---|---|
| `exchange-writer-baseline61.json` | SQL schema M1/M2 riêng:1FAIL pause mới/1PASS replay cũ, source56. |
| `backend-unit-writer61c.json` | **385PASS/52suite**, gồm8giá trị gate và3ca transport; không retry HTTP. |
| `exchange-writer-sql61c.json` | **12PASS**, schema cô lập chạy migration thật; RPC service fixture công bố riêng với runtimeHTTP. |
| `exchange-writer-ui61-final.json` | **19Edge PASS**, ba vai trò nhận thông báo pause, refresh không POST; hồi quy kiểm hàng, consent, COD, lịch sử/quyền. Desktop1440; các kiểm layout cũ chỉ1440/1024/768, bỏ390. |
| `exchange-writer-runtime61-final.json` | **1PASS**,39.8giây: UI Owner, API Customer/Admin, worker thật, M1signedHTTP, SQL checkpoint; đúng image61c cuối. |
| `exchange-writer-final-state61.json` | SELECT độc lập cả3lượt:3StoreLOCKED/3productSTOPPED,9variant khớp quantity/reserved-ledger;5đơnCOMPLETED,600000COD xác nhận thủ công, hoàn0. |
| `deployed-source-manifest-61.json` / `image-source-match-61.json` |396backend file khớp image. AI43file giữ56;327frontend/contract/test/config và10runtimeimage đối chiếu riêng. |

Luồng1: tắt writer trước mua COD/hoàn tất/yêu cầu đổi/nhận hàng. Receipt và cộng lại lượng bán được vẫn chạy. M2 chờ với mã pause; M1 chưa có dispatch/movement mới, sizeL tồn3. Owner đi Store Portal→Đổi trả, thấy nguyên nhân chờ, không thấy hàng đã bàn giao hoặc nút xuất mới. Bật lại: cùng command xuất một mónL, tồn2, snapshot đúng. Customer xác nhận nhận hàng.

Luồng2: đơn mới và receipt mới. Tạm stop workerM2, consumer một lượt gọi signedHTTP tới M1 thật rồi bỏ phản hồi **sau commit**. M2 vẫn RECEIVED/PENDING, M1 có đúng một snapshot và movement−1, tồnL1. Tắt writer; đổi catalog tên/SKU/giá/sizeXXL bằng API; chạy lại worker bình thường. Exact replay nhận snapshotL/giá100000/SKU cũ, M2 chuyểnEXCHANGE_SENT, movement/tồn không đổi. Ba vai trò API đọc cùng snapshot. Owner đọc lại đúng vùng hàng đã bàn giao; Customer xác nhận hoàn tất. Cờ writer/worker khôi phục sau test. Đây là fault có kiểm soát ở consumer, không phải khẳng định đã mô phỏng mất gói mạng hoặc ngân hàng thật.

Đã xem ảnh Owner pause và recovered trong lượt cuối. Snapshot/biên bản và nút làm mới đọc được. Ảnh full-page recovered có header/sidebar sticky ở vị trí cuộn; không dùng ảnh đó để tuyên bố nghiệm thu mọi hình học cuộn.

## Lượt thử không đạt và dữ liệu còn lại

Giữ `exchange-writer-runtime61-trial.json`: FAIL vì mã pause bị transport che. Cleanup dừng bán sản phẩm trước worker được phục hồi xử lý; request trial hiện RECEIVED/BLOCKED/EXCHANGE_VARIANT_UNAVAILABLE, không có dispatch/snapshot và không trừ tồn hàng đổi. Đây là dữ liệu test bị thu hồi, không được tính thành một chuỗi hoàn tất. Hai lượt61b/final có4requestCOMPLETED/4dispatch; cả5đơn gốc đã hoàn tất/thuCOD bằng API. Không sửa trạng thái/tiền/tồn bằng SQL hoặc xóa lịch sử để làm test qua.

`exchange-writer-ui61.json`:18PASS/1FAIL do fixture Admin cũ thiếu admin_context và danh tính Store/Customer mà sửa54 đã bắt buộc trước quyết định. Bổ sung dữ liệu fixture và giữ kỳ vọng quyền; không nới ứng dụng. `backend-unit-writer61b.json`:382PASS/3FAIL do assertion tìm `error.code` thay vì `ApiError.response.code`;61c sửa đúng chỗ đọc assertion, mã ứng dụng không đổi61b. Image61/61b và báo cáo được giữ làm lịch sử, không ghi đè.

Luồng này không thay sáu chuỗi cuối hoặc audit158. [Runbook](exchange-writer-rollback.md) ghi cách pause/restore, giới hạn in-flight và checkpoint. Provider thật, thiết bị thật, screen reader/nativezoom và nghiên cứu người dùng chưa được nhận là PASS.
