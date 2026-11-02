# F09 — đổi đúng phân loại và giữ chứng cứ hàng đã gửi

01/11/2026. PROGRESS của toàn bộ52 finding/F00–F18/sáu chuỗi, không thay mục tiêu bằng riêng đổi hàng. **Vẫn17/52 finding gốc VERIFIED,35 còn chưa nghiệm thu đầy đủ.** P1 bổ sung **CF-037-01** được sửa/xác minh riêng; không đếm lại thành UX-08 đã đóng.

Stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. **Node37/frontend37/AI37**; M1 thêm014, M2 thêm022, M3 không migration mới. Giữ baseline, source manifest và mọi báo cáo lỗi trước đó.

## Lỗi đã chứng minh và sửa

Baseline36: Customer mua phân loại gốc, Store gửi size L thật qua M1; tồn L đã trừ nhưng Customer chỉ nhận `items` của món gốc và mã bàn giao. Không có danh tính hàng thực sự đã xuất để kiểm khi nhận. `exchange-baseline36.json` và checkpoint/ảnh cùng thư mục chứng minh bằng UI/API/database/worker thật. Chưa có chứng cứ giao nhầm kiện vật lý; không tuyên bố sự cố đó đã xảy ra.

M1 nay chụp tên, SKU, thuộc tính, variant/product/Store, lượng, đơn giá đối chiếu và thời điểm **cùng transaction xuất kho**. Receipt giữ snapshot bất biến, retry sau mất ACK trả lại dữ liệu cũ; sửa catalog không thay bằng chứng hàng đã giao. M2 kiểm schema và đối chiếu từng dòng với command/Order rồi lưu snapshot ACK. Snapshot sai identity không được báo EXCHANGE_SENT, giữ trạng thái cần đối soát và retry lệnh cũ.

Customer, Seller/Owner và Admin có hai phần riêng: **Hàng đã mua ban đầu** và **Hàng đổi đã bàn giao**. Nhãn SKU/đơn giá nói rõ mốc xuất hàng đổi; không gọi SKU của hàng đổi là SKU lúc mua. Thời điểm hiển thị UTC+7. Đơn đổi cũ thiếu snapshot nói rõ phải đối chiếu tham chiếu với Store, không dựng lịch sử từ catalog hiện tại.

UI gửi đổi yêu cầu chọn rõ từng phân loại; không tự dùng lại món gốc. Lựa chọn khác giá/ngừng bán được giải thích và disabled; thiếu giá đã mua, lỗi đọc metadata hoặc lựa chọn không hợp lệ thì không gửi bàn giao. Có nút đọc lại metadata. M1 tiếp tục là nơi quyết định giá/tồn/trạng thái hiện hành; UI không giả hết hàng hoặc thay quy tắc khác giá.

Walkthrough nhận thiếu rồi sửa cho đủ còn phát hiện tên trường nhập bị lẫn giá trị đã điền trong DOM label. Đã tách label và liên kết ID cho loại/lý do yêu cầu, trách nhiệm, hướng dẫn, quyết định, kiểm hàng và nội dung phản hồi. Không gọi đây là bằng chứng đã dùng screen reader thật. Trang đang APPROVED có đề nghị chuyển hoàn tiền cũng được polling có giới hạn; không tự gửi mutation khi đọc dữ liệu.

Mã chính: M1 `inventory.service.ts`/migration014, M2 `returns.runner.ts`/`returns.service.ts`/migration022; `ReturnActions.tsx`, `ReturnRequestView.tsx`, `OrderReturnsPanel.tsx`, `ReturnsPage.tsx`, `OrderPresentation.tsx`. Contract bổ sung field tùy chọn, vẫn159public/14internal, không thêm enum trạng thái hay thay amount/kernel tồn.

## Hành trình đã chạy thật

Hai lượt UI1440/390, mỗi lượt có Customer và Owner bằng browser context độc lập, cùng đối tượng xuyên suốt. Dữ liệu tài khoản được seed xác minh trong M3 riêng; không coi đó là nghiệm thu đăng ký/email.

