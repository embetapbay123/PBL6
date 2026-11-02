# Variant cũ, taxonomy thay đổi và danh sách Store vượt100

Tiếp nối01/11/2026 trên `pbl6-fe-verify`, gateway18080/frontend3109. Runtime cuối **manifest29**; giữ các baseline26/27/28 và báo cáo thất bại làm lịch sử. Không có migration mới. HEAD vẫn `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree; không commit hoặc triển khai production.

## Các lỗi và thay đổi

### F02/F04/F07: variant legacy đang bán vẫn được báo giá

`legacy-quote-runtime-baseline26.json` tái hiện Product/variant ACTIVE nhưng thiếu trục Cỡ vẫn nhận báo giá200, trong khi thao tác ghi mới đã bị chặn từ26. Chỉ kiểm create/update không bảo vệ dữ liệu cũ hoặc cấu hình vừa thay đổi.

M1 nay kiểm Product, moderation, trạng thái taxonomy/variant, thuộc tính Product và từng trục variant ở cả quote và reserve mới. Cấu hình không khớp trả409 `VARIANT_CONFIGURATION_INVALID`; không ép kiểu NUMBER/BOOLEAN, `0`/`false` vẫn hợp lệ. Kiểm reserve nằm trong transaction, sau kiểm idempotency nhưng trước ghi giữ hàng. Một dòng sai làm toàn command không giữ dòng nào. Operation đã commit vẫn replay kết quả cũ, không giữ tồn lần hai khi cấu hình đã đổi; consume/release/restock cho đơn cũ tiếp tục hoạt động.

Luồng reserve khóa Product → Product type → variant theo thứ tự ID, rồi đọc lại cấu hình sau khi chờ khóa. Catalog writer dùng khóa chia sẻ trên Product type; Admin sửa/thêm definition khóa độc quyền cùng parent. Không dùng một JOIN có thứ tự khóa phụ thuộc query planner. SQL integration quan sát `pg_blocking_pids`, không lấy khoảng chờ tùy ý làm bằng chứng cạnh tranh.

HTTP thật trên29 xác nhận13nhánh:10đầu vào ghi/mở bán sai422; typed0/false201; legacy ACTIVE sai409; quote hợp lệ rồi Admin đổi size thì confirm409. Đọc API và M2 sau đó xác nhận **0đơn** cho các Customer của ca này. M1 không giữ tồn của giao dịch bị từ chối.

Checkout coi mã409 này là từ chối chắc chắn, cho người mua sửa lại đầu vào. Các kết quả mạng/5xx hoặc auth chưa rõ vẫn giữ nguyên attempt/body/key. Không áp cách xử lý mới này cho lỗi chưa xác định kết quả.

Vị trí chính: `catalog.repository.ts`, `moderation.repository.ts`, `inventory.repository.ts`, `inventory.service.ts` của M1; `CheckoutPage.tsx`.

### F07/F14: Admin đổi thuộc tính trong lúc Seller đang nhập

Các form tạo/sửa Product, thuộc tính và variant đọc lại taxonomy sau lỗi422 tương ứng, đồng thời giữ dữ liệu đang nhập. Không tự gửi lại mutation. Giá trị cũ ngoài lựa chọn được hiển thị có lỗi và có cách nhập lại; Seller chủ động chọn dữ liệu mới.

Hai walkthrough1440/390px dùng handler/database thật: nhập SKU và giá130001, chọn Xanh/M, NUMBER1/BOOLEANtrue → Admin bỏ Xanh → Add422 → lựa chọn cập nhật, SKU/giá/draft còn nguyên → chọn Đỏ và thêm thành công → sửa variant cũ → SQL xác nhận3variant đúng trục. Cùng ca còn kiểm create mất ACK, sửa legacy, giá nguyên VNĐ, reorder ảnh mất ACK và readback sau reload. Mỗi lượt đúng1CREATE audit; SKU`009264` giữ nguyên, giá100001; tồn/giữ0;1ảnh ACTIVE/1STOPPED.

Ảnh tại điểm lỗi: `taxonomy-change-runtime29-desktop/**/taxonomy-rejected-1440.png` và bản mobile390 tương ứng; đã xem trực tiếp. Ảnh chỉ là viewport Edge, không chứng minh thiết bị thật hoặc bàn phím ảo.

### CF-029-01 — P1: hơn100Store làm hỏng dependency contract

Lỗi phát hiện thêm trong đợt sửa, ghi riêng để không tăng số đã đóng của52finding gốc. Baseline27 có **102Store ACTIVE**; M3 trả đủ IDs nhưng schema `ActiveStores.ids` có `maxItems:100`. Validator của reader trả `DEPENDENCY_CONTRACT_INVALID`. Hai ca runtime tạo Product nhận503; các đường catalog/quote/review cùng dùng lookup này cũng chịu nguyên nhân đó theo phân tích mã. Không có phép đo HTTP catalog public trước sửa trong artifact baseline; không ghi đó là một lần chạy đã thực hiện.

Đã thêm cursor UUID `size<=100`/`after` vào GET nội bộ hiện có. Query SQL lọc ACTIVE trước limit và đọc thêm1dòng để xác định trang sau. Response có `next_after`; không còn áp trần100 lên response legacy đầy đủ. Không thêm giới hạn kinh doanh100Store và không dùng `LIMIT100` để âm thầm cắt danh sách hợp lệ.

Reader Node và Python đọc đủ các trang, giữ service identity/correlation và kiểm response từng trang. Trang lỗi, cursor lặp, cursor sai hoặc IDs lặp làm cả lookup thất bại; không dùng allowlist thiếu hoặc retry timeout. Riêng server legacy strict-query: chỉ khi **GET đầu tiên** trả422 `VALIDATION_FAILED` với `unknown field: size`, client thương lượng đúng1GET không query. Không fallback ở trang sau, lỗi validation khác, timeout hoặc mutation.

Runtime29 có104Store khi đo: cả hai reader đọc100+4IDs, catalog public200. SQL riêng kiểm205ACTIVE/2LOCKED,3trang, trang rỗng, cursor nhỏ, loại Store bị khóa trước khi đọc trang và không bỏ Store ngoài100đầu.

Đã kiểm reader-first thật với M3 image legacy `pbl6-node:fe-verify`: cả Node/Python nhận422 query mới rồi đọc đủ102IDs qua legacy GET; catalog200. Sau đó trả toàn bộ service/worker về29. Lượt28 đã thất bại vì chưa thương lượng strict query và được giữ làm bằng chứng; không ghi28 là rollout thành công.

Vị trí: contract `internal-api.json`; `shared/src/internal-clients.ts`; `store.repository.ts`/`store.service.ts` và hai controller M3 cùng dùng service; Python `app/internal_client.py`. Generated DTO/type/fixture được đồng bộ. Không thay public endpoint hoặc quyền service caller.

## Gate cuối và hậu điều kiện

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Backend unit |365PASS/51suite|`backend-unit-store-pages29.json`|
| SQL schema riêng M1/M3 |44PASS/4suite|`store-pages-stock-integration29.json`|
| Python client/contract/catalog/pool |24PASS|`ai-store-pages29.xml`|
| Edge fixture checkout và form |29PASS|`taxonomy-checkout-fixture29.json`|
| HTTP taxonomy/quote/confirm |13nhánh PASS trong1test|`legacy-quote-confirm-runtime29.json`|
| Seller UI1440/390 |2PASS|`taxonomy-change-runtime29-desktop.json`, `taxonomy-change-runtime29-mobile.json`|
| CH06 cùng Store/variant/3đơn |PASS29|`stock-chain-taxonomy29.json`|
| SQL/audit cuối và cleanup |PASS|`taxonomy-checkout-final-state29.json`|
| Node/Python trang thật và reader-first |PASS|`active-store-pages-runtime29.json`, `ai-store-pages-runtime29.json`, `active-stores-reader-first29.json`, `ai-reader-first29.json`|
| Build/contract/drift/docs |PASS|`taxonomy-checkout-acceptance29.json`|

CH06 lại đạt quantity9/reserved0/version10,10movement liên tục, hủy online RELEASED, hủy COD RESTOCKED, đơn bán COMPLETED và đúng1COLLECTION120000. Nhân viên chỉ có quyền kho bị403 khi đọc product/order/audit; thu hồi quyền khiến dialog/đối chiếu đang mở không đọc tiếp. Taxonomy của ca kho nay được tạo riêng, không lấy loại ACTIVE do ca catalog khác sở hữu.

Đọc cuối xác nhận Product/taxonomy `corecheckout-*` không còn ACTIVE, dữ liệu giao dịch và audit được giữ. Mỗi ca Seller có3variant đúng kiểu/đúng màu,1CREATE audit; Customer của confirm sai có0đơn. Không xóa dữ liệu demo hoặc tăng/bỏ rate limit đăng ký.

Node image cuối `e9f6e0c2817cbcd3c349b9439d8bce7834b57e0fe60941d90950ae002a9898ce`, source263file khớp manifest29. AI image `39a6275dd3ea3be90e0514693870779151afca64cb094dfb9f4a09e144a93b7a`, source42file khớp. Bảy Node service/worker và hai AI service/worker đã được đối chiếu image/running; manifest frontend/contract/test cuối206file giữ riêng, không sửa hash cũ. Overlay AI riêng là `artifacts/compose-core-fix-store-pages28.yaml`; overlay M3 legacy chỉ dùng kiểm compatibility, không dùng cho chạy bình thường.

## Lượt lỗi và giới hạn còn giữ

- Hai lỗi harness SQL27 (`reservation` thay vì `inventory_reservation`, và fixture trước còn reservation) được giữ; sửa setup riêng, không đổi hậu điều kiện nghiệp vụ. Gate cuối44PASS vẫn kiểm không ghi một phần/chống lặp.
- Lượt mobile27 đọc notice thành công của lần lưu trước quá sớm; thêm chờ variant thứ3 và phản hồi PATCH mới. Đồng thời ca kho đã dùng nhầm taxonomy ACTIVE của ca catalog, khiến cleanup catalog gặp Product còn ACTIVE. Tách taxonomy test và giữ nguyên assertion. Lượt29desktop/mobile/CH06 đều qua; không chấm lượt lỗi trước thành PASS.
- Thử pin manifest image cũ qua Compose không thành công; không có bằng chứng reader-first từ lượt đó. Đã dùng tag legacy kiểm tồn tại, cấm pull/build và kiểm lại HTTP thật thành công; runtime cuối được khôi phục và kiểm image đủ9container.
- Legacy listing chưa được tự động ẩn hàng loạt khi taxonomy bị sửa; việc mua mới bị chặn có lý do. Còn cần review trải nghiệm Customer và đưa hàng đã sửa đến checkout thành công xuyên nhiều Store.
- Phân trang đọc trạng thái hiện hành từng trang; đây không phải snapshot nhất quán xuyên M1/M3 hoặc khóa Store trong toàn checkout. Vẫn hợp nhất allowlist trong request; chưa nghiệm thu tải lớn/toàn ma trận đổi quyền và khóa Store đồng thời.
- Ảnh SVG localhost có route kiểm soát; provider tiền/AI thật, cảm ứng, native zoom, screen reader và nghiên cứu với người thật chưa được chứng minh ở lượt này. Identity setup Seller/API là seed có guard trong M3 riêng, không gọi đó là nghiệm thu đăng ký; CH06 dùng đăng ký/capture thật.

**Vẫn9/52finding gốc VERIFIED,43chưa đóng đầy đủ.** CF-029-01 đã sửa và xác minh trong phạm vi trên, không cộng vào9finding gốc. F07/UX-09 và F04/F14 rộng vẫn PARTIAL. CH06 cập nhật bằng chứng29; CH01–CH05 vẫn21 và cần chạy lại trên cùng source cuối. Phần tiếp theo ưu tiên cạnh tranh giỏ/voucher/tồn nhiều Store và ma trận finding, chưa nghiệm thu toàn bộ vận hành.
