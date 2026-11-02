# Triển khai và bằng chứng sửa marketplace

Đây là báo cáo đang thực hiện, không phải chứng nhận hoàn thành kế hoạch. Không reset171thay đổi có trước hoặc thay hash baseline review. Toàn bộ bằng chứng bên dưới thuộc `artifacts/core-fix/fix-20261030T100153Z/`.

## Phần đã triển khai

- F01: token/context dùng chung snapshot và thế hệ phiên; loại request cũ; cache/draft theo danh tính; tín hiệu hai tab không mang token; không replay mutation khi refresh đổi phạm vi.
- F02/F03: quote/confirm phân biệt CART và BUY_NOW bằng contract loại trừ nhau, giữ tương thích CART cũ. Mua ngay dùng kernel hiện có, không chạm giỏ. Snapshot tên/SKU/variant/giá/địa chỉ và chính sách được lưu; phiếu Seller đọc snapshot.
- F04/F05: khóa checkout khi giỏ còn mutation chưa rõ; giữ lựa chọn giỏ, input/key attempt, draft thanh toán/voucher; quote cập nhật đơn giá/dòng/tổng. Sửa địa chỉ bằng ID cũ, giữ mặc định; cập nhật hồ sơ làm mới cache; Guest đăng nhập quay lại phân loại/lượng đã chọn.
- F06: metadata đi cùng chính trang kho, không phụ thuộc100sản phẩm đầu/quyền sửa sản phẩm. Biến động mới có quantity/reserved trước–sau, operation, actor và version. Preview điều chỉnh có nhãn tồn thương mại; lịch sử cũ thiếu checkpoint được nói rõ. Chưa đủ đối chiếu kho theo kỳ hoặc tên actor.
- F08: phiếu lấy/giao có phân loại, số lượng, địa chỉ/điện thoại đầy đủ; nhãn hành động và lý do COD chưa hoàn tất; timeline thời gian Việt Nam với actor-kind phù hợp quyền.
- F09 một phần: địa chỉ nhận trả riêng của Store, snapshot chính sách đơn mới7×24giờ từ COMPLETED; yêu cầu đã gửi tiếp tục sau hạn, đơn cũ xét từng ca. Không tự dựng địa chỉ nhận trả cho Store cũ; cấu hình mới chỉ chặn nhận đơn mới, không chặn xử lý đơn đã mở.
- F10 một phần: Owner đúng Store xác nhận hoàn COD bằng biên nhận, người nhận, thời điểm và attestation đủ tiền. Server đối chiếu số tiền, version và operation ID; không yêu cầu ảnh hoặc giả ngân hàng xác minh.
- F15 một phần: journal thu/hoàn bất biến, cùng transaction với payment, nguồn thời gian rõ. Báo cáo Store dùng sự kiện tiền độc lập ngày tạo đơn, khoảng `[from,to)`, bucket UTC+7; tiền lịch sử thiếu ngày được tách riêng. API tra nguồn theo kỳ có scope Owner/Admin. UI Admin và danh sách chi tiết lịch sử thiếu ngày còn phải hoàn thiện.

## Các lớp bằng chứng đã có

| Bằng chứng | Kết quả | Giới hạn |
|---|---|---|
| `backend-unit-final.json`, `backend-unit-delivery.json` |302test /43suite qua tại source tương ứng|Không thay HTTP hoặc thiết bị|
| `session-results.json`, `customer-session-results.json`, `purchase-final-results.json` |11auth và8purchase case đã qua; báo cáo combined16là tập có giao nhau|Không cộng các lần chạy lại thành số scenario mới|
| `checkout-integration-results.json` |25qua PostgreSQL M2 riêng|M1 là adapter command-ledger kiểm thử|
| `inventory-integration-final.json` |4qua,300sản phẩm/311variant|Schema M1 riêng, không sửa demo|
| `received-inventory-integration.json` |5qua, thêm biên bản nhận hoàn chỉ cộng lượng bán lại và chặn generic restock|Đây là foundation M1, chưa tự chứng minh UI hoặc provider|
| `policy-money-integration.json` |41qua,1NOT_RUN|Ca HTTP cũ trỏ gateway khác schema được giữ `skip`; phải thay bằng fixture HTTP có tag, không tính PASS|
| `money-integration-results.json` |58qua/3lỗi của bộ test foundation dùng schema cũ|Giữ lịch sử thất bại. Bản chạy mới tách schema, không đổi kỳ vọng để che lỗi|
| `order-operations-browser.json` |7qua|Edge với HTTP fixture; không phải provider/DB|
| `inventory-browser-results.json` |2qua|Edge với HTTP fixture|
| `delivery-integration-results.json` |6qua M1/M2 PostgreSQL riêng|Transport gọi service trực tiếp, online dùng provider port kiểm thử|
| `delivery-browser.json` |3qua,1440/1024/768/390|Đổi viewport không phải thiết bị thật; ảnh full-page cần phân biệt sticky header với vị trí viewport|
| `runtime-browser-final.json` và `runtime-checkpoints.json` trong thư mục test tương ứng|1ca Edge + HTTP/API/database/worker thật trên stack riêng|Một Store, chưa đủ CH01 nhiều Store/voucher/review/notification hoặc sáu chuỗi|

Ca runtime đã chứng minh: giỏ giữ5món; Mua ngay tạo2món,220.000₫; Seller xác nhận→chuẩn bị→bàn giao→thu COD→hoàn tất bằng UI; tồn8/reserved0; journal đúng một COLLECTION220.000₫. Email xác minh đi qua capture riêng trong container, không gửi email thật. Sản phẩm test được STOPPED; giao dịch/audit được giữ. Lần runtime đầu lỗi locator sau khi SHIPPED được giữ riêng, không tính đạt; đơn test chưa hoàn tất được giữ dấu vết, không giả đóng để dọn dữ liệu.

## Đợt hoàn về đang triển khai

Source đã có hồ sơ `OPEN→RECEIVED→SETTLING→CLOSED`, inspection từng dòng và command M1 theo receipt. Chỉ bán lại được mới cộng tồn; nhận thiếu/hỏng/chờ không tự đổi thành hàng bán được. RPC giữ nguyên body/ID, không gọi luồng hủy toàn bộ. Khi đóng, đơn CANCELLED với nguyên nhân hoàn về; state kho `RETURN_INSPECTED` chặn worker cũ tự hoàn toàn bộ lần nữa.

COD chưa thu đóng nghĩa vụ thu, không tạo COLLECTION/REFUND. COD đã thu chờ Owner xác nhận; online chờ refund được đối soát. GET lỗi sau POST đã ACK chỉ yêu cầu đọc lại, không gửi mutation mới. UI Store/Customer/Admin và polling giới hạn đã được bổ sung. Đợt này đã build/migrate, manifest03 đối chiếu222file trong image. `delivery-runtime-browser.json` chứng minh bằng UI/API/DB/worker: mua2, từ chối nhận, thực nhận2 (1bán lại/1hỏng), tồn từ8lên9, caseCLOSED/đơnCANCELLED, paymentCANCELLED, journal không có thu hoặc hoàn giả. Kho M2 kết thúc `RETURN_INSPECTED`, không có command hoàn toàn bộ. Nhánh online runtime cũng qua tại manifest04 (bằng chứng bên dưới); chưa tương đương toàn bộ CH04 hoặc provider thật.

Hàng hoàn thiếu số lượng giữ hồ sơ mở, ghi số thực nhận; chưa hỗ trợ tự đóng thiếu hàng hoặc phân xử vận chuyển. Còn phải hoàn thiện đường hỗ trợ cho trường hợp này và đơn legacy thiếu bằng chứng consume. Chưa coi đây là nghiệp vụ đã nghiệm thu.

## Phần còn lại

