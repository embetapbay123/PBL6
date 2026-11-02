# Đợt 60 — Đọc lại báo cáo, nhật ký và hàng chưa bàn giao

**Đã đóng các giả thuyết phân trang còn lại và sửa thêm CF-060-01 về lịch sử Back. 52/52 finding gốc vẫn VERIFIED; mục tiêu tổng vẫn ACTIVE.** Chưa nghiệm thu toàn hệ thống: F00/F18 còn rollback snapshot writer, sáu chuỗi chung baseline cuối và rà coverage158nhiệm vụ. Không chạy mobile theo yêu cầu; nghiên cứu người thật vẫn `USER_VALIDATION_PENDING`.

Stack riêng `Node56/AI56/frontend60`, gateway18080/frontend3109. HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Chỉ sửa frontend/test; backend/AI/contract/migrations giữ nguyên56. Manifest59 và lịch sử review không bị ghi đè; không commit hoặc triển khai production.

## Những lỗi đã xác minh

**Mở rộng CF-059-01 — P2, cache tổng cũ và tự clamp trước khi GET mới kết thúc.** Sáu ca trước sửa đều FAIL tại báo cáo tiền/khoản chưa rõ ngày của Owner/Admin, nhật ký Owner và hàng đã trừ chưa bàn giao. Các query đó giữ tổng20 hoặc10 dù danh sách tăng21 hoặc11, làm người dùng không tới trang mới. Cùng nguyên nhân với59, không đếm thành sáu bug mới.

`FinancialReport.tsx` đọc mới cả tổng hợp và hai danh sách khi quay về; `StoreAuditPage.tsx`/`StockCommitments.tsx` cũng dùng `staleTime:0`. Chỉ hiệu chỉnh trang sau GET hiện tại thành công và hết fetching. Khi đọc lại trang rỗng cache, UI báo loading, không khẳng định empty; GET lỗi giữ đúng URL, có thử lại rõ ràng. Tổng tiền và lịch sử thiếu ngày không âm thầm dùng tổng cache cũ khi các dòng đã đọc mới. Nhãn phân loại trong commitments dùng chung `variantLabel`; nối CF-058-01, không tạo ID trùng. Dữ liệu thiếu thuộc tính không bị tự gọi là đơn cũ hoặc dựng lịch sử từ catalog hôm nay.

**CF-060-01 — P2, CONFIRMED → FIXED/VERIFIED: tự sửa trang làm sai lịch sử Back.** Money/gaps của Owner/Admin, commitments và ba hàng đợi đơn dùng push khi tự sửa trang không còn tồn tại. Một lần Back quay vào URL vượt giới hạn hoặc bị đưa lại trang vừa xem; các trường hợp hàng đợi có thể lặp lại việc này. Có đường dùng menu khác, không phải mất dữ liệu hoặc ghi sai tiền. `page-history-baseline60.json`: **8FAIL,1PASS đối chứng Owner audit** vốn dùng replace đúng.

Sửa `OrderListTools.tsx`, `OrderHistoryPage.tsx`, `AdminLiveData.tsx`, `SellerWorkspace.tsx`, `FinancialReport.tsx`, `StockCommitments.tsx`: tự sửa trang dùng `{replace:true}`. Thao tác đổi trang, tìm hoặc lọc do người dùng chủ động vẫn push bình thường. Regression dùng Back rời công việc và Forward trở lại trang đã hiệu chỉnh; các ca Back/Forward/bộ lọc thủ công cũ vẫn giữ.

## Bằng chứng mới

Artifact root: `artifacts/core-fix/fix-20261030T100153Z/`.

| Bằng chứng | Kết quả và phạm vi |
|---|---|
| `operational-page-baseline59.json` | 6FAIL đúng biểu hiện giữ tổng cũ. |
| `operational-page60.json` | 6PASS sau sửa freshness/clamp/GET-error; trước khi bổ sung ca lịch sử. |
| `page-history-baseline60.json` | 8FAIL/1PASS, phân biệt lỗi push với control Owner audit đã replace. |
| `operational-history-ui60.json` | **54PASS**, browser desktop: cả các ca mới và hồi quy báo cáo, timezone, quyền, audit, kho, hàng đợi, Back/Forward. Các nhánh mobile cũ được giữ mặc định CI, bỏ trong lượt này bằng flag. |
| `operational-readback-runtime60-final.json` | **1PASS**, Owner/Admin UI thật và API/worker thật; fault503 chỉ ở phản hồi GET sau khi server đã đọc, không giả mutation hoặc tiền. |
| `operational-final-state60.json` | SELECT độc lập xác nhận tiền, audit, kho và cleanup cả ba lượt; chi tiết bên dưới. |