1. Đơn COD đã thu120000 (hàng100000/phí20000) → Customer tìm đơn qua menu/lịch sử → chọn EXCHANGE/gửi lý do trong UI → Owner đi Store Portal/Đổi trả, kết luận Store chịu phí. Customer thấy địa chỉ nhận trả/hướng dẫn và phí.
2. Owner ghi biên bản chưa nhận đủ, trạng thái vẫn APPROVED, không tự cộng tồn. Sửa số thực nhận thành1/bán lại1; worker xác nhận kho, tồn gốc9→10.
3. Owner chọn L rõ ràng, XL120000 bị chặn khác giá; nhập tham chiếu bàn giao thủ công. Kho trừ L3→2, snapshot L/SKU/tên cũ hiện cho hai vai trò. API sửa tên, SKU, giá L110000 và thuộc tính thànhXXL; Customer/Owner/Admin đọc vẫn đúng L/SKU100000 lúc xuất. Chỉ Customer của đơn được xác nhận đã nhận; Owner gọi endpoint Customer404. Customer xác nhận COMPLETED qua UI.
4. Đơn COD thứ hai yêu cầu EXCHANGE riêng. Đưa phân loại đổi về cùng giá, Owner chọn rồi một điều chỉnh kho thật làm hết hàng trước xác nhận. M1 từ chối, request BLOCKED, không có snapshot/dispatch giả.
5. Owner gửi đề nghị hoàn tiền cạnh tranh với lệnh bàn giao cùng version: một200/một409. Nếu nhánh bàn giao thắng nhưng bị hết hàng thì chờ BLOCKED rồi gửi đề nghị mới có version mới; không ép SQL quyết định bên thắng.
6. Chưa có consent, type vẫn EXCHANGE/tiền chưa hoàn. Customer đồng ý qua UI, handler commit rồi bị mất ACK503; retry giữ đúng body/operation ID. Chỉ một ACCEPT_REFUND trong lịch sử. Giữ original_type EXCHANGE, chuyển REFUND sau consent.
7. Owner xác nhận đủ COD120000 bằng biên nhận/thời điểm/người nhận/attestation, hoàn tất yêu cầu; Customer nhận cập nhật. Đây là xác nhận thủ công, không phải ngân hàng kiểm chứng.

Chuẩn bị đơn/giao/thu trước hành trình sau bán, stock race, sửa catalog và một phần bước nhận của đơn thứ hai dùng HTTP thật; không báo tất cả đã bấm bằng UI. Admin snapshot được kiểm HTTP/schema/SQL, chưa phải walkthrough Admin thật. Các ảnh/assertion/viewport không được cộng thành nhiệm vụ mới.

## Gate và hậu điều kiện