F00 đã có adapter tiền riêng được khóa bằng cờ development, project pbl6-fe-verify và private key; không mở cổng host. Ledger provider bền qua restart, UNKNOWN được lookup, callback raw HMAC từ chối sai tiền và chống trùng. Manifest04 đối chiếu242file trong image; migration017 chỉ thêm INTEGRATION provider. `provider-callback-final.json`:13ca HTTP/PG qua; `payment-readonly-browser.json`:11ca Edge qua; `online-delivery-runtime-browser.json`:1ca UI/API/DB/worker qua, một COLLECTION và một REFUND220.000₫, refund call1/lookup ít nhất1/effect1, tồn9 sau nhận2 (1bán lại/1hỏng). Đây là simulator, chưa có tiền/provider ngân hàng thật. Còn kiểm thu hồi quyền/khóa Store, hai tab cạnh tranh trên runtime, nhiều Store/voucher/quote thay đổi, auth verify/reset nhiều tab, form sản phẩm/catalog, voucher edit, staff/log, favorites/review sở hữu bị ẩn, quyết định Admin, tìm kiếm/lọc server, chat theo đơn/hash/focus/ảnh, báo cáo Admin và lịch sử thiếu ngày.

Sau bán còn cần biên bản nhận/kiểm cho đổi trả thông thường, quyết định lỗi/bên chịu phí, tranh chấp Admin, EXCHANGE→REFUND có Customer xác nhận, hết hàng đổi và phục hồi đơn/yêu cầu cũ. Không tự thêm hoàn một phần, đổi khác giá, giao lại, carrier, ví/hoa hồng hoặc payout.

Sáu chuỗi đều chưa được chốt nghiệm thu toàn phạm vi. Nghiên cứu với người thật giữ `USER_VALIDATION_PENDING`; native zoom, screen reader, bàn phím ảo và thiết bị thật chưa được tính PASS.

## Sau bán thông thường — tiếp nối31/10

Đã thêm migration M1_009/M2_018, command gửi đổi và receipt kho riêng, actor/lý do, quyết định trách nhiệm/phí, hướng dẫn nhận trả, đề nghị EXCHANGE→REFUND và xác nhận đúng Customer. Lịch sử giữ original_type bất biến. Legacy RECEIVED không mặc định là đã kiểm hoặc cộng tồn: Owner/Admin đối chiếu riêng, không tự bịa biến động kho. Refund được khóa bởi kết quả kiểm kho và quyết định phí, bên cạnh chứng cứ tiền đầy đủ.

Manifest05 khớp245file được build/migrate trước khi bật worker mới. `after-sale-integration-final.json`:32test qua trên M1/M2 PostgreSQL riêng, gọi service port (không phải HTTP). `after-sale-partial-integration.json`:7test của nhóm mở rộng có lưu biên bản nhận thiếu, giữ APPROVED/NOT_STARTED, không tạo biến động kho cho tới kiểm đủ. Phần mở rộng nhận thiếu chạy bằng source mount trong test, chưa nằm trong image manifest05.

`after-sale-browser-final.json` có11qua/1lỗi harness Admin; `after-sale-browser-verified.json` có4qua/1lỗi locator. Lần sửa locator `after-sale-admin-browser.json` đã qua. Giữ các lần lỗi để tra lại, không cộng chạy lại thành ca mới. Ảnh390px đã xem: không tràn ngang, các trường nhận/kiểm đọc được; không thay chứng cứ thiết bị thật.

`after-sale-convert-runtime-final.json`: một hành trình Edge→HTTP→database→worker thật: mua2/CART5 không đổi, COD220.000₫, giao hoàn tất, gửi EXCHANGE, Store nhận2 (1bán lại/1hỏng), Store đề nghị hoàn đủ tiền, Customer xác nhận, Owner ghi biên nhận hoàn COD, yêu cầu COMPLETED; tồn9, journal một COLLECTION/một REFUND220.000₫. Lần trước dừng vì locator chọn loại yêu cầu được giữ ở `after-sale-convert-runtime.json`; giao dịch COD đã hoàn tất vẫn giữ audit, sản phẩm đã STOPPED.

Chưa gọi CH05 hoặc cả52finding đã nghiệm thu: vẫn còn phạm vi nhiều Store, tranh chấp/thu hồi quyền runtime, các biên concurrent và đầy đủ sáu chuỗi. Nhánh gửi đổi runtime đang kiểm tiếp; nhận thiếu còn phải triển khai source/UI mới vào runtime.

## Kết quả gửi đổi và tự phục vụ

Runtime gửi đổi lần đầu (`after-sale-exchange-runtime.json`) phát hiện unique receipt/inventory đã ngăn nhận và xuất cùng variant. Transaction rollback; không mất thêm tồn. Migration M1_010 tách duy nhất theo receipt/inventory/reason, giữ chống trùng từng hiệu ứng. Manifest06 khớp246file; `after-sale-receive-dispatch-integration.json`:8ca qua, có nhận/xuất cùng variant và retry. `after-sale-exchange-runtime-verified.json` qua bằng Edge/HTTP/DB/worker: tồn10→8 khi mua2, nhận lại1bán được→9, gửi đổi2→7, Customer xác nhận rồi yêu cầuCOMPLETED, chỉ có COLLECTION220.000₫. Lượt `-final.json` dừng do harness chọn trùng card catalog/gợi ý, giữ riêng. Source nhận thiếu đã nằm trong manifest06, không còn chỉ ở test mount.

F13: nguồn yêu thích chung, bỏ override từng thẻ; cập nhật sau ACK, hủy GET cũ, invalidation giữa tab chỉ chứa nonce. Trang cuối được clamp theo total. Thêm GET /me/reviews scope Customer, gồm HIDDEN, không phụ thuộc sản phẩm công khai; sửa không gỡ kiểm duyệt. Có trang Đánh giá của tôi và đường vào từ sidebar/product, readback giữ draft khi409/UNKNOWN.

Manifest07 khớp246file. `favorites-reviews-browser-final.json`:11ca Edge qua (nhiều thẻ, reload/detail, hai tab,21→20mục, owned hidden/stopped, lỗi GET và409). `owned-review-runtime-final.json`: UI tạo review sau đơn COD, Admin hide quaHTTP, Store STOPPED sản phẩm, UI đi qua Hồ sơ→Đánh giá của tôi→sửa; API/DB vẫnHIDDEN version2, Customer khác đọc0. Admin hide trong ca này làHTTP, không tính là nghiệm thu UI kiểm duyệt. Lượt trước bị429 tại chuẩn bị tài khoản mới: guard10email-action/giờ vẫn hoạt động; reset đúng counter email-action của Redis project riêng để chuẩn bị fixture độc lập, lưu `registration-fixture-budget-reset.json`. Không thay limiter source/config và không tính ca này là PASS chống lạm dụng.

`backend-unit-owned-reviews.json`:306test/44suite qua. Hai kỳ vọng status-only cũ đã lưu ở `legacy-unit-returns.before-after-sale.ts.txt`; acceptance mới giữ guard kho/tiền, không nới nghiệp vụ để cho test cũ qua. Các file runtime-attempt có ghi chú: trạng thái ghi bên trong finally chưa phải kết quả cuối; JSON Playwright cha là nguồn kết quả, kể cả các ca thất bại.

## Form quản lý đang hoàn thiện

F07 đã sửa integerVND step1/min0/maxsafe, giữSKU009264, coi408/5xx/mấtACK là chưa rõ và chặn create lần hai; form general/variant/attributes có cảnh báo khi reload/đóng hoặc theo liên kết với dữ liệu chưa lưu. Mobile bỏ cột thao tác sticky quá rộng. Còn Back SPA/draft recovery, checklist đến đúng kho,300sản phẩm/12tổ hợp runtime.

F11 đã có sửa và mở lại voucher với expected_version; giữ giây của thời hạn khi prefill, chặn gửi tiếp sau409/UNKNOWN tới khi đọc lại, giữ bản nháp và hiển thị dữ liệu server để so sánh. Code/scope không sửa; nhãn rõ giữ lịch sử đơn và không phục hồi lượt đã dùng. Backend voucher policy/counters và các chuỗi nhiều Store còn phải nghiệm thu runtime.

F12 mới hoàn thiện phân trang độc lập nhân viên/lời mời, đạt phần tử101, sau thu hồi clamp trang hợp lệ; loại kết quả request cũ và tách lỗi đọc khỏi empty. Owner log và actor labeling vẫn chưa triển khai.

`merchant-management-browser.json`:12ca qua gồm7ca form/pagination/voucher/mobile và5ca thuộc tính kế thừa. Đây là Edge với HTTPfixture, không thay bằng chứng DB/worker. F17 đang chuyển query tên/SKU/status sangserver và normalize tiếng Việt; chưa nghiệm thu runtime tại thời điểm ghi mục này.


