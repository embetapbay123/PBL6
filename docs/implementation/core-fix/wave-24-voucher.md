# Đợt50 — voucher Store/sàn và kết quả chưa rõ

Baseline gốc `fix-20261030T100153Z` giữ nguyên. Runtime nghiệm thu **Node50/AI50/frontend50-final**, stack riêng `pbl6-fe-verify`, desktop1440. Theo yêu cầu mới của người dùng, không chạy thêm mobile. **CR-013/F11 VERIFIED;34/52finding gốc đã xác minh,18còn mở. Chưa nghiệm thu toàn bộ ứng dụng hoặc sáu chuỗi trên cùng source cuối.**

Artifact ở `artifacts/core-fix/fix-20261030T100153Z/`. Không sửa dữ liệu demo hoặc triển khai production.

## P1 CF-050-01: sửa lượt dùng làm thay đổi số tiền khách trả

`voucher-cap-baseline49-run2.json` tái hiện qua UI49 và quote API thật: voucher giảm90%, không giới hạn tiền giảm, hàng100000 và phí giao20000 → khách trả30000. Owner chỉ sửa lượt dùng100→200, nhưng form tự gửi thêm `max_discount_vnd=50000`; quote sau đó thành70000. Đây là thay đổi điều kiện giảm ngoài ý định của người quản lý, chênh40000. Ca baseline không tạo đơn hoặc thu tiền, không tuyên bố đã phát sinh khoản thu sai.

Nguyên nhân ở `frontend/src/live/VoucherPanel.tsx`: form điền sẵn50000 khi voucher cũ không có cap rồi đưa vào request cập nhật. UI mới có lựa chọn rõ **Giới hạn số tiền giảm tối đa**. Không cap được giữ nguyên khi sửa trường khác; bật cap gửi số hợp lệ, bỏ cap gửi `null` tường minh. Giá trị0 vẫn hợp lệ theo contract. Chuyển sang FIXED bỏ cap không còn áp dụng. Thời gian cũ không bị cắt mất phần giây lẻ bởi input datetime-local.

`docs/contracts/openapi.json` làm rõ `VoucherUpdate.max_discount_vnd`: bỏ trường giữ nguyên, null bỏ giới hạn, số nguyên không âm đặt giới hạn. Create vẫn chỉ nhận số khi có trường, không nhận null. Regenerate DTO/runtime/FE/Python; repository vốn đã hỗ trợ cập nhật null, không cần DDL hoặc thay công thức giảm. Không thay lại ưu đãi snapshot của đơn cũ.

## Phục hồi thao tác và bản nháp

- Command form được quản lý ở panel: đang gửi hoặc chưa rõ kết quả thì không đóng/thay form, đổi trang hoặc gửi thao tác khác làm mất đối tượng. Có xác nhận bỏ bản nháp chưa lưu, bảo vệ chuyển route/back/unload. Thành công có thông báo còn thấy sau khi đóng form.
- Lỗi tạo mã trùng409 đã xác định cho phép sửa mã rồi gửi lại. Không biến mọi409 thành giao dịch UNKNOWN.
- Mất phản hồi POST tạo: khóa body/mã gốc, có GET đọc lại theo mã, hiển thị đúng bản ghi server và xác nhận quay lại danh sách. Không tự gửi POST từ GET lỗi. Nếu chưa tìm thấy, vẫn giữ trạng thái chưa rõ; người dùng chỉ được chủ động gửi lại đúng dữ liệu/mã ban đầu, không âm thầm sửa attempt. Ràng buộc mã duy nhất trên server ngăn tạo voucher thứ hai.
- GET đọc lại theo ID/mã bắt đầu từ trang1, không lệ thuộc trang đang xem. Tối đa100trang×100bản ghi; danh sách chưa đọc đủ hoặc lỗi không được coi là không tồn tại. Dữ liệu biến động giữa các GET không được tuyên bố là snapshot xuyên trang. Test riêng bản ghi sau100mục.
- Dừng/mở lại dùng version và đọc lại đối tượng; sửa voucher làm mất cache lượt dùng cũ để người quản lý đọc lại. Đơn đã chốt giữ giá/ưu đãi trước thay đổi.

Không khẳng định bản ghi tìm được theo mã chính là do request mất ACK tạo ra; UI công bố trạng thái server để người dùng đối chiếu. Không thêm endpoint, quyền hoặc chính sách voucher.