Artifact dưới `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Backend unit |365PASS/51suite|`backend-unit-exchange37.json`|
| PostgreSQL M1/M2 isolated |60PASS/8suite|`exchange-integration37.json`|
| Hồi quy UI trước chỉnh nhãn SKU cuối |85PASS/11file, không đổi behavior sau đó|`after-sale-fixtures37-final.json`|
| Component dùng chung và return sau chỉnh nhãn |23PASS, nằm trong85unique, không cộng thành108|`exchange-presentation-ui37.json`|
| Runtime1440 cuối |PASS, hai hành trình|`exchange-runtime37-desktop-accepted.json`|
| Runtime390 cuối |PASS, cùng mục tiêu|`exchange-runtime37-mobile-accepted.json`|
| Python bundle/catalog/network |24PASS|`ai-contracts37.xml`|
| SQL cuối |PASS|`exchange-final-state37-accepted.json`|
| Source/image |Node270/frontend-contract-test-config241/AI43+index;10image khớp|`runtime-image-exchange37.json`|

SQL isolated thêm kiểm ACK mất sau M1 commit, sửa catalog rồi retry vẫn snapshot cũ, snapshot response bị sai variant không được báo đã gửi, và cạnh tranh dispatch/proposal. Biên nhận M1 và snapshot M2 không cho sửa/xóa im lặng. Đây là RPC/service fixture tường minh, không thay bằng chứng HTTP/worker thật.

Readback cuối chọn đúng2lineage UI accepted:4Order/4Return COMPLETED/APPLIED;2EXCHANGE và2REFUND chuyển loại có consent. Hai dispatch snapshot M1=M2, mỗi hàng đổi1L/100000/SKU cũ trong khi catalog hiệnXXL/SKU mới. Sáu variant đối chiếu ledger: M10/0, XL2/0, XXL0/0 mỗi Store; chỉ4movement nhận trả và2movement gửi đổi. Hai đơn đổi giữ khoản thu,0refund; hai đơn chuyển hoàn có2receipt Owner/2refund đủ120000, tổng hoàn240000. Có6money movement, không tạo online attempt. Consent lặp chỉ một event/đơn.

## Chuyển tiếp, lịch sử lỗi và giới hạn

- Migration014/022 chạy khi36 còn hoạt động; kiểm trước–sau110money movement,1071stock movement và4dispatch receipt không đổi. Không có return job đang PENDING. Tất cả snapshot cũ vẫnNULL, không backfill tên/SKU từ hôm nay: `exchange-migration37-before.json`, `exchange-migration37-after.json`.
- Triển khai M2 reader/consumer37 trước M1 writer37 để nhận field mới. Giữ reader/consumer37 khi cần thu hẹp writer; không downgrade sang response validator cũ trong lúc producer gửi snapshot mới. Chưa diễn tập riêng rollback snapshot writer trong đợt này; không lấy writer-off proof hoàn tiền36 thay cho việc đó.
- AI được build generated schema37, copied endpoint index khớp; operation count không đổi. Overlay `compose-core-fix-exchange37.yaml` đặt sau overlay36; image36 cũ giữ nguyên.
- Fixture đầu dùng Product status không đại diện ACTIVE/VISIBLE; cập nhật đúng tiền điều kiện. ErrorView có nút Thử lại và native disabled option làm selector/assertion cũ không phù hợp; kiểm alert và disabled attribute thật. Không bỏ guard giá hoặc đổi expected business để làm xanh.
- Runtime đầu dừng ở selector label loại/trách nhiệm; lượt sau bộc lộ label kiểm hàng có giá trị cũ sau nhận thiếu. Đã sửa label ứng dụng và kiểm lại đầy đủ. Các report lỗi/ảnh/checkpoint được giữ, không gọi chúng PASS.
- `exchange-final-state37.json` giữ readback trước tinh chỉnh từ ngữ; bản accepted chọn hai lượt cuối. Các lượt chạy lại không tăng số nhiệm vụ.
- Product/taxonomy có tag đều STOPPED. Đã Admin khóa hiển thị6Store test đã kết thúc (gồm baseline/lượt trước), Guest bị chặn. Hai case từ harness thất bại còn REQUESTED/APPROVED nhận0, giữ nguyên để phục hồi, không fake hoàn tất/khóa người xử lý. Chúng không nằm trong4đơn nghiệm thu cuối: `exchange-visibility37.json`.
- **UX-08/F09 vẫn PARTIAL:** còn nghiệm thu đơn nhiều dòng chỉ sai một món nhưng phải xử lý toàn đơn, ma trận nhân viên chỉ quyền đơn/metadata, các biên concurrency/quyền/rollback rộng và final CH04/CH05 cùng baseline. OP-01/giao thất bại không được đóng từ các ca exchange này. CH01–05 gần nhất21/CH06 gần nhất29 vẫn cần chạy cùng source cuối.
- Chỉ Edge viewport1440/390, thêm768/1024 ở fixture trước; chưa native zoom, screen reader, bàn phím ảo, thiết bị thật, giao/nhận kiện vật lý hoặc nghiên cứu người dùng. USER_VALIDATION_PENDING. Chưa kết luận sẵn sàng vận hành.