## Tìm kiếm catalog và quyết định hồ sơ Admin — tiếp nối31/10

M1_011/M3_011 chuẩn hóa tìm kiếm tiếng Việt (NFC/NFD, Đ/đ, không dấu), giữ ký tự LIKE thành ký tự tìm thật. Seller tìm tên/SKU và lọc trạng thái trước count/page trong đúng Store, bộ lọc theo URL còn khi quay lại editor hoặc Back/Forward. Admin hồ sơ Store lọc toàn bộ dữ liệu, hiện danh tính người nộp thực, số đếm theo trạng thái, quyết định có version và đọc lại sau409/UNKNOWN; không đoán version0 khi thiếu dữ liệu.

`search-applications-integration-final.json`:8ca PostgreSQL M1/M3 riêng qua; `admin-applications-browser.json`:5ca Edge fixture qua. `merchant-search-browser-final.json` là lần sửa assertion bất đồng bộ của test lọc, không cộng thành scenario mới. `backend-unit-search-admin.json`:308test/45suite qua tại source tương ứng. Manifest09 khớp249file; `admin-approval-runtime.json` qua UI Admin duyệt đúng applicant→Owner nhận quyền→mua và giao COD bằng HTTP/DB/worker thật. Các hàng đợi M2 và tìm user/Store Admin chưa được tính hoàn tất.

## Nhật ký Owner và sửa lỗi nhân viên — manifest10/11

Thêm Store scope bất biến cho audit M1/M2/M3 bằng migration M1_012/M2_019/M3_012; chỉ backfill mối liên kết đối tượng có thể đối chiếu. Không suy Store từ dữ liệu legacy không chắc chắn. Owner đọc ba nguồn trong Store hiện hành, lọc đối tượng/người/hành động/kỳ giờ Việt Nam; SELLER không có trang hoặc quyền đọc. Bản đọc lược trường nhạy cảm; tra nhãn tài khoản theo lịch sử membership Store, không lấy hồ sơ Store khác. Admin cần platform.admin. ID không phân giải được được ghi rõ, không tự gán thành Hệ thống.

Audit sửa sản phẩm giữ snapshot các phân loại (giá/SKU/thuộc tính) trước–sau; sửa quyền giữ cả bộ quyền trước–sau. Mobile dùng danh sách sự kiện đọc trực tiếp thay bảng kéo ngang. Ảnh390px đã xem và sửa từ bản bảng khó đọc;1440/1024/768/390 là viewport Edge, không phải thiết bị thật. Liên kết sâu với ngày sai không làm văng trang.

Runtime tìm ra lỗi sẵn có tại `StaffRepository.updateStaff`: TypeORM UPDATE RETURNING trả `[rows,count]`, destructure cũ làm response thiếu ID/version/user_id dù DB đã đổi quyền. Đã chuẩn hóa bằng returnedRow, giữ giao dịch audit/event; response mới cho phép khóa tiếp bằng version vừa trả. Không đổi contract/kỳ vọng để né lỗi. Ba lần runtime thất bại `owner-audit-runtime*.json` trước bản final được giữ; lỗi này có bằng chứng HTTP thật, không quy tất cả cho fixture. Bước thử INACTIVE cũng đã đổi sang LOCKED đúng contract; diagnostic cuối xác định rõ expected_version bị thiếu từ response trước đó.

Bằng chứng mới:

- `store-audit-unit.json`:5ca mới qua; `backend-unit-store-audit-final.json`:313test/46suite qua.
- `store-audit-integration.json`:25qua/7lỗi fixture SQL UUID/text; bản `store-audit-integration-verified.json` vẫn lỗi fixture, không tính PASS. `store-audit-integration-final.json`:10ca scope/migration/atomicity qua. `store-audit-staff-returning-integration.json` lỗi chèn permission đã được migration seed; bản `store-audit-staff-returning-final.json`:11ca qua, thêm regression version/ID/snapshot quyền/event. Fixture cuối được mount read-only vào image; không thay mã nghiệp vụ trong container.
- `store-audit-staff-integration.json`:10qua/1skip vì bộ invitation cũ cần M3_TEST_DATABASE_URL; không tính skip là PASS. Phần invitation/accept/thu quyền được chạy thật trong ca runtime mới, nhưng chưa thay toàn bộ kiểm hết hạn/cạnh tranh.
- `store-audit-browser.json` lỗi frontend chưa chạy; sau khởi động đúng proxy18080, `store-audit-browser-verified.json`:9qua. Sau xem ảnh và sửa mobile, `store-audit-mobile-browser.json`:9qua.
- `owner-audit-runtime-final.json`:1ca UI/API/DB/worker thật qua: COD hoàn tất→nhân viên sửa giá100000→101000→nhập nhầm+1/điều chỉnh bù−1→Owner thu quyền và khóa→token cũ bị403→Owner xem đúng actor/giá→Store thứ hai không đọc được log/hồ sơ. Tồn cuối8, snapshot đơn giữ100000, auditDB đúng actor/Store. Một Store trong giao dịch mua, không coi là CH01 nhiều Store.

Migration chạy trước writer mới trong pbl6-fe-verify, gateway test validate/reload thành công. Manifest10 và11 đều khớp254file; manifest11 chứa sửa RETURNING và là runtime mới nhất tại mục này. Không cập nhật manifest cũ để che thay đổi. Chuẩn bị fixture lặp đã reset đúng counter email-action của Redis project riêng có kiểm label, ghi `registration-fixture-budget-reset-owner-audit.json`; limiter source/config giữ nguyên, không dùng làm bằng chứng chống lạm dụng.

F12/F14/F17 tiếp tục PARTIAL, toàn bộ52finding vẫn NOT_ACCEPTED cho tới kiểm đủ acceptance. Còn Owner log cho các sự kiện nghiệp vụ chưa phát audit hoặc dữ liệu legacy thiếu liên kết; expiry/cạnh tranh lời mời; Admin khóa/mở và kiểm duyệt theo đúng ngữ cảnh; các hàng đợi M2; báo cáo Admin; chat và sáu chuỗi cuối.


## Admin khóa/mở và tìm tài khoản/Store — manifest12

Thay prompt/alert bằng dialog xác định tên/email/ID và Owner, trạng thái/phiên bản, tác động khác nhau của khóa tài khoản với khóa Store, lý do bắt buộc và đường hủy. Không tự giả version0. 409 hoặc lỗi chưa rõ dừng gửi tới khi đọc lại đúng ID; giữ lý do, đối chiếu trạng thái đã đạt thì không PATCH lại. GET lỗi sau ACK được báo ở danh sách, không gửi lại quyết định. Mobile có danh sách riêng, dialog đã xem ảnh390px.

M3 tìm toàn bộ tài khoản theo tên/email/ID, Store theo tên/ID/Owner trước count/page, chuẩn hóa tiếng Việt và ký tự LIKE literal. Giữ q/status/page trong URL. Trả nhãn thật và bỏ owner_user_id khi không có Owner chắc chắn, không dùng UUID zero. Server từ chối lý do trắng hoặc trạng thái không hợp lệ; scope ADMIN/platform.admin giữ nguyên.

`admin-directory-unit.json`:21test liên quan qua. `admin-directory-integration.json`:16qua/1lỗi fixture refresh_session thiếu family_id; `admin-directory-integration-final.json`:6ca Admin mới qua, gồm cạnh tranh version, thu hồi refresh, không phục hồi phiên khi mở lại, không đổi trạng thái Store khi khóa user và không khóa Owner khi khóa Store. `admin-directory-browser.json` và bản mobile `admin-directory-mobile-browser.json`:8ca qua, không cộng hai lượt thành16scenario. Build frontend/backend và contract check/drift147public+13internal qua.

Manifest12 khớp254file đã cập nhật stack riêng. `admin-directory-runtime.json` qua UI/API/DB/worker: Admin tìm đúng Customer ngoài danh sách theo email→khóa/mở bằng dialog→token cũ vẫn401 sau mở lại, đăng nhập mới dùng được→khóa Store khiến catalogẩn, Owner không bị khóa→mở Store hiện lại sản phẩm. Audit4quyết định, tồn8 và đơn vẫnCOMPLETED. Bản `admin-directory-runtime-final.json` thêm đọc journal sau bốn quyết định để đối chiếu không phát sinh tiền/hoàn giả; xem kết quả cuối của Playwright trước khi tính PASS.