## Bằng chứng mới

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Unit Node50 |374PASS/51suite|`backend-unit-voucher50.json`|
| SQL cách ly |40PASS/3suite: administration, lifecycle, zero-due|`voucher-sql50.json`|
| Reader Python |9PASS contract suite; kiểm riêng6input hợp lệ/8input bị từ chối|`ai-contracts50.xml`, `voucher-reader50.json`|
| Edge desktop fixture |11PASS: cap, pending, duplicate, UNKNOWN, >100, draft và status|`voucher-ui50-final.json`|
| UI/API runtime cuối |2PASS, Store và sàn; thực POST thành công nhưng ACK bị cắt, chỉ1POST khi đọc lại|`voucher-cap-runtime50-final.json`|
| SQL M1/M2/M3/worker |2đơn CANCELLED,4voucher,2redemption giữ nguyên,0money; tồn10/reserved0, ledger10/0|`voucher-final-state50.json`|
| Source/image |392backend/43AI/291frontend-contract-test-config,10container khớp|`deployed-source-manifest-50.json`, `frontend-source-voucher50.json`, `runtime-image-voucher50.json`|

SQL mới ở `backend/tests/integration/voucher-administration.test.ts` chạy migrations thật trong schema tạm, kiểm Store/platform preserve→set→zero→remove cap, audit/version và stale409, từ chối input sai. Lifecycle kiểm giới hạn tổng/theo khách, thời hạn, dừng voucher, reserve/release/replay/commit cạnh tranh và rollback nguyên tử. Đây là integration với dữ liệu cách ly, không thay cho walkthrough thật hoặc provider thật.

Hai lượt runtime cuối bắt đầu từ menu Owner/Admin, sửa lượt dùng mà quote vẫn30000, chủ động đặt cap50000 → quote70000, bỏ cap →30000, dừng mã → quote bị từ chối, mở lại → dùng được. Sau đó tạo mã khác qua UI với ACK bị cắt sau201; đọc lại lấy đúng bản ghi, không POST lần hai. Đặt BUY_NOW COD có giảm90000/phải trả30000; sửa mã còn50% khiến quote mới70000 nhưng đơn cũ vẫn30000. Đọc lượt dùng qua UI, Customer hủy rồi đọc lại: đang giữ0/đã dùng1/còn199; không phục hồi lượt đã dùng.

SELECT độc lập xác minh voucher chính version7 với8audit, voucher tạo thêm version1 với2audit; không có bản ghi tạo trùng. Toàn bộ8Store/8sản phẩm fixture của baseline và các lượt thử đã khóa/dừng; không còn voucher50 active hoặc đơn50 chưa hủy. Giữ dữ liệu và lịch sử để đối chiếu.

## Lịch sử lỗi kiểm thử được giữ

`voucher-recovery-baseline49.json` có3FAIL thật: pending bị đóng/thay, duplicate code bị khóa và không có GET phục hồi tạo mã. Baseline cap đầu tiên dùng sai tên trường quote nên422, không dùng làm bằng chứng sai tiền; lượt run2 mới chứng minh P1. Trial runtime50 phân trang quá sớm trước khi GET hoàn tất, đã sửa điểm chờ bảng; không sửa hành vi mong đợi. Một trial fixture phát hiện canonical ISO `Z`/`.000Z`, code giữ chính xác timestamp thay vì làm yếu assertion.

Verifier SQL đầu dùng nhầm trạng thái COMMITTED. Repository hiện hành ghi **RESERVED kèm voucher_redemption** cho lượt đã dùng; release chỉ xử lý ACTIVE. `voucher-readback50-trial.json` ghi rõ lỗi harness. Verifier cuối yêu cầu đúng RESERVED, redemption/order snapshot và usage0/1/199 cùng lúc; không đổi enum hoặc dữ liệu để làm ca qua.

## Triển khai và phần còn lại

Triển khai reader AI50 trước Node50 rồi frontend trên stack test; không migration mới. AI/node generated reader đều nhận null của update. Khi tắt writer mới phải giữ reader tương thích50 cho lệnh đã phát sinh; không hạ reader49 rồi tiếp tục gửi null. Snapshot writer rollback37 vẫn là hạng mục riêng F18 chưa nghiệm thu, không lấy lượt voucher này thay thế.

Build backend/frontend, OpenAPI159public+14internal/7event và drift qua. Fresh public typings khớp byte-for-byte FE/backend; Windows từ chối lượt ghi trùng được ghi trong `public-typing-match50.json`. Main bundle còn cảnh báo kích thước đã có, không phải lỗi build.

Không provider tiền thật: hai đơn COD hủy trước thu, money ledger bằng0. USER_VALIDATION_PENDING; không giả số liệu người tham gia hoặc kiểm thiết bị thật. Giữ lịch sử mobile cũ nhưng mobile không còn điều kiện bắt buộc.18finding gốc và sáu chuỗi cuối vẫn cần hoàn thiện; F14 quản trị/phân quyền và các finding quan trọng còn lại là bước tiếp theo.
