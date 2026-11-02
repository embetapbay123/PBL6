# F02 — chọn phân loại theo tồn khả dụng thật

02/11/2026. **UX-01 VERIFIED**, tổng **21/52 finding gốc VERIFIED,31 còn mở**. Nối bằng chứng nhận diện/snapshot của các đợt25/29/37/40 với kiểm tra khả dụng ở đợt41; không đóng F08 hoặc F18 thay cho các finding riêng. Chưa nghiệm thu toàn marketplace.

Baseline mới **Node41/AI41/frontend41**, cùng HEAD cũ và working tree được hash riêng; không sửa baseline review. Manifest387file backend,43file AI,256file frontend/contract/test/config;10container khớp image, simulator tiền giữ37 có chủ đích. Không migration mới; M1_014/M2_022/M3_013 giữ nguyên.

## Sửa hành vi

Public ProductVariant có `available_quantity` từ quantity thương mại trừ reserved_quantity của đúng variant/Store; thiếu inventory trả0. Không công khai quantity/reserved hoặc ledger riêng của Store. Product có `variant_axes` lấy tên thuộc tính cấu hình của đúng product type. Hai trường bổ sung **optional** để reader mới vẫn đọc response cũ. Query variant/kho, ảnh và trục được batch theo tập sản phẩm; không tìm trong100sản phẩm đầu hoặc gọi mỗi variant một query.

Chi tiết và chooser catalog phân biệt hết hàng với ACTIVE, bỏ qua default đã hết hàng khi khởi tạo. Hiện giá trị và tên trục có nghĩa, SKU chỉ bổ trợ. Giá card ưu tiên tập phân loại có thể mua; không dùng giá thấp nhất của món hết hàng khi có món khác còn hàng. Số tồn là thông tin vừa đọc, chưa giữ hàng; checkout vẫn kiểm giá/tồn tại server.

Giữ phân loại và lượng khách đã chọn khi đọc lại tồn, kể cả giờ không đủ; không tự đổi sang size khác hoặc giảm lượng. Nút đọc lại chỉ GET; lúc đọc/lỗi đọc, thông tin cũ không được dùng để bấm mua. Retry không gửi lại mutation. Response cũ sau chuyển sản phẩm bị loại bằng generation. Response cũ thiếu số tồn ghi rõ chưa biết, không giả0 hoặc khẳng định còn hàng; đây cũng là đường rollback tương thích.

## Bằng chứng theo lớp

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Baseline trước sửa |3FAIL theo hành vi mong đợi, giữ nguyên lịch sử|`availability-baseline40.json`|
| Node unit |366PASS/51suite|`backend-unit-availability41.json`|
| PostgreSQL integration |73PASS/6suite; availability, batch, search, after-sale, recovery|`availability-integration41.json`|
| Hồi quy Edge |84PASS/8file; gồm3ca availability|`availability-regression41-final.json`|
| Edge biên và layout |9PASS; gồm3ca đã có, thêm hết toàn bộ, GET về muộn,1440/1024/768/390|`availability-edges41.json`|
| Runtime1440/390 |Mỗi viewport1PASS trên dữ liệu riêng, UI→HTTP→worker thật|`availability-runtime41-desktop-run2.json`, `availability-runtime41-mobile.json`|
| SQL hậu điều kiện |4đơn/6variant, ledger khớp,0thu/0hoàn|`availability-final-state41.json`|
| Python |18contract/Store/network +12algorithm PASS|`ai-contracts41.xml`, `ai-algorithms41.xml`|
| Reader→writer→rollback→restore |5probe PASS, read được cả DTO cũ/mới, không biến động tiền/kho trong cửa sổ probe|`availability-stage41-{baseline,readers,writer,rollback,restored}.json`|
| Hash/image |387backend/43AI/256frontend-contract-test-config,10container khớp|`image-source-match-41.json`, `ai-image-source-match41.json`, `runtime-image-availability41.json`|
| Thu hồi hiển thị |3product/type/category STOPPED,3Store LOCKED qua AdminAPI; giữ giao dịch/audit|`availability-visibility41.json`|
| Build/contract/docs/whitespace/secret |PASS;170docs,17file đổi/mới không trailing whitespace,1371text artifact không khớp secret runtime|`availability-acceptance41.json`, `artifact-secret-scan41.json`|