Đây là các nhánh của F14/F17; chưa chốt toàn bộ gói. Còn ngữ cảnh kiểm duyệt/đổi trả Admin, quyền role khi đang thao tác và các hàng đợi đơn M2. Các chuỗi đa Store, voucher và phần giao/hoàn/thu tiền toàn phạm vi vẫn chưa được chốt nghiệm thu.


## F17 — hàng đợi đơn Customer/Seller/Admin, source tiếp nối

Đã bổ sung source API/filter theo q, trạng thái đơn, tình trạng payment và trạng thái lệnh refund riêng; Admin có thêm store_id. Dùng snapshot tên/SKU/phân loại/người nhận/điện thoại, mã đơn/nhóm/Store để tìm trên toàn bộ dữ liệu trước count/page. Điều kiện Customer hoặc Store nằm ngoài nhánh OR tìm kiếm; contract Customer/Store không nhận tham số chọn Store khác. Tìm tiếng Việt dùng M2_020 normalize giống M1/M3, LIKE metacharacter được escape và bổ sung index order_item/refund theo order. Không gọi catalog hiện tại để dựng lịch sử.

UI có bộ lọc theo URL, giữ khi reload/Back/Forward; Customer từ chi tiết quay lại đúng query, Seller đóng dialog vẫn ở hàng đợi. Tên món, thuộc tính, SKU, lượng và ngày giờ Việt Nam được hiển thị từ snapshot; tên Store lấy hiện tại có nhãn hiện tại và không giả khi Store không còn public. Seller/Admin có danh sách riêng trên điện thoại. Admin chi tiết trả các dòng hàng và địa chỉ đã chốt; lỗi GET không giả thành empty. Request list cũ bị hủy qua signal và key, request detail Seller cũ bị loại khi đổi bộ lọc/đóng/unmount.

Trạng thái lệnh hoàn REQUESTED/PROCESSING/UNKNOWN/SUCCEEDED/FAILED là bộ lọc độc lập với payment. Bỏ lựa chọn payment REFUND_PENDING vì không phải trạng thái đang lưu. Admin không suy lệnh refund thành công từ việc chỉ có yêu cầu. Bộ test mới kiểm sự tách biệt này và giữ balances chưa hoàn khi refund UNKNOWN.

**Chưa nghiệm thu / chưa deploy phần này.** Backend build (bao gồm biên dịch test backend), frontend build, OpenAPI check và drift147public+13internal đã qua; TypeScript spec Edge và runtime driver cũng biên dịch qua. Đây không phải bằng chứng chạy Jest, PostgreSQL hoặc browser. `order-search-validation.json` ghi từng gate; `order-search-source-manifest.json` là SOURCE_ONLY_UNDEPLOYED, không sửa manifest triển khai cũ.

Lệnh Jest regression order/report/contracts đã bị automatic approval review từ chối thực thi vì hết hạn mức duyệt; thông báo ghi rõ đây là review failure, không kết luận thao tác không an toàn. Không chạy lách bằng đường khác hoặc tính các test mới là PASS. M2_020 và image chứa filter mới chưa chạy trên pbl6-fe-verify; runtime gần nhất vẫn manifest12. UI dev đang theo source mới, nên các filter mới cần backend mới trước khi nghiệm thu.

Đã chuẩn bị `order-search.test.ts` unit/integration, `order-search.spec.ts` Edge, và `CORE_FIX_ORDER_SEARCH=1` trong driver runtime: dùng cùng đơn COD thật, đổi tên catalog, Customer/Seller/Admin tìm snapshot SKU, giữ query, kiểm Customer khác và tham số scope giả. Chưa chạy các ca này. Bộ regression cũ được cập nhật để kiểm server filtering và metadata/items mới; không đổi kỳ vọng sang lọc trang hoặc mượn tên sản phẩm hiện tại.

Lượt kế tiếp chạy theo `order-search-next-verification.md`: regression trước, build/hash image mới, integration schema riêng, migration20 trước reader, rồi Edge fixture/runtime và xem ảnh. Tiếp tục các khoảng trống F14/F15/F16/F18 sau khi gate này qua.52finding và sáu chuỗi chưa đóng.


## F17 — thực thi gate tiếp nối, manifest13

Hạn mức duyệt công cụ đã cho chạy lại. `order-search-unit-executed.json`:83test/4suite qua. `order-search-integration-executed.json`:22qua/1lỗi assertion contract thiếu page/size của lớp service; sửa đúng wrapper ở test, không nới schema hoặc sửa nghiệp vụ, `order-search-integration-verified.json`:6ca search qua. Audit11ca và COD journal6ca qua trong lần integration đầu.

`order-search-browser-executed.json`:11qua/6lỗi, gồm5selector getByLabel exact trên label chứa options và1kỳ vọng raw SHIPPED cũ; `order-search-browser-verified.json`:16qua/1literalSHIPPED. Đổi selector sang accessible combobox, giữ guard không hủy khi bàn giao và dùng nhãn tiếng Việt; `order-search-browser-final.json`:17qua. Không cộng số chạy lại thành scenario mới. Bổ sung sửa span cho nhãn refund để không tạo paragraph lồng nhau trên mobile.

Manifest13 khớp256file, M2_020 đã áp trước reader/worker mới. `order-search-runtime-executed.json`:1ca thực UI/API/DB/worker qua: COD220.000₫, CART5 giữ nguyên, mua2 và tồn8; đổi tên catalog sau mua, Customer/Seller/Admin tìm đúng SKU/title snapshot cũ; Customer quay từ chi tiết còn bộ lọc; Customer khác không thấy đơn, tham số Store giả bị422. Ảnh390px runtime đã xem, danh sách đọc được SKU/món/lượng/người nhận và có nút mở đơn. Đây là một đơn/Store, không giả đã chạy100đơn hoặc chuỗi nhiều Store. Chưa đóng toàn bộ F17/52finding/sáu chuỗi.

`order-search-validation.json` giữ check bị chặn trước làm lịch sử và thêm continuation_checks, không ghi đè kết quả cũ thành PASS. Gate cũ không còn bị quota chặn trong lượt này; runtime gần nhất là13. Tiếp theo hoàn thiện F15 báo cáo Admin và các khoản lịch sử không xác định được ngày, rồi các gói còn lại.


## F15 — báo cáo Admin và đối chiếu lịch sử thiếu ngày, manifest14

Thêm GET/admin/reports và hai danh sách /store|admin/reports/unresolved-money. Thu/hoàn theo journal bất biến và occurred_at half-open, cùng định nghĩa Owner/Admin và timezoneAsia/Ho_Chi_Minh. Tổng giá trị đơn/hàng hoàn tất/phí giao vẫn ghi rõ nhóm đơn tạo trong kỳ; không gọi là lợi nhuận hoặc payout. Admin lọc Store hoặc toàn sàn; Owner lấy Store hiện hành, không nhận tham số chọn Store khác. Danh sách thiếu ngày lấy từng counter thu/hoàn chưa có journal tương ứng, ngoài mọi kỳ, không tạo timestamp giả hoặc sửa tiền.

UI Owner/Admin dùng chung báo cáo có ngày và phạm vi theo URL, tổng tiền, nhóm ngày/tháng, nguồn journal, recorded_at riêng occurred_at và liên kết về hàng đợi đúng đơn. Nguồn Owner xác nhận thủ công không gọi là ngân hàng kiểm chứng; SYSTEM_RECEIVED nói rõ giới hạn. Khoản thiếu ngày tải khi mở, phân trang độc lập và không nhận from/to. GET sổ tiền lỗi vẫn báo lỗi, không biến thành danh sách trống; metadata cũ bị thiếu không tự hiển thị0. Phần kho hiện hành có nhãn, không giả là tồn lịch sử theo kỳ tiền.

