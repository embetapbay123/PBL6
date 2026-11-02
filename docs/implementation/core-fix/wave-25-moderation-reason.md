# Đợt51 — Seller đọc quyết định kiểm duyệt để sửa sản phẩm

Baseline gốc `fix-20261030T100153Z` giữ nguyên, runtime **Node51/AI51/frontend51** trên stack riêng `pbl6-fe-verify`. **UX-15 VERIFIED;35/52finding gốc đã xác minh,17còn mở. F14 vẫn IN_PROGRESS**, còn CR-026/027 và UX-16/17 cần nghiệm thu đầy đủ. Không chạy mobile theo yêu cầu người dùng; chưa nghiệm thu sáu chuỗi trên cùng source cuối.

## Tái hiện trên baseline50

`moderation-baseline50.json` FAIL đúng điểm vướng: Admin nhập lý do thật rồi ẩn sản phẩm; Owner vào menu Store → sản phẩm → thao tác → chi tiết chỉ thấy ACTIVE/HIDDEN, không thấy lý do. API quản lý cũng thiếu quyết định, dù audit có lý do. Checkpoint HIDDEN ghi `reason_from_management_api=null`; hai Store fixture đã được khóa/dừng catalog trong finally. Không dùng screenshot đơn thuần để kết luận nghiệp vụ.

Đây là UX-15 đã có, không tạo ID bug mới hoặc coi là lỗi vượt quyền.

## Thay đổi

- `backend/catalog-service/src/catalog/catalog.repository.ts`: projection `moderation_decision` gồm trạng thái, lý do và thời điểm được đọc theo lô cho đúng tập product quản lý. Owner/Seller chỉ nhận từ danh sách/chi tiết đã giới hạn Store; Admin nhận trong danh sách kiểm duyệt và response quyết định. Không trả actor, raw audit, before/after hoặc dữ liệu Store khác.
- Chọn quyết định theo **version sản phẩm trước timestamp**. Một transaction bắt đầu sớm nhưng chờ khóa có thể commit version mới với timestamp sớm hơn; không được chọn nhầm lý do cũ chỉ vì ngày audit muộn hơn. Quyết định phải có version hợp lệ không vượt version sản phẩm, khớp trạng thái hiện tại và có lý do đúng giới hạn contract. Thiếu/mâu thuẫn dữ liệu legacy thì bỏ projection, không đoán lý do.
- `catalog.mapper.ts` chỉ đưa projection khi management reader đã cung cấp. Public list/detail không gọi projection riêng tư; integration và HTTP thật kiểm không có trường này sau bỏ ẩn/mở bán.
- `ProductModerationNotice.tsx` dùng chung trong chi tiết và editor Seller: lý do, thời điểm giờ Việt Nam, mã sản phẩm và hướng sửa; nói rõ lưu thay đổi **không tự bỏ ẩn**, cần Admin xem xét và vẫn phải mở bán. Legacy HIDDEN thiếu căn cứ được hiển thị đúng là chưa có lý do có thể đối chiếu.
- Admin card bổ sung mã sản phẩm, Store ID liên kết tới danh sách Store theo đúng ID, quyết định gần nhất và nút GET đọc lại danh sách. Đây mới là cải thiện một phần UX-16; chưa tuyên bố đủ nhãn Store/khách hoặc ngữ cảnh mọi vụ đổi trả.
- Contract Product có trường tùy chọn và mô tả management-only; regenerate Node/FE/Python/public typings. Không endpoint mới, không migration, không sửa lịch sử hoặc tự mở lại nội dung.

## Kiểm chứng

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Unit image51 |374PASS/51suite|`backend-unit-moderation51.json`|
| SQL cách ly mới |4PASS: quyền/projection, sửa–restore/public, thứ tự version/batch, legacy thiếu/mâu thuẫn|`moderation-sql51.json`|
| Python reader |9PASS contract suite|`ai-contracts51.xml`|
| Edge desktop |6PASS: lý do/time/escaping/legacy và hồi quy taxonomy/review/restoreDRAFT|`moderation-ui51-final.json`|
| UI/API thật |PASS Admin ẩn → Owner đọc/sửa → giữHIDDEN → restore giữSTOPPED → mở bán nhưng public không có lý do|`moderation-runtime51.json`|
| SQL M1/M2/M3 độc lập |4Store/4product kể cả baseline đã thu hồi hiển thị,0đơn/0money, quantity10/reserved0 và ledger10/0|`moderation-final-state51.json`|
| Source/image |393backend/43AI/296frontend-contract-test-config và10container khớp|`deployed-source-manifest-51.json`, `frontend-source-moderation51.json`, `runtime-image-moderation51.json`|

Integration chạy migrations thật trong schema M1 tạm có bảo vệ tên khi dọn, không sửa dữ liệu demo. Có ca timestamp ngược thứ tự version, quyết định tương lai hoặc trạng thái không khớp, lý do quá dài, thiếu legacy; không lấy một audit bất kỳ để dựng lý do hiện tại. Một query quyết định cho toàn management page, không query từng sản phẩm.

Runtime hai Store độc lập: Owner Store khác GET product bị404; Customer public GET lúcHIDDEN/STOPPED đều404. Sau Owner sửa mô tả, moderation vẫnHIDDEN và quyết định cũ đúng lý do. Admin restore ởversion3→4 giữSTOPPED; Owner chủ động mở bán sau đó thì public nhận sản phẩm nhưng **không có moderation_decision**. Store thứ hai không bị ẩn hoặc thay đổi nội dung. SQL cuối kiểm audit PRODUCT_HIDDEN/RESTORED đúng đối tượng/lý do và cleanup không thay tiền/tồn.

Đã xem hai screenshot desktop Admin/Seller. Không khẳng định kiểm screen reader, thiết bị thật hoặc có người tham gia; USER_VALIDATION_PENDING.

## Lịch sử thực thi và triển khai

Reader AI51 được triển khai trước Node51;9Python/374unit/4SQL qua trước bật Node. Sau lần người dùng tạm dừng, kiểm lại handle và report hiện hành: các suite đã xong, không khởi động lại chỉ do mất lượt quan sát. Frontend cũ đã dừng. Lượt Vite sandbox có socket nhưng host không nhận HTTP;6ca đầu lỗi kết nối, được giữ ở `moderation-ui51.json`. Chuyển Vite sang host, xác nhậnHTTP200 rồi chạy lại.

`moderation-ui51-host.json` có4PASS/2FAIL do fixture legacy kế thừa trường tùy chọn được generator điền sẵn. Sửa fixture để thật sự bỏ quyết định; giữ assertion không bịa lý do. Lượt cuối6PASS. Baseline50 lỗi thiếu lý do thật vẫn giữ, không đổi expectation để che lỗi.

Build frontend/backend, OpenAPI159public+14internal/7event và drift qua; main bundle còn cảnh báo kích thước đã có. Không migration mới. Rollback writer/reader không phá DDL; reader cũ bỏ trường mới sẽ làm mất thông tin UX-15, nên giữ reader/UI tương thích nếu quay lại bản writer cũ. Rollback snapshot writer37 và sáu chuỗi nghiệm thu cuối là phần F18 riêng chưa chốt.

Không deploy production hoặc commit.17finding gốc còn lại giữ nguyên phạm vi; ưu tiên tiếp nhận diện/quyền/quyết định Admin và các luồng còn thiếu bằng chứng. Đợt này không thay thế toàn bộ ma trận F14 hoặc các chuỗi mua/giao/hoàn tiền.