84+9 có3ca trùng; **90ca fixture khác nhau**, không gọi thành93ca hoặc số nhiệm vụ đã review. SQL integration là DB thật với transport test cô lập, không tự gọi là API/provider thật. Runtime dùng identity test seed có tag, không thay nghiệm thu đăng ký/xác minh email.

## Hai lượt thực tế

Mỗi lượt có3size: defaultM tồn0, L tồn3, XL tồn2. Customer đi từ search→catalog chooser→chi tiết, nhận biết M không mua được và chọn L bằng giá trị có nghĩa. Lượng4 bị chặn; chọn L×2 tới quote. Tài khoản khác tạo đơn online chưa trả, giữ2: API kho3/reserved2/khả dụng1, public cũng1. Customer xác nhận quote trước đó nhận409 `INSUFFICIENT_STOCK`, không có đơn.

Server từ chối trong prepare trước INSERT checkout_attempt; verifier đầu tiên kỳ vọng6attempt nênFAIL. Đọc lại runner/calculation và SQL cho thấy chỉ4attemptCOMMITTED của4đơn đã tạo; không có durable FAILED row cho2request bị từ chối sớm. Verifier sửa theo điểm giao dịch thực tế, giữ nguyên assertion zero đơn/không oversell/HTTP409. Không bịa2attemptFAILED.

Quay lại sản phẩm giữ L×2, báo không đủ và chặn mua. Hủy đơn giữ hàng bằng API; đọc lại giá/tồn qua UI được3, vẫn L×2. Đặt COD thật chuyển PENDING, quantity1/reserved0; hủy thật về quantity3/reserved0. Cả4đơn cuối CANCELLED, SANDBOX có RELEASED, COD có RESTOCKED; movement quantity/reserved cân bằng và không có money_movement.

Runtime desktop lần đầu chỉFAIL giả định harness phải chọn L trước XL; thứ tự SQL không cam kết. Sửa harness kiểm không chọn M và tự chọn L, không thêm quy tắc tự chọn theo giá/thứ tự chưa được duyệt. Giữ report lỗi. Fixture lần đầu có1race do bật GETfailure trước initialread xong; chờ nút refresh sẵn sàng rồi kiểm lỗi. Không sửa expectation nghiệp vụ để che lỗi.

## Tương thích và giới hạn

Reader/consumer41 được chạy trước M1writer41. Probe baseline37, readers41/writer37, writer41, M1rollback37, restore41 đều đọc theo contract mới, healthM1/M2/M3 tốt và ledgercount cố định1503stock/150money trong cửa sổ này. **Rollback41→37 chỉ xác minh hai trường catalog optional; chưa thay bài rollback snapshot writer37 còn mở.** Không thực thi migrationSQL mới.

Đã đọc ảnh390px: tên trục/giá/tồn đọc được, refresh và CTA không bị dock che; kiểm DOM không tràn ngang, keyboard kích hoạt refresh và hit-test CTA ở4độ rộng. Đây là Edge viewport, chưa phải bàn phím ảo/nativezoom/screenreader/thiết bị vật lý. Không có provider ngân hàng/giao hàng thật hoặc nghiên cứu người thật: `USER_VALIDATION_PENDING`.

UX-01 đóng dựa trên nhận diện nhiều Store/12variant/snapshot cũ ở40 và số tồn/trục/biên lựa chọn/race ở41, cùng các gate nguồn cuối. Không lấy hai lượt này thay sáu chuỗi xuyên hệ thống cuối; CH01–05 vẫn last21,CH06last29.31finding còn mở, F18 và rollback snapshot chưa chốt; chưa kết luận sẵn sàng vận hành.