`financial-report-unit.json`:21test report/contract qua; `backend-unit-financial-report-final.json`:319test/47suite qua. Buildfrontend/backend vàcontractcheck/drift150public+13internal qua. Build image đầu bị lỗi kiểu suy luận callback test từ listMoney chưa khai báo return type; sửa service trả đúng OperationOutputs. Lần integration đầu chạy image cũ thiếu test mới được giữ ở `financial-report-integration.json` (6qua, suite mới không chạy); `financial-report-integration-verified.json`:12test/2suite qua. Các ca mới kiểm đơn2020 thu/hoàn đúng ngày/tháng UTC+7, hai biên,26khoản lịch sử vượt trang20, scope Owner/Admin và contract không có timestamp giả.

`financial-report-browser-final.json`:7ca Edge qua. `financial-report-browser.json` là lượt trước fixture tổng dòng/nguồn được chỉnh cho nhất quán với summary; bản final dùng20khoản thu6000 và1hoàn120000, không đổi kỳ vọng nghiệp vụ. Các viewport1440/1024/768/390 không thay thiết bị thật.

Manifest14 khớp256file, cập nhật reader/worker test riêng; không có migration tiền hoặc writer mới trong phần này. `financial-report-runtime.json`:UI/API/DB/worker thật mua2/CART5giữ nguyên→COD220.000₫→EXCHANGE→nhận2(1bán lại/1hỏng)→Store đề nghịrefund→Customer đồng ý→Owner xác nhận hoàn đủ220.000₫→kết thúc. Owner/Admin đều đối chiếu hai journal nguồn thật. API chọn đầu kỳ đúng lúc thu, sau lúc tạo đơn, nên order_count/order_value0 nhưng collected/refunded220.000₫; không backdate hoặc đổi balance để làm ca qua. UI vẫn chọn kỳ ngày Việt Nam. Scope403/422 được kiểm lại, ảnh390px Admin đã xem: nguồn, tổng và link đơn đọc được. Một Store, chưa thay sáu chuỗi toàn phạm vi.

F15 vẫn PARTIAL tới khi kiểm đủ lịch sử/backfill trên dataset chốt và các chuỗi đa Store/online. F16 là phần tiếp theo;52finding và sáu chuỗi chưa được đóng.


## F16 — chat theo đơn, liên kết/focus và ảnh lỗi — manifest15

Chat từ chi tiết đơn xác minh quyền Customer và Store qua M2 trước khi M3 tạo hội thoại hoặc ghi tin. M3_013 thêm order_id nullable trên tin nhắn; lịch sử cũ giữ không gắn đơn. Endpoint nội bộ chỉ M3 gọi, dùng ResolveContext hiện hành; không gửi địa chỉ/điện thoại/thanh toán vào context. Seller trả lời chỉ gắn đơn thuộc đúng Customer và Store của hội thoại. Retry giữ nguyên nội dung, mã tin và tham chiếu; cùng mã khác nội dung/đơn bị409. Không tự gửi tin khi mở chat và không tự gắn bản nháp ngữ cảnh khác. ACK thành công không biến thành UNKNOWN nếu GET làm mới lỗi.

Liên kết hash đợi phần nội dung bất đồng bộ rồi cuộn/focus một lần; không bám theo polling hoặc cướp focus khi người dùng đã gõ/cuộn. Chuyển trang và tab Admin đưa focus tới nội dung phù hợp; query filter và POP không reset không cần thiết. Ảnh catalog/detail lỗi có trạng thái rõ, chuyển ảnh phục hồi, ảnh chính cho thử lại. Launcher mobile chuyển vào thanh điều hướng đã dành chỗ; desktop vẫn mở widget. Edge viewport không chứng minh bàn phím ảo, screen reader hoặc thiết bị thật.

`order-conversation-integration.json`:8ca PostgreSQL hai schema M2/M3 riêng qua, lookup identity kiểm soát; ownership/Store, concurrent retry, thu quyền, response dependency sai và legacy không gắn đơn. Không chạy integration messaging cũ có tác động actor demo. `backend-unit-order-chat-final.json`:319test/47suite qua. Build frontend qua; contract mới150public+14internal. Manifest15/hash259file khớp image, M3_013 đã áp; M2 reader lên trước M3 writer/worker, readiness M2/M3 đều200. Driver runtime bên ngoài image được bổ sung sau khi đóng manifest15, không sửa hash cũ để che thay đổi.

`order-chat-browser-final.json`:19ca Edge fixture qua (7navigation/images/mobile,6messaging,6order-chat). Các lượt navigation ban đầu tìm ra lỗi effect StrictMode đánh dấu trước khi focus hoàn tất; đã sửa lifecycle và giữ bằng chứng. Các lượt phone trước có race đo dock/CTA còn ngoài viewport, test cuối dùng wheel thật và hit-test. `phone-chat-browser.json`:1ca qua. Lượt order-chat trước còn lỗi thông báo generic khi lookup sai; đã dùng ApiError để hiển thị hướng phục hồi rõ.

`order-chat-runtime.json` mua/giao COD và Customer gửi đúng đơn thành công nhưng dừng vì test dùng sai tên menu Seller. Giữ lượt này, sửa selector theo tên thực Tin nhắn khách hàng; `order-chat-runtime-verified.json`:PASS UI/API/DB/worker hai phiên thật. Customer mở từ đơn không tự gửi → gửi → Store mở danh sách hội thoại và trả lời cùng đơn → Customer nhận qua polling → retry cùng mã trả cùng ID → khác body409 → Customer khác404 → Seller đi link về đúng hàng đợi đơn. DB có đúng2tin, cả hai cùng order_id, không trùng client_message_id. COD220.000₫ và tồn8 đã đối chiếu; sản phẩm test STOPPED sau ca. Ảnh390px đã xem: nội dung và tham chiếu có đủ, nhưng hai thao tác xem/trả lời đang sát nhau, cần chỉnh khoảng cách/affordance trước chốt UI.

F16 tiếp tục PARTIAL; bộ hồi quy rộng đang chạy. Còn chat lịch sử nhiều trang/poll tab ẩn, thông báo/ngữ cảnh hoàn về đầy đủ, screen reader/thiết bị thật và nghiệm thu chéo. Không đóng52finding hoặc sáu chuỗi.


## F16 — hồi quy rộng và kiểm ảnh mobile tiếp nối

`f16-regression.json`:50qua/2lỗi fixture. Fixture hash giữ GET bằng một biến bị StrictMode request sau ghi đè; fixture Store trả503 một lần rồi tự thành công ở request kế, nên chưa kiểm được thao tác Thử lại. Sửa hàng đợi GET/explicit release và chỉ phục hồi khi test yêu cầu; `f16-regression-final.json`:52ca qua. Không thay kỳ vọng lỗi hoặc nới nghiệp vụ. Tách nút xem đơn/trả lời bằng khoảng cách và vùng chạm44px; ảnh390px mới trong `product-navigation-browser-final-artifacts` đã xem, hai thao tác đọc được riêng.

F16 vẫn PARTIAL vì chưa kiểm đủ lịch sử nhiều trang, tab ẩn, các nhánh thông báo và thiết bị thật. Giữ USER_VALIDATION_PENDING cho hiệu quả usability với người dùng thật.

## F07/F06 — bảo vệ form, checklist và kho theo đúng phân loại — manifest16

Live app chuyển sang data router của thư viện hiện có để dùng một blocker chung cho các phần form. Back/Forward, liên kết nội bộ và native reload/close được bảo vệ; từ chối rời giữ nguyên các phần đang nhập. Chỉ một lời nhắc dù nhiều phần bẩn. Phần thêm SKU/giá/ảnh cũng đăng ký, không chỉ thông tin chung. ACK create thành công giải phóng guard trước điều hướng đóng form; không coi form đang gửi chưa rõ là create thành công. API tools development giữ fallback native/link cũ; chưa coi là đã có POP guard như Live app.

`product-navigation-browser.json`:15qua/2lỗi gồm guard báo sai sau ACK create (đã sửa source) và selector tên nút Lưu sản phẩm trong test không đúng UI Lưu thay đổi. `product-navigation-browser-final.json`:33qua cho Back/Forward/multiple dirty/saved/native-link, thuộc tính, session và hash/chat. Lượt regression rộng sau đó (`product-checkout-regression.json`)46qua/1lỗi test gắn hai listener dialog trước khi dismiss đầu kết thúc; sửa helper đợi chính dialog xử lý xong, không thêm sleep hoặc nới tiêu chí.