Trong walkthrough cuối, chuẩn bị20đơn COD hoàn tất và20sự kiện CREATE Product bằng API. Owner vào báo cáo qua Store Portal, đặt kỳ theo giờ Việt Nam rồi mở liên kết trang2 đã lưu để kiểm X04. Khi chỉ20khoản thu, hệ thống hiệu chỉnh về1. Phiên API khác hoàn tất đơn21; Owner thực sự về màn Home đã render rồi Back. Tổng hợp và danh sách cùng phản ánh **2520000 /21khoản thu**. GET trang2 đã đọc21dòng tổng/1dòng trang được giữ và trả503 có kiểm soát; URL vẫn trang2, thử lại GET mở đúng dòng. Admin vào báo cáo qua menu, lọc đúng Store/kỳ, cùng tổng/dòng và không bịa khoản lịch sử thiếu ngày.

Tương tự, Owner lọc nhật ký CREATE/Product:20→21sự kiện, trang2 đọc lại đúng một sự kiện; giữ bộ lọc và phục hồi GET503. Chuẩn bị20đơn PENDING đã consume, lọc commitments theo SKU, mở liên kết trang3 đã lưu; khi tổng20 về trang2. Thêm đơn21, rời/quay lại thấy21, tới trang3 và thử lại GET lỗi đúng trang. Dòng lấy từ snapshot món/SKU của đơn, tổng đã trừ/chưa bàn giao không bị gọi là tồn vật lý. Nguồn lịch sử chưa rõ ngày có hàng chỉ kiểm HTTP fixture; Store mới thật có0hàng legacy, không tạo lịch sử tiền giả để làm ca qua.

Đã xem ảnh tiền/audit/commitments ở thư mục `operational-readback-runtime60-final`. Dòng tiền, người thao tác/đối tượng và hàng cần bàn giao đọc được. Ảnh crop main của audit có sticky header ở phần mô tả phía trên; không dùng ảnh này để kết luận toàn trang không bị che ở mọi vị trí cuộn. Layout không đổi trong đợt này.

## Các lượt lỗi được giữ nguyên

- `operational-readback-runtime60-trial.json`: FAIL ở tổng20 sau Back, nhưng harness chưa đợi Home render nên chưa chứng minh đã rời report. Không dùng làm bằng chứng bug mới. Run2/final đã thêm điều kiện Home hiển thị và ghi các GET để xác minh việc rời/quay lại thật.
- `operational-readback-runtime60-run2.json`: PASS trước sửa lịch sử tự clamp; giữ làm bằng chứng giai đoạn, không thay lượt cuối.
- `operational-ui60.json`: 27PASS/1FAIL ở fixture Admin audit cũ. Nó suy diễn actor thiếu ID thành System, trái quy tắc đã sửa53. Fixture nay giữ riêng actor thiếu ID và thêm System bằng mã hệ thống tường minh; kiểm cả nhãn thiếu lẫn System, không thay ứng dụng hoặc bỏ kỳ vọng quyền/danh tính. Bộ Admin audit53 cũng được chạy hồi quy trong54ca cuối.

## Hậu điều kiện và giới hạn

SELECT cuối trên ba lượt: **3Store LOCKED,62Product STOPPED,62dòng inventory khớp ledger/reserved0;105đơn gồm63COMPLETED và42CANCELLED.63khoản thu thủ công tổng7560000, hoàn0/refund0,62CREATE audit đúng một lần/sản phẩm.** Mỗi Store còn quantity89 của variant bán, các variant draft còn0; đơn hoàn tất giữ consume, đơn hủy đúng một reserve/consume/restock. Không sửa tiền/tồn/trạng thái đơn bằng SQL, không xóa lịch sử. Đây là xác nhận COD trong fixture, không phải tiền mặt/ngân hàng thật.

`frontend-source-operational60.json`, `source-match-operational60.json`, `runtime-image-operational60.json`: **395backend/43AI/322frontend-contract-test-config/10image** khớp, backend/AI unchanged56. Không tuyên bố chạy lại backend unit/integration/Python trong60. Build frontend2076modules, còn cảnh báo main chunk lớn cũ. Contract/drift/docs/typing/whitespace/secret cuối ghi tại `operational-gates60.json`; chỉ chốt khi tất cả PASS.

F18 còn các việc bắt buộc nêu đầu báo cáo. Các giả thuyết cache ở money/gaps, Owner audit và commitments đã được tái hiện và xử lý; không giữ chúng thành câu hỏi chưa làm hoặc tự đóng sáu chuỗi từ kết quả này. Không báo PASS cho mobile, native zoom, screen reader, thiết bị thật hoặc nghiên cứu người thật chưa thực hiện.