M1 listStoreInventory/listStockMovements nhận q/product_id/variant_id; lọc và count/page cùng predicate, cùng Store, normalize tiếng Việt/LIKE literal. UI giữ bộ lọc và hai trang theo URL, chuyển tới đúng biến động bằng hash. Checklist editor đọc dữ liệu đã lưu: thuộc tính, phân loại/giá, ảnh, tồn khả dụng, trạng thái bán/kiểm duyệt; liên kết kho đúng product hoặc variant. Product-only SELLER thấy hướng chuyển việc cho người có quyền kho, không gọi hoặc được cấp quyền inventory. Đọc kho lỗi không giả thành0. Ảnh chưa có là khuyến nghị, không tự biến thành quy tắc cấm bán mới.

`inventory-filter-unit.json`:22unit liên quan qua. `inventory-filter-integration.json`:14ca PostgreSQL riêng qua (6kho gồm300sản phẩm/311variant và8chat hồi quy). Query SKU/product/variant, count/page, scope, reserve/consume/restock/receipt lặp và lịch sử kiểm được. `inventory-readiness-browser-final.json`:21ca Edge fixture qua; lượt trước20qua/1selector chưa chờ đúng hàng sau search, đã dùng chính tên món cần tìm. `variant-add-browser-final.json`:1ca thêm trục qua; test mới đã xác định getByLabel exact bị options ghép vào label, dùng combobox theo tên accessible đúng. Không gọi lỗi selector này là lỗi sản phẩm.

Runtime đầu `product-readiness-runtime.json` dừng ở selector chọn trục; giữ bằng chứng. Lượt `product-readiness-runtime-verified.json` thêm được12variant rồi cho thấy cache kho cũ trên checklist; cleanup dùng PATCH status taxonomy không thuộc contract đã che lỗi gốc. Không coi JSON đó là PASS hoặc mở contract để dọn fixture. Đã invalidate kho/danh sách quản lý sau ACK thêm variant; thêm test hồi quy trực tiếp. Việc dọn taxonomy riêng chuyển sang SQL có kiểm ID/tag, không phải bằng chứng API dừng taxonomy.

Manifest16/hash259file khớp image, không có migration mới cho filter; reader/worker đã cập nhật trên pbl6-fe-verify. `product-readiness-runtime-final.json`:PASS UI/API/DB/worker thật. Cùng đơn COD220.000₫/tồn8/CART5 được giữ; Owner từ UI tạo đủ3màu×4size, SKU khó đoán và giá100500; 299listing thêm bằng SQL fixture đều DRAFT, tổng300; sản phẩm chính ngoài trang đầu, UI tìm bằng SKU thứ12→editor→Đen/XL→nhập3 bằng dialog→đọc lại đúng variant3, defaultvariant8, snapshot đơn vẫn100000/Đỏ/S. Back từ chối giữ tên đang nhập. Viewport1440/1024/768/390 và ảnh390px đã xem; không coi là thiết bị thật. Đây không phải UI tạo300listing hay một tính năng bulk.

Sản phẩm chính STOPPED sau ca,299phụ giữ DRAFT; type/category tag của ca thành công chuyển STOPPED bằng SQL fixture, bằng chứng fixture-taxonomy-cleanup.json. Hai lượt cũ cũng dọn đúng association product/Store/tag, chỉ khi không còn product ACTIVE; lưu `fixture-taxonomy-cleanup-previous.json`. Không xóa giao dịch/audit/kho. Secret scan330file text/JSON tại thời điểm chạy không thấy JWT hoặc mật khẩu runtime.

F06/F07 tiếp tục PARTIAL: còn đối chiếu kỳ/thời điểm hàng đã consume chưa bàn giao, nhãn actor kho, cạnh tranh/quyền rộng hơn và đủ ảnh/thứ tự/unknowncreate ở runtime. Chưa đóng52finding hoặc sáu chuỗi. Hồi quy rộng cuối và build sau cache fix được ghi bổ sung khi kết thúc.


F07/F06 chốt gate tiếp nối: `product-checkout-regression-final.json` có64ca Edge PASS (không phải70 như ước lượng tên lệnh). Gồm regression form/kho, mua hàng, auth, customer/catalog, navigation/chat và session. Build frontend sau cache fix đã qua; bundle chính535.81kB có cảnh báo kích thước Vite, chưa tính là đã tối ưu performance. Backend build, OpenAPI check/drift150public+14internal và biên dịch spec/runtime qua tại source tương ứng. Không cộng các lượt chạy lại vào số nhiệm vụ đã nghiệm thu.


## F11 — quota và phục hồi quyết định voucher — manifest17

Tách datasource của VoucherService để kiểm đọc scope/counters cùng database/schema độc lập; mặc định runtime giữ datasource hiện hành. Validate vẫn dùng OrderService/kernel checkout, không tạo công thức ưu đãi thứ hai. Bộ voucher-lifecycle trước dùng trực tiếp database URL được chuyển vào schema voucher_fix_* riêng và dọn đúng schema; không chạy cleanup vào demo.

`voucher-usage-unit.json`:93unit voucher/order qua. `voucher-checkout-integration.json`:50ca trong hai schema riêng qua, gồm hạn tổng/mỗi khách khi cạnh tranh, commit/release đồng thời, hold hết hạn/hết lượt/STOPPED, atomic rollback, phân bổ platform nhiều Store và mỗi group chỉ một lượt; cancellation không phục hồi redemption. Test usage mới phân biệt hold/release/redeem và scope Owner khác Store404; sửa/dừng voucher giữ snapshot tiền đơn. Order recovery kiểm lost reserve/consume/release ACK và cancellation, nhưng các internal port trong bộ SQL là có kiểm soát, chưa thay chứng cứ M1/runtime thật.

UI đổi trạng thái409/UNKNOWN giữ mã cần kiểm, khóa sửa/đổi trạng thái mã đó cho tới đọc lại rõ phiên bản; GET lỗi không cho gửi tiếp. Sau đọc không tự PATCH lại, nói rõ trạng thái đã đạt hoặc cần quyết định lại. Không cho đổi trạng thái cùng voucher khi form sửa còn mở. `voucher-status-browser-final.json`:12ca Edge qua; lượt đầu11qua/1selector text lỗi chứa nút Thử lại, sửa theo alert đúng ngữ nghĩa. Build backend/frontend qua; manifest17/hash259file khớp và cập nhật stack test, không có migration mới.

Đang chạy chuỗi hai Store với voucher Store/sàn và mất phản hồi sau commit; chưa tính PASS cho tới có checkpoint tiền/tồn/worker/counters. Lượt multi-store đầu giữ làm lịch sử: test chưa đợi hậu điều kiện API sau nút hoàn tất; lượt tiếp theo đã đợi vẫn phát hiện mapper nhóm đơn bỏ payment_status. Chưa quy thất bại đầu chỉ cho timing. Đã sửa test chờ API thật và sửa reader như mục tiếp nối dưới.


## F18/F02 — sửa group reader và gate tiếp nối01/11 — manifest19

Chuỗi nhiều Store phát hiện API GET/orders/batches/:id bỏ payment_status/refund_status và các snapshot/ngày/timeline do mapper thủ công, dù query đã join tiền. Dùng cùng mapOrderRowToDto với đơn riêng; query đọc mốc hoàn tất và diễn biến từ lịch sử thực trong cùng snapshot SELECT. Không dựng địa chỉ/chính sách từ catalog hiện tại; ownership Customer nằm trong predicate group. Lỗi này thuộc đối chiếu nhóm đơn F18/F02, không tăng CR cũ bằng cách đếm trùng biểu hiện.

`order-group-unit.json`:93test order/voucher qua. Lệnh SQL trước hết bị automatic approval review từ chối vì quota và chưa thực thi. Sau ngày mới, `order-group-integration.json`:28qua/22fail do SQL mới tham chiếu nhầm cột completed_at không tồn tại. Đã sửa dùng lịch sử COMPLETED giống đơn riêng, giữ nguyên kỳ vọng và không thêm cột để làm test qua. Manifest18 không deploy. `order-group-integration-verified.json`:50ca qua; manifest19/hash259file khớp, reader/worker test đã cập nhật, không có migration mới.

`multi-store-chains-runtime-group-fixed.json` đi thật qua checkout hai Store419899₫ với hai voucher Store và platform101₫, mất ACK sau servercommit→reload→retry cùng body/key, Owner hai Store lấy/giao/thu COD→hoàn tất, tồn mỗivariant8, platform chỉ1lượt. Đã xác minh group có trạng thái tiền; thông báo đúng2đơn hoàn tất tới Customer; UI đọc thông báo→đúng đơn→tạo review. Test dừng tại selector status review có đồng thời Đang tải và Đã lưu; chưa chấm toàn chuỗi PASS. Sửa selector theo thông báo lưu và kiểm review bằng API thật, giữ lượt lỗi; chuỗi hủy phía sau đang chạy tiếp ở dataset mới.


## F18 — hai chuỗi COD nhiều Store đã đối chiếu, manifest19

`multi-store-chains-runtime-recovery.json`:PASS. Dùng cùng Buyer, hai Owner/Store, hai món và voucher Store+sàn xuyên các checkpoint. Checkout CART nhiều Store419899₫ (goods400000, giảm Store30000, sàn101, phí50000), mất phản hồi sau servercommit→reload→retry cùng body/key giữ hai đơn, không tạo nhóm khác. Owner hai Store lấy/giao hàng từ phiếu snapshot, ghi đúng COD209948+209951, hoàn tất. Chủ động mất ACK sau commit hoàn tất, UI dừng ghi và Đọc lại đơn đưa về COMPLETED; không thu COD lần nữa. Customer nhận2thông báo hoàn tất, đánh dấu đọc→đúng đơn→tạo đánh giá, kiểm review bằng API.

Nhóm thứ hai219899₫ dùng mỗi món1. HTTP Customer hủy cạnh tranh Owner xác nhận:200/409VERSION_CONFLICT. Store còn lại hủy bằng HTTP; worker hoàn tồn mỗivariant8, giữ nguyên hai khoản thu nhóm trước tổng419899, không tạo khoản thu/hoàn mới cho COD chưa thu. DB mỗi đơn có đúng1mốc CANCELLED. Cả ba voucher giữ2lượt đã dùng (sàn tính2group, không tính4đơn). Owner/Admin reports API đúng từng Store; Owner UI Xem lượt dùng hiển thị2. Sau ca dừng hai sản phẩm, giữ giao dịch/audit.

Phân biệt bằng chứng: mua/giao/thu/phục hồi/thông báo/đánh giá/usage dùng UI; tranh chấp và hủy nhóm thứ hai dùng HTTP đồng thời; báo cáo Owner/Admin và hậu điều kiện dùng API+DB+worker thật. Mất ACK do test chặn phản hồi sau route.fetch commit, không phải provider tiền thật. Không dùng kết quả này chốt hết52finding hoặc cả sáu chuỗi.

Các lượt trước giữ lịch sử: group-fixed dừng do selector status review đang có cả loading và saved; self-service dừng do link Giỏ hàng trùng breadcrumb/header; final dừng vì request test dùng status thay to_status (server422, không phải lỗi nghiệp vụ); race gặp timeout hoàn tất thật, UI giữ SHIPPED và dừng ghi, chưa có chứng cứ servercommit. Bản recovery bổ sung mất ACK có kiểm soát sau commit và đi qua đọc lại UI, không nới kỳ vọng thành công. Reset đúng counter M3 email-action giờ hiện hành trong Redis private (trước9, xóa1key), có kiểm labelproject, không đổi limiter/config/session; `registration-fixture-budget-reset-chains.json` không được tính là acceptance chống abuse.

Ảnh phiếu390px đã xem, địa chỉ/món/SKU/lượng đọc được. Ảnh element checkout dài bị fixed header/action bar chen vào do cách capture phần tử ngoài viewport; chưa dùng nó để chấm không che nội dung. Cần ảnh viewport và hit-test tại từng điểm review tiền trước khi chốt phần UI bốn kích thước. Phát hiện thêm cho F08: response mutation Seller giữ status/tiền nhưng rơi timeline/policy/completed_at do map từ UPDATE RETURNING; GET Đọc lại có đầy đủ. Đang sửa projection response, không coi việc phải đọc lại trong happy path là đã hoàn tất F08.


## F08 — mutation trả projection đầy đủ, manifest20

Sau TRANSITION_ORDER và thu COD, đọc lại Order trong chính transaction và Store scope trước khi trả response, gồm trạng thái tiền, timeline đã ghi, snapshot chính sách/địa chỉ và mốc COMPLETED khi có. Không dựng history ở client hoặc lấy chính sách hiện tại; đọc lỗi làm transaction thất bại như các bước khác. Dữ liệu kho/tiền và điều kiện chuyển trạng thái không đổi.

`order-mutation-projection-unit.json`:78unit order/commerce qua. `order-mutation-projection-integration.json`:32ca PostgreSQL schema riêng qua, gồm chuỗi PENDING→CONFIRMED→PROCESSING→SHIPPED→thuCOD→COMPLETED; từng response giữ policy/timeline, thu tiền không tạo mốc trạng thái giả, completed_at chỉ có sau hoàn tất và response cuối bằng GET Customer. COD refund/journal hồi quy cùng suite qua. Manifest20/hash259file khớp, stack riêng đã cập nhật; không có migration mới.

`multi-store-chains-runtime-projection.json`:PASS chạy lại CH01/CH02 trên20. Ngoài tiền/tồn/voucher như trước, response thu COD có timeline SHIPPED và policy168h ngay trên UI; response COMPLETED trước khi chặn ACK có timeline/mốc hoàn tất/payment SUCCEEDED đầy đủ. Sau mất ACK đọc lại, không thu lần hai. Đây là hồi quy runtime cho projection mới; giữ bản19 và các lượt lỗi làm lịch sử.

`checkout-obstruction-browser.json`:1ca Edge fixture qua bốn viewport1440/1024/768/390, cùng hai Store và return policy/địa chỉ dài. Cuộn tới từng khoản phải trả và tổng, hit-test tâm phần số tiền không trúng header/dock/thanh mua; ảnh viewport thay ảnh element dài. Ảnh checkout-money-390-2.png đã xem: tổng và thanh xác nhận đọc được riêng. Không sửa CSS hoặc giấu chính sách để làm ca qua; không tính4viewport thành4nhiệm vụ. Vẫn không phải zoom native, screen reader hoặc thiết bị thật.

## Tiếp nối 01/11 — phục hồi đơn, actor timeline và thu/hoàn tiền, manifest21

Customer có nút **Làm mới đơn** ngay trong chi tiết. Hủy nhận lỗi UNKNOWN/timeout/5xx khóa lý do và gửi lại cho tới khi GET thành công; không tự phát mutation. Sau khi Store hoàn tất, người mua đọc lại và tiếp tục đánh giá/đổi trả ngay trên màn. `customer-order-readback-browser.json`:18ca Edge qua trước thay đổi nhãn tiền; lịch sử này giữ nguyên.

Ảnh runtime online phát hiện worker chuyển RECOVERING/PENDING nhưng timeline ghi “Khách hàng”. Nguyên nhân `changeOrderStatus` mặc định actor bằng customer_user_id. Writer mới dùng system actor; hủy của Customer/Store vẫn truyền đúng actor đã xác thực. Reader nhận diện các chuyển PENDING/RECOVERING/EXPIRED do worker sở hữu trong lịch sử cũ; không sửa raw audit, không suy actor từ lý do hủy tự nhập, không đổi actor của bản ghi tạo đơn. `order-timeline-unit.json`:87test qua; `order-timeline-integration.json`:47test PostgreSQL schema riêng qua, gồm kiểm raw actor mới, đọc legacy không viết lại, lý do hủy trùng mã hệ thống vẫn là Customer, hồi quy COD/refund/hoàn về/đổi hàng.

Màn đơn Customer/Seller/Admin dùng nhãn tiếng Việt chung cho phương thức, thu và hoàn thay vì đưa enum thành chỉ dẫn. Phiếu giao hàng không còn yêu cầu thu COD khi nghĩa vụ đã đóng, đã hoàn tiền hoặc đang UNKNOWN; form ghi nhận COD chỉ có khi payment PENDING, đúng điều kiện server. `order-money-presentation-browser.json`:54ca Edge qua, gồm ba tình huống không được hướng dẫn thu lại, giỏ/checkout, bản quote nhiều Store, readback hủy, tiền UNKNOWN, đổi/trả và hoàn về. Build frontend/backend và contract check/drift150public+14internal qua. Bundle chính536.61kB còn cảnh báo kích thước; chưa coi là đã tối ưu performance.

Manifest21 khớp260file backend, không migration mới. Image config `sha256:5c62a05d049f2761bf5192375d884b1c174d87d70e311ce8536abc5e78df69e0`; reader/worker của stack riêng đã cập nhật. Simulator private giữ ledger và code không đổi. Frontend/contracts/spec được đóng dấu trong `frontend-source-timeline-21.json`; không cập nhật hash baseline cũ.

Các ca dưới đây đều PASS với checkpoint riêng, API/DB/worker thật và provider INTEGRATION có kiểm soát; không phải ngân hàng thật:

- `online-interruption-return-timeline21-verified.json`: đóng tab trước callback → quay lại bằng menu lịch sử → thấy đơn đã thu → Store hoàn tất → yêu cầu EXCHANGE → Store đề nghị hoàn → Customer đồng ý → worker UNKNOWN/lookup → hoàn đủ220000₫ gồm phí giao → kết thúc. Tồn10→8→9, chỉ một món tốt được cộng lại; một món hỏng không cộng. Provider refund_calls1/effects1/lookup≥1; giữ original_type EXCHANGE và các bước đề nghị/đồng ý.
- `online-late-cancel-timeline21-verified.json`: Customer hủy từ UI trước khi tiền đến, worker nhả giữ về10/0. Callback sai số tiền422, callback đúng và trùng được tiếp nhận; đơn vẫn CANCELLED. Worker hoàn220000₫ đúng một lần; inventory state RELEASED, followup DONE/REFUNDED, chỉ một payment attempt. CART5 không đổi; không thay đồng hồ hoặc backdate giao dịch.
- `online-delivery-return-timeline21-verified.json` và `cod-delivery-return-timeline21-verified.json`: giao thất bại → kiểm thực nhận2/tốt1/hỏng1 → tồn9 → CANCELLED, state RETURN_INSPECTED. COD chưa thu không có dòng thu/hoàn giả. Online ghi một COLLECTION và một REFUND220000₫, provider chỉ có một hiệu lực hoàn sau lookup.
- `cod-exchange-timeline21-verified.json`: nhận hàng trả theo kiểm thực tế → bàn giao hàng đổi cùng giá → Customer xác nhận nhận → kết thúc, tồn7; chỉ có thu COD220000₫, không phát sinh refund.
- `cod-refund-timeline21.json`: chuyển đổi có đồng ý của Customer → Owner xác nhận thủ công đủ biên nhận/người nhận/thời điểm/đủ tiền → hoàn tất, tồn9; thu/hoàn đủ220000₫. Đây là xác nhận thủ công, không chứng minh ngân hàng đã kiểm chứng.
- `multi-store-chains-timeline21.json`: CH01/CH02 chạy lại trên21, hai Store/voucher sàn+Store/lost ACK checkout và hoàn tất/COD/thông báo/đánh giá/đối chiếu tiền-tồn-lượt dùng đều qua. Race hủy so với xác nhận dùng HTTP, phần mua/giao/thu/readback dùng UI; báo cáo đối chiếu bằng API/DB.

Lượt batch đầu có test PASS nhưng biểu thức truyền `--output` trong PowerShell bị rơi, nên các lượt sau ghi đè thư mục mặc định. Không dùng những lượt đó chốt nghiệm thu. Giữ `runtime-output-path-diagnostic.json`, các report `*-artifact-path-diagnostic.json` và output cuối còn lại. Runner mới truyền cờ hoàn chỉnh và xác minh outputDir + checkpoint sau từng lượt; các bản `*-verified` có đủ bằng chứng độc lập. Counter email-action giờ hiện hành được reset chỉ trong Redis private để tạo fixture độc lập; ba file `registration-fixture-budget-reset-*.json` mới ghi số trước/sau, không được tính là acceptance rate-limit.

Ảnh mobile390px của quay lại sau thanh toán và đơn hủy đã hoàn được xem: nhãn tiền rõ, worker hiện Hệ thống, không có nút thanh toán lại trên đơn đóng. Ảnh full-page có dock cố định chen tại vị trí viewport là giới hạn capture; kiểm không che các khoản tiền vẫn dựa trên viewport/hit-test đã chạy, không suy từ ảnh dài. Không báo đã kiểm thiết bị vật lý, bàn phím ảo, screen reader hay zoom native.

`chain-status.json` hiện ghi CH01–CH05 PASS trong phạm vi bằng chứng trên; **CH06 vẫn PARTIAL và chặn nghiệm thu vận hành**: chưa có báo cáo đối chiếu kho theo kỳ và chưa cung cấp đối chiếu riêng lượng đã consume nhưng chưa bàn giao. F06 còn nhãn actor kho; quyền/cạnh tranh rộng, dữ liệu lịch sử/backfill, các tác vụ còn lại và ma trận52finding vẫn chưa nghiệm thu toàn bộ. Không suy5chuỗi đạt thành sản phẩm sẵn sàng production.

Đọc lại database bằng SELECT xác minh đúng8sản phẩm có tag của7lượt runtime mới đều STOPPED (`runtime-cleanup-timeline21.json`); giao dịch/audit giữ lại. `runtime-image-timeline21.json` xác nhận7reader/worker cùng image21. `secret-scan-timeline21.json` có positive control cho bộ dò mật khẩu runtime/JWT và không thấy giá trị khớp trong464artifact text/JSON tại thời điểm quét; không coi đây là bộ dò mọi loại bí mật. Source frontend175file vẫn khớp snapshot sau các lượt chạy.

Tiếp nối F06 trên manifest22: phần còn thiếu của CH06 đã có triển khai và runtime; bốn finding kho được đóng theo bằng chứng cụ thể. Xem [wave-02-inventory](wave-02-inventory.md) cho contract, migration, kết quả và giới hạn. Các kết luận CH06 còn thiếu ở các mục trước giữ làm lịch sử của baseline cũ.


## Tiếp nối F01 — manifest23

CR-016 đã FIXED/VERIFIED: đồng bộ cookie giữa tab, logout theo signed family và bảo vệ context mới trước request403 cũ.8unit,7HTTP/SQL,21Edge fixture, hành trình thật hai tab/tài khoản, full1440/390 và hồi quy CH06 đều PASS. Chi tiết, lần chạy lỗi và giới hạn trong [wave-03-session](wave-03-session.md). Tổng mới5finding VERIFIED,47còn chưa nghiệm thu đầy đủ; không đổi kết quả lịch sử hoặc giả sáu chuỗi đã cùng baseline cuối.


## Tiếp nối checkout và snapshot — manifest25

CR-016 được mở lại bởi ca mới ở checkout, sau đó đã sửa và VERIFIED25 cùng CR-001. Bổ sung TTL/scope intent, giữ attempt sau đổi phiên, phục hồi từ thiếu tồn chắc chắn, transaction đổi chéo variant và snapshot Customer/Admin.343unit,16SQL,45Edge fixture, hai walkthrough1440/390 và ma trận HTTP/SQL/worker giỏ0/2/5 đều qua. Xem [wave-04](wave-04-checkout-snapshots.md) và checkout-acceptance25.json. Tổng6finding VERIFIED,46chưa đóng đầy đủ; sáu chuỗi vẫn cần baseline cuối chung.


## Tiếp nối catalog — manifest26

356unit/20SQL/33Edge fixture,11nhánh HTTP axis và fullSeller1440/390 qua. Sửa validation thiếu/sai trục trên mọi đường ghi/mở bán, legacy correction và checklist; nghiệm thu create/image ACK recovery với SQL/audit. CR-002/017/023 VERIFIED26, tổng9finding;43còn mở và F07 UX-09 chưa đầy đủ. Chi tiết [wave-05](wave-05-seller-catalog.md); không thay kết quả lịch sử hoặc final six-chain gate.
