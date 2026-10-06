# Week 1 — giao việc sau khi có nền code

**Chuyển giai đoạn ngày 06/10/2026:** kế hoạch hiện tại ở [Week 2](week2.md). Week 1 giữ scope/lịch gốc; Status thực tế trên Kanban. PR #88/#87/#89 đã merge, phần nghiệp vụ rộng chưa đạt vẫn giữ issue mở.

Tuần 1 gồm **5 ngày làm việc kể từ lúc nhóm bắt đầu**. Mục tiêu là có Catalog, địa chỉ/Store lookup, Cart và các màn Customer nối API thật; đồng thời bàn giao kho, Payment và consent/tracking để tuần sau ráp checkout. Đây là kế hoạch đầu ra, không phải báo cáo các task đã hoàn thành.

[Kanban theo từng người](https://github.com/users/embetapbay123/projects/1/views/3) · [Toàn bộ 71 task](task-assignment.md) · [Nền code và cách dùng DTO/client/fixture](foundation-handoff.md) · [Chạy hệ thống](../../README.md)

**Schema, DTO và contract đã có.** Không chờ Công thiết kế lại database hay viết client cho từng API. CORE-01, FLOW-01 và CORE-02 đã có code mẫu để review; tuần này Công tiếp tục nghiệp vụ Payment/M4. Tiến độ thực tế chỉ cập nhật trên Kanban, không sửa bảng này thành một board thứ hai.

[Bàn giao bản tổng Hoa](hoa-consolidated-handoff.md): contract Cart thêm product_id, migration 004, các phần đã sửa và dependency Checkout/COD/report còn cần hoàn thiện. Dùng Kanban để review và nghiệm thu; không lấy số PR làm số task đã xong.

[Bàn giao lookup/Profile/Address của Trí](tri-lookup-handoff.md): API, quyền, transaction và cách kiểm tra trong PR #87. PR #87 đã merge vào main ngày 06/10/2026; Address/Profile/lookup có thể dùng thật.

## Nhìn nhanh: mỗi người làm gì trước

| Người | Việc bắt đầu ngay | Đầu ra chính của tuần | Chi tiết |
| --- | --- | --- | --- |
| Công — `embetapbay123` | Review điểm nối với member, rồi [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51) | Payment port/attempt/read, domain COD, consent và consumer tracking | [Task Công](#cong) |
| Thịnh — `QT-2005` | [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11); QuoteVariants đã vào `main` qua [PR #86](https://github.com/embetapbay123/PBL6/pull/86) | Public Catalog, Seller list, kho và command reservation | [Task Thịnh](#thinh) |
| Hoa — `mimidangeiu` | [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3) | Cart đọc/ghi thật, Voucher CRUD, Order read; Android auth/catalog theo lát cắt | [Task Hoa](#hoa) |
| Trí — `phantri1912` | [ID-01 #4](https://github.com/embetapbay123/PBL6/issues/4) | Địa chỉ, phiên/quyền hiện hành, Store và 2 lookup mới M3 | [Task Trí](#tri) |
| Hatsaphone — `HATSAPHONE` | [WEB-01 #5](https://github.com/embetapbay123/PBL6/issues/5) | Danh sách, chi tiết Product và profile/địa chỉ Customer | [Task Hatsaphone](#hatsaphone) |

Một người giữ tối đa **một issue In progress**; hoàn thành một lát cắt và tạo PR nhỏ rồi mới lấy việc tiếp. Các task tiếp theo đã giao sẵn; có thể dùng fixture để phát triển phần độc lập. Mỗi issue có thể cần nhiều PR, không bắt buộc gom toàn bộ một module vào một PR lớn.

Task được chọn cho tuần còn ở Backlog thì chuyển Todo khi chuẩn bị lấy, rồi In progress khi bắt đầu. Giữ nguyên issue và Owner; không tạo task trùng hoặc hiểu vị trí Backlog là phải chờ Công giao lại.

## Ngày 1: cả nhóm khởi động

1. Nhận lời mời repo/Project nếu còn pending; kiểm tra push được branch riêng. Dùng **Owner** trên Kanban để xác định task khi Assignee vẫn tạm là Công.
2. Clone hoặc cập nhật `main`, chạy setup → migration → seed theo [README](../../README.md). Đăng nhập Customer/Owner, xem Product và chạy mẫu sửa Product. Không commit `.env` hoặc khóa local.
3. Đọc [foundation handoff](foundation-handoff.md), [schema](database-schema.md) và README module của mình. Tra operation trong [public OpenAPI](../contracts/openapi.json) hoặc [internal OpenAPI](../contracts/internal-api.json).
4. Kéo task đầu vào In progress; tạo branch riêng, ví dụ `feat/cart-01-read-update`. Đọc [quy tắc Kanban/PR](kanban-guide.md).
5. Bắt đầu controller → service → repository → mapper hoặc page → `callOperation`. Dùng DTO generated; bỏ đúng method stub khi thay bằng controller thật, tránh đăng ký hai handler cùng path.

## Lịch làm việc và bàn giao giữa các ngày

Các mốc dưới đây là mục tiêu phối hợp. Nếu chưa đạt, ghi rõ operation/case còn thiếu trong issue và giữ phần tích hợp chưa hoàn tất; người nhận tiếp tục phần độc lập bằng fixture có nhãn.

| Ngày | Công | Thịnh | Hoa | Trí | Hatsaphone |
| --- | --- | --- | --- | --- | --- |
| 1 | Review 3 task nền; triển khai Payment bằng manager M2; test rollback | CAT-04 từ Catalog sample/seed; dùng QuoteVariants đã merge | Cart read/update/remove, quyền Customer | CRUD Address, default address và ownership | List Product, search/pagination/loading/error |
| 2 | Payment read/attempt và adapter; bàn giao port cho Hoa | Public list/detail/taxonomy; hỗ trợ Hoa nối QuoteVariants thật | Nối quote M1, add/merge Cart; bàn giao Cart API | Bàn giao Address; ResolveCheckoutContext và scope AI | Nối Catalog thật, chi tiết Product/chọn Variant |
| 3 | Domain COD, replay/concurrency; consent GET/PATCH | Seller list; inventory read/adjust/movement và low-stock | Voucher Store/Platform CRUD | Hoàn thiện Store và kiểm phiên/quyền hiện hành | Profile/Address form nối M3, login/logout dùng client chung |
| 4 | Consumer search/view/cart; kiểm consent/inbox/retention | Reserve/consume/release và test tranh SKU | Order read; lát cắt Android login/profile/address/catalog | Kiểm mất quyền/Store khóa và integration M2/M4; phần Admin độc lập nếu còn thời gian | Ráp ba màn, kiểm lỗi/điện thoại/reload; Cart UI nếu còn thời gian |
| 5 | Review PR, kiểm điểm nối và ghi phần chưa tích hợp | Demo Catalog/quote/kho + Seller list; sửa lỗi | Demo Cart/Voucher/Order read; demo Android đã làm | Demo Address/Store/lookup; sửa lỗi quyền | Demo Customer bằng API thật; sửa lỗi UX |

**Handoff:** QuoteVariants đã merge ngày 05/10/2026 qua [PR #86](https://github.com/embetapbay123/PBL6/pull/86); Hoa dùng [payload, lỗi và dữ liệu seed đã bàn giao](../../backend/catalog-service/src/inventory/README.md) để nối M1 thật. Address/ResolveCheckoutContext của Trí đã merge qua PR #87 ngày 06/10/2026; Hoa/Web/Mobile dùng API thật và tiếp tục nghiệm thu luồng của mình. Hoa bàn giao Cart cho Hatsaphone sau khi nối M1 thật. Công bàn giao PaymentPort cho Hoa trước lúc Hoa bắt đầu ORDER-02. Không ai đọc hoặc ghi database của service khác để vượt dependency.

<a id="cong"></a>

## Công — Payment, M4 và hỗ trợ tích hợp

### 1. Review nền đã có, không dựng lại khung

[FLOW-01 #6](https://github.com/embetapbay123/PBL6/issues/6) · [CORE-02 #50](https://github.com/embetapbay123/PBL6/issues/50) · [CORE-01 #1](https://github.com/embetapbay123/PBL6/issues/1)

- Chạy mẫu cùng member; xác nhận họ tìm được DTO, fixture, client và chỗ thay stub. Review allowlist/error/event và cùng manager Order–Payment.
- Xử lý lỗi shared được phát hiện khi member bắt đầu, giữ contract version và generated files đồng bộ. Không nhận code thay Cart, kho, Address hay các màn Customer.
- Chỉ đóng task nền khi đủ tiêu chí issue và review; có code mẫu không đồng nghĩa các module nghiệp vụ đã hoàn thành.

### 2. PAY-01 — Payment/attempt/provider adapter

**Issue:** [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51). **Operation:** `createPaymentAttempt`, `getPayment`; điểm gọi nội bộ M2 `PaymentPort.createForOrder`.

- Triển khai tạo Payment từ Order, số tiền server tính và method theo contract. Order/Payment dùng đúng `EntityManager` truyền vào; không mở transaction riêng hay dùng repository global.
- Implement đọc Payment đúng Customer/Order scope. Attempt có reference/idempotency/state rõ; không coi QR/reference là bằng chứng đã thu tiền.
- Tách provider/network call ra ngoài transaction. Timeout giữ trạng thái UNKNOWN theo thiết kế và có hướng reconciliation; không tự retry command trong HTTP request.
- Test khác Customer, sai amount/state, replay cùng payload, cùng ID khác payload, provider timeout và rollback Order/Payment. Dùng Order hợp lệ tạo bởi seed/test trong DB M2 để test phần độc lập; không tạo endpoint checkout giả.

**Bàn giao Hoa:** cách gọi port trong transaction, response Payment, lỗi và test rollback. `createPaymentAttempt` chỉ nghiệm thu provider thật khi có cấu hình/test evidence tương ứng; adapter test không đủ để báo đã thu tiền.

### 3. PAY-04 — domain ghi thu COD

**Issue:** [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54). **Điểm nối:** `PaymentPort.recordCodCollection`.

- Ghi CODCollection/Payment và Order transition trong cùng transaction gọi vào; đúng amount, reference và trạng thái cho phép.
- Replay không tạo collection thứ hai; hai request cạnh tranh chỉ ghi thu một lần. Lỗi ở bất kỳ bước nào rollback cả tiền và Order.
- Bàn giao domain cho Hoa. Hoa vẫn sở hữu controller/permission `collectCod` ở [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25); Công không tạo controller COD thứ hai.

**Nghiệm thu tuần:** test database cho atomic/replay/concurrency và hướng dẫn gọi port. Nếu ORDER-05 chưa tích hợp, ghi rõ phần domain đã bàn giao, không báo luồng Seller thu COD đã hoàn chỉnh.

### 4. AI-01 — consent và tracking consumer

**Issue:** [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55). **Operation:** `getPersonalizationConsent`, `updatePersonalizationConsent`.

- GET/PATCH consent của chính User; on/off, retention và xóa/invalidation theo [quy tắc nghiệp vụ](../business-rules.md) và [bảo mật/riêng tư](../security-privacy.md).
- Consumer kiểm schema/version `1.0`, consent hiện hành và inbox trước lưu interaction. Inbox/effect cùng transaction, commit rồi ACK; retry không tạo hành vi trùng.
- Tích hợp nguồn SearchRecorded/VIEW từ M1 và CART từ M2 đã làm trong tuần. Không ghi PII/secret vào log; không biến việc tắt consent thành lỗi đọc Catalog.
- Chuẩn bị consumer OrderCompleted/PURCHASE và test replay với event fixture. Nguồn purchase thật chỉ nghiệm thu sau [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24); không đóng AI-01 nếu còn thiếu tiêu chí nguồn thật của issue.

**Nghiệm thu tuần:** consent API thật; từ thao tác search/view/add-to-cart thật đến dữ liệu M4 có consent; phát lại event không tăng số interaction. Fixture chỉ dùng test consumer chưa có producer thật.

**File bắt đầu:** [payment port](../../backend/commerce-service/src/payment/payment.port.ts), [Payment README](../../backend/commerce-service/src/payment/README.md), [consent README](../../backend/ai-service/app/consent/README.md), [tracking README](../../backend/ai-service/app/tracking/README.md), [event schemas](../contracts/events.json).

**Làm tiếp khi phần trên đã bàn giao:** [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52) callback có chữ ký/replay/recovery, rồi [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56) recommendation. PAY-02 cần Order/reservation thật để nghiệm thu consume/refund; không giả Success khi dependency còn stub.

<a id="thinh"></a>

## Thịnh — M1 và Seller Web

### 1. CAT-QUOTE-01 — mở điểm nối cho Cart

**Issue:** [CAT-QUOTE-01 #7](https://github.com/embetapbay123/PBL6/issues/7). **Internal operation:** `QuoteVariants`.

**Đã bàn giao:** [PR #86](https://github.com/embetapbay123/PBL6/pull/86) đã merge vào `main` ngày 05/10/2026; operation là `IMPLEMENTED`. Thịnh chuyển sang CAT-04 bên dưới; việc tích hợp Cart/checkout thuộc Hoa và giữ tiêu chí nghiệm thu tại các issue M2.

- Đọc Product/Variant/Store hiện hành và trả `variant_id`, `store_id`, `quantity`, `price_vnd`, `available_quantity`, `version`. Response không có Product ID, tên hoặc SKU. Kiểm caller M2 và Store còn được bán qua M3.
- Kiểm Variant tồn tại/thuộc Product đúng, Product bị ẩn, Store bị khóa và quantity sai. Lỗi M3 giữ correlation và fail closed.
- Quote không reserve, không trừ tồn. Tiền BIGINT giữ string trong ORM, mapper chuyển thành số nguyên an toàn.

**Bằng chứng M1:** CI trên merge commit đã đạt; unit/integration test có trong PR cho caller sai, input sai, Variant thiếu, Product/Store không hợp lệ, dependency lỗi và tồn kho không đổi sau quote. Xem [README inventory](../../backend/catalog-service/src/inventory/README.md) để chạy lại. Tích hợp M2 thật chưa được nghiệm thu: Hoa phải gửi Store ID thật, giữ lỗi 404/409/422/503 và không dùng giá/Store ID giả khi M1 lỗi.

### 2. CAT-04 — public Catalog hoàn chỉnh

**Issue:** [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11). **Operation:** `listCategories`, `listProductTypes`, `listProducts`, `getProduct`.

- Hoàn thiện filter/sort/search/pagination/detail theo OpenAPI; chỉ trả Product và Store được phép hiển thị. Detail có Variant/ảnh/giá đúng response, nullable map đúng, tránh N+1.
- Dùng repository/mapper mẫu; kiểm page/size, ID không tồn tại, danh sách rỗng và Store khóa. Không dùng fixture làm dữ liệu sản phẩm production.
- Phát SearchRecorded và InteractionRecorded VIEW theo [events](../contracts/events.json) từ request đã xác thực. Guest không phát hành vi cá nhân; telemetry lỗi không làm Catalog lỗi, không truy cập DB M4.

**Nghiệm thu:** Hatsaphone/Hoa dùng list/detail thật; test schema/filter/quyền hiển thị và hook tracking có source thật. Mẫu list/detail đang chạy chưa đủ để đóng CAT-04 trước khi kiểm toàn bộ tiêu chí issue.

### 3. CAT-01 — danh sách quản lý Product và Seller page

**Issue:** [CAT-01 #2](https://github.com/embetapbay123/PBL6/issues/2). **Operation:** `listOwnStoreProducts`, `listStoreProducts`.

- Tách dữ liệu quản lý Seller khỏi danh sách public; kiểm membership/permission Store hiện hành, hai Store không xem dữ liệu quản lý của nhau.
- Filter/pagination đúng schema. Làm Seller list với loading/empty/error; dùng route riêng và link mẫu sửa Product hiện có.
- Chưa triển khai tạo Product đầy đủ trong task này; phần đó thuộc CAT-02.

**Nghiệm thu:** Owner xem Store mình, user khác Store bị từ chối; Seller page gọi API thật và hiển thị lỗi có correlation.

### 4. INV-01 — quản lý kho và low-stock

**Issue:** [INV-01 #13](https://github.com/embetapbay123/PBL6/issues/13). **Operation:** `listStoreInventory`, `adjustInventory`, `listStockMovements`; internal `ListLowStockVariants`.

- Đọc kho/movement đúng Store; adjustment có quyền, lý do, version/lock và StockMovement trong cùng transaction. Không để tồn âm hoặc phá lượng đã reserve.
- Low-stock xác minh token/membership Store qua M3, dùng tồn khả dụng và ngưỡng/phân trang đúng contract. Lỗi dependency không trả danh sách rỗng.
- Seller UI đọc số liệu API, form adjustment khóa nút khi đang gửi và refresh dữ liệu sau thành công.

**Nghiệm thu:** Store khác, quantity/version sai, adjustment cạnh tranh và movement rollback được test; response low-stock hợp lệ và có trace.

### 5. INV-02 — reserve/consume/release

**Issue:** [INV-02 #14](https://github.com/embetapbay123/PBL6/issues/14). **Internal operation:** `ReserveInventory`, `ConsumeReservation`, `ReleaseReservation`.

- Reserve nhiều SKU nguyên tử: thiếu một SKU thì không giữ một phần. Lock theo thứ tự nhất quán và không oversell khi tranh SKU cuối.
- Kiểm reservation state/expiry; consume/release không làm lặp hiệu ứng. Operation result và thay đổi kho commit trong cùng transaction.
- Cùng operation ID/payload trả kết quả cũ; cùng ID khác payload trả 409. Không retry command HTTP tự động.

**Nghiệm thu:** test cạnh tranh, multi-SKU rollback, consume/release replay và payload conflict trên DB; bàn giao command thật cho Hoa/Công. Chưa dùng test fixture để báo checkout đã hoạt động.

**File bắt đầu:** [Catalog README](../../backend/catalog-service/src/catalog/README.md), [repository](../../backend/catalog-service/src/catalog/catalog.repository.ts), [mapper](../../backend/catalog-service/src/catalog/catalog.mapper.ts), [Inventory README](../../backend/catalog-service/src/inventory/README.md), [internal controller](../../backend/catalog-service/src/inventory/inventory.internal.controller.ts), [Seller routes](../../frontend/src/features/seller/routes.tsx).

**Làm tiếp nếu 5 đầu ra đã đạt:** [CAT-02 #9](https://github.com/embetapbay123/PBL6/issues/9) tạo/sửa Product đầy đủ → [CAT-03 #10](https://github.com/embetapbay123/PBL6/issues/10) Variant/SKU/ảnh. Mẫu sửa title/description hiện có không được tính thay hai task này. Review/moderation/restock và các màn Seller Order/Report làm ở chặng sau theo bảng tổng.

<a id="hoa"></a>

## Hoa — M2 và Android

### 1. CART-01 — Cart read/update/remove

**Issue:** [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3). **Operation:** `listCartItems`, `updateCartItem`, `removeCartItem`.

- Repository chỉ thao tác Cart/CartItem của Customer hiện tại. List lấy giá/dữ liệu nguồn từ M1 bằng typed QuoteVariants, không tin giá client.
- Sửa quantity theo version và xóa item đúng ownership; xử lý Variant không còn bán, giá thay đổi và dependency timeout theo contract.
- Khi quote M1 chưa bàn giao, dùng adapter fixture trong test/dev để hoàn thiện logic; không fallback fixture trên API thật khi M1 lỗi.

**Nghiệm thu:** Customer A không đọc/sửa/xóa Cart của B; quantity/version sai bị chặn; M1 thật được gọi với correlation xuyên luồng. Bàn giao Hatsaphone/Mobile response và lỗi.

### 2. CART-02 — add/merge và event CART

**Issue:** [CART-02 #8](https://github.com/embetapbay123/PBL6/issues/8). **Operation:** `addCartItem`.

- Quote Variant qua M1; thêm mới hoặc gộp item theo quy tắc Cart. Kiểm quantity/ownership/version và request cạnh tranh để không tạo item trùng.
- Phát InteractionRecorded CART qua outbox cùng transaction mutation; không phát event từ fixture hoặc request rollback.
- Product ẩn, hết hàng, Store khóa, đổi giá và M1 timeout có lỗi rõ. Không tự reserve trong add-to-cart.

**Nghiệm thu:** demo Customer thêm → list → sửa → xóa bằng M1/M2 thật; test rollback/outbox và consumer M4 khi Công bàn giao.

### 3. VOUCHER-01 + VOUCHER-02 — CRUD Voucher

**Issue:** [VOUCHER-01 #27](https://github.com/embetapbay123/PBL6/issues/27) rồi [VOUCHER-02 #28](https://github.com/embetapbay123/PBL6/issues/28). **Phạm vi:** nhóm API Store Voucher và Platform Voucher trong [Voucher README](../../backend/commerce-service/src/voucher/README.md).

- Store Voucher kiểm đúng Store/membership; Platform Voucher chỉ Admin. Triển khai `listStoreVouchers`, `createStoreVoucher`, `updateStoreVoucher`, `listPlatformVouchers`, `createPlatformVoucher`, `updatePlatformVoucher`; không dùng quyền trên UI làm quyền backend.
- Kiểm thời hạn, quota, discount integer VND, version và quy tắc sửa Voucher đã dùng; audit cùng transaction cần thiết.
- Test hai Store, Customer gọi API Admin, version cũ và dữ liệu invalid. Bàn giao payload/error cho Thịnh/Trí; UI Seller/Admin vẫn do hai người đó làm.

**Nghiệm thu:** CRUD thật và đọc lại đúng, quyền sai không ghi DB. CRUD Voucher không có nghĩa đã hoàn thành stacking/redemption/quota concurrency ở [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29).

### 4. ORDER-03 — đọc Order để Web/Mobile/Seller bắt đầu

**Issue:** [ORDER-03 #23](https://github.com/embetapbay123/PBL6/issues/23). **Operation:** `listOwnOrders`, `getOwnOrder`, `listStoreOrders`, `getStoreOrder`.

- Đọc Order/OrderItem/snapshot đúng Customer hoặc Store; filter/pagination theo contract, không lộ PII khác scope.
- Payment/Refund lấy dữ liệu đúng nguồn trong cùng DB M2, không viết status giả trên response. Test bằng dữ liệu Order hợp lệ do seed/test tạo; không dựng confirm checkout giả.
- Bàn giao sample response và lỗi cho Seller/Customer Android/Web, kể cả empty state.

**Nghiệm thu:** Customer/Store khác bị chặn; list/detail trả đúng snapshot và money schema. Không đổi trạng thái Order hoặc thu COD trong task read.

### 5. Android — lát cắt tuần 1 sau handoff BE

**Issue:** [MOB-01 #31](https://github.com/embetapbay123/PBL6/issues/31) và [MOB-02 #32](https://github.com/embetapbay123/PBL6/issues/32).

- Tái dùng ApiClient cho login/logout/profile, list/form địa chỉ đã có API M3 và list/detail Catalog M1. Có loading/empty/error, navigation và xử lý phiên hết hạn.
- Fixture dùng cùng JSON qua helper hiện có, bật bằng flag phát triển rõ ràng; khi có API thật thì kiểm lại các màn với server.
- Tuần này ưu tiên lát cắt trên, không yêu cầu hoàn thành register/reset/password/recommendation và mọi tiêu chí thiết bị. PR dùng `Refs #31`/`Refs #32`; chỉ đóng issue khi hoàn thành toàn bộ scope và bằng chứng Android của issue.

**File bắt đầu:** [Cart README](../../backend/commerce-service/src/cart/README.md), [Order README](../../backend/commerce-service/src/order/README.md), [payment port](../../backend/commerce-service/src/payment/payment.port.ts), [Mobile README](../../mobile/README.md), [ApiClient](../../mobile/lib/core/api_client.dart), [fixture helper](../../mobile/lib/core/contract_fixtures.dart).

**Làm tiếp:** [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) → [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) quote nhiều Store → [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) confirm. Có thể viết orchestration/test bằng interface ngay; nghiệm thu thật cần lookup M3, quote/reservation M1, Voucher và PaymentPort. Không tính quote/confirm hoàn thành khi còn các dependency stub.

<a id="tri"></a>

## Trí — M3 và Admin Web

### 1. ID-01 — địa chỉ Customer

**Issue:** [ID-01 #4](https://github.com/embetapbay123/PBL6/issues/4). **Phạm vi:** nhóm API Address trong [Profile README](../../backend/identity-store-service/src/profile/README.md).

- List/create/update/delete/default address của chính Customer; kiểm ownership, trạng thái và validation theo DTO/BR. Đổi địa chỉ mặc định giữ bất biến trong transaction.
- Không cho Customer A đoán ID để sửa/xóa Address B. Xử lý xóa/khóa địa chỉ theo schema hiện có; snapshot của Order cũ không được sửa theo Address hiện tại.
- Bàn giao Web/Mobile/M2 request, response, ID hợp lệ trong seed/test và lỗi.

**Nghiệm thu:** thêm → sửa → đổi mặc định → xóa → reload đúng; hai Customer và default-address concurrency được kiểm. Đây là handoff sớm cho Hoa/Hatsaphone.

### 2. ID-LOOKUP-01 — điểm nối checkout và AI

**Issue:** [ID-LOOKUP-01 #45](https://github.com/embetapbay123/PBL6/issues/45). **Internal operation:** `ResolveCheckoutContext`, `ResolveAiMetricsScope`.

- Checkout context: xác minh access token Customer, Address ACTIVE thuộc Customer và Store IDs. Trả address snapshot, Store shipping fee/version đúng contract; Address không thuộc User trả 404, Store ngừng bán trả 409.
- AI scope: Admin được PLATFORM hoặc Store filter; Owner chỉ Store có membership/quyền hiện hành. Store khác scope bị 403.
- Service caller allowlist và user permission là hai lớp kiểm riêng. Không trả success chỉ vì có service token hợp lệ; giữ correlation, lỗi nghiệp vụ và timeout policy.

**Nghiệm thu:** typed client M2/M4 gọi lookup thật; caller sai, token hết hạn/khóa User, Address người khác, Store khóa và Owner khác Store đều có test. M2/M4 không đọc DB M3.

### 3. AUTH-03 — hoàn thiện phiên/context/profile

**Issue:** [AUTH-03 #39](https://github.com/embetapbay123/PBL6/issues/39). **Phạm vi:** login/refresh/logout/context/profile đang có mẫu, hoàn thiện theo issue.

- Kiểm refresh rotation/replay/logout/expiry/CSRF, User ownership và allowlist trường profile; không tin quyền cũ trong JWT.
- ResolveContext lấy quyền/membership/Store hiện hành. Khóa User/Store hoặc revoke membership phải có hiệu lực ở request tiếp theo theo thiết kế.
- Kiểm cookie/session behavior với Web và client Mobile; không log password/token, không tự tạo AuthProvider thứ hai.

**Nghiệm thu:** test quyền mất hiệu lực, phiên hết hạn/replay, profile Customer khác và refresh đồng thời. Mẫu login chạy được không đủ để bỏ qua các case này.

### 4. STORE-02 — Store read/update và active lookup

**Issue:** [STORE-02 #41](https://github.com/embetapbay123/PBL6/issues/41). **Phạm vi:** Store APIs được giao và internal `ActiveStores`.

- Owner/member chỉ đọc/sửa đúng Store và permission; update kiểm expected_version, shipping fee và audit theo contract.
- ActiveStores chỉ trả Store còn hoạt động; Store bị khóa biến mất khỏi lookup. M1 dựa vào lookup này để lọc Catalog.
- Phát StoreStatusChanged khi có mutation trạng thái thuộc scope đã triển khai; phối hợp task RBAC của M3, không sửa DB service khác. Nếu mutation thuộc [RBAC-01 #44](https://github.com/embetapbay123/PBL6/issues/44) chưa triển khai thì ghi rõ producer đó còn thiếu.

**Nghiệm thu:** hai Store tách quyền; version cũ không ghi; shipping snapshot đổi theo Store version; Store khóa không được coi active.

**File bắt đầu:** [Profile README](../../backend/identity-store-service/src/profile/README.md), [Address entity](../../backend/identity-store-service/src/entities/address.entity.ts), [context internal controller](../../backend/identity-store-service/src/auth/context.internal.controller.ts), [Auth README](../../backend/identity-store-service/src/auth/README.md), [Store README](../../backend/identity-store-service/src/store/README.md), [Admin routes](../../frontend/src/features/admin/routes.tsx).

**Làm tiếp:** [STORE-01 #40](https://github.com/embetapbay123/PBL6/issues/40) application/approve tạo Store+membership nguyên tử; [ADMIN-01 #46](https://github.com/embetapbay123/PBL6/issues/46) Admin Web. Có thể chuẩn bị list/filter/form bằng fixture trong thư mục Admin sau các lookup; nghiệm thu mutation phải nối API thật. Register/reset/change password thuộc [AUTH-01 #37](https://github.com/embetapbay123/PBL6/issues/37)/[AUTH-02 #38](https://github.com/embetapbay123/PBL6/issues/38), không tính đã xong từ mẫu login.

<a id="hatsaphone"></a>

## Hatsaphone — Customer Web, chỉ UI và nối API

Không thiết kế database, không viết BE/AI, không tự tính giá/tồn/quyền. Tái dùng component, AuthProvider, `callOperation` và fixture đã có; Công hỗ trợ lỗi adapter/shared. Ưu tiên ba màn dưới đây theo thứ tự.

### 1. WEB-01 — danh sách Product

**Issue:** [WEB-01 #5](https://github.com/embetapbay123/PBL6/issues/5). **API:** `listProducts`, taxonomy lookup cần cho filter.

- Từ ProductsSample, làm card/list, search/filter và pagination theo contract; đổi search/filter thì về trang 1. Giá chỉ hiển thị từ response.
- Có loading, empty, error/retry và correlation. Không tự chuyển fixture khi server trả lỗi; fixture mode chỉ bật rõ trong dev.
- Kiểm bố cục điện thoại và link vào trang detail.

**Nghiệm thu:** thao tác search/next page đổi request đúng, list rỗng/lỗi hiển thị đúng và API thật M1 trả dữ liệu. Không viết một danh sách hard-code rồi báo đã tích hợp.

### 2. WEB-02 — detail và chọn Variant

**Issue:** [WEB-02 #62](https://github.com/embetapbay123/PBL6/issues/62). **API:** `getProduct`.

- Hiển thị ảnh, mô tả, Variant/giá/status theo response; chọn Variant giữ đúng ID và quantity hợp lệ.
- Product không tồn tại/bị ẩn có UI rõ; có loading/error và layout điện thoại.
- Nút thêm Cart dùng `addCartItem` khi CART-02 đã bàn giao; trong lúc API còn 501, báo chưa khả dụng, không hiển thị đã thêm thành công giả.

**Nghiệm thu:** reload URL detail vẫn hoạt động, đổi Variant hiển thị đúng dữ liệu API, 404/422/501 có trạng thái rõ. Phần thêm Cart thật đối chiếu với Hoa.

### 3. WEB-04 — profile và địa chỉ

**Issue:** [WEB-04 #64](https://github.com/embetapbay123/PBL6/issues/64). **API:** profile và Address M3 trong contract.

- Route yêu cầu đăng nhập; list/create/edit/delete/default address và profile form dùng component chung, typed DTO.
- Khóa nút khi đang submit; hiển thị field error 422, lỗi quyền/phiên và refresh dữ liệu sau mutation. Reload phải đọc lại server.
- Trí bàn giao Address thật ngày 2; trước đó làm UI bằng fixture dev rõ ràng, sau đó kiểm lại bằng Customer seed.

**Nghiệm thu:** Customer sửa profile/thêm/sửa/đổi mặc định/xóa địa chỉ và reload đúng; loading/empty/error không bị bỏ qua.

### Lát cắt hỗ trợ và việc tiếp theo

- [WEB-03 #63](https://github.com/embetapbay123/PBL6/issues/63): tuần này dùng login/logout và xử lý expired session từ nền để truy cập WEB-04. Không viết token storage/client riêng. Register/verify/reset/change-password form có thể làm sau; issue còn mở nếu chưa đủ scope.
- Nếu ba màn đã tích hợp và test đạt, lấy [WEB-05 #65](https://github.com/embetapbay123/PBL6/issues/65): Cart list/update/remove nối API Hoa; lỗi đổi giá/Variant unavailable theo response. Checkout/Payment/Chat/Recommendation chưa là mục tiêu chính của tuần này.

**File bắt đầu:** [ProductsSample](../../frontend/src/features/customer/ProductsSample.tsx), [Customer routes](../../frontend/src/features/customer/routes.tsx), [components chung](../../frontend/src/bootstrap/components.tsx), [ProductEdit mẫu form](../../frontend/src/bootstrap/ProductEdit.tsx), [typed adapter](../../frontend/src/api/operations.ts), [Web README](../../frontend/README.md).

## Dùng DTO, fixture và kiểm tra PR

| Thành phần | File/đường dẫn dùng chung |
| --- | --- |
| DTO Nest và typed input/output | [dtos.generated.ts](../../backend/shared/src/dtos.generated.ts), [operations.generated.ts](../../backend/shared/src/operations.generated.ts) |
| Gọi service khác | [InternalClients](../../backend/shared/src/internal-clients.ts), [M4 InternalClient](../../backend/ai-service/app/internal_client.py); timeout 1 giây, giữ correlation |
| DTO M4 | [runtime_contracts.py](../../backend/ai-service/app/runtime_contracts.py), registry theo operation |
| Fixture request/response | [110 operation](../contracts/fixtures.generated.json); token/signature là dữ liệu vô hiệu, không dùng xác minh provider |
| Web / Mobile fixture | `VITE_API_MODE=fixture` trong dev; Flutter `USE_CONTRACT_FIXTURES=true` qua helper, không fallback khi API lỗi |
| Transaction / tiền | [payment.port.ts](../../backend/commerce-service/src/payment/payment.port.ts), [money.ts](../../backend/shared/src/money.ts); DB riêng từng service, Order–Payment chung manager M2 |
| Test tham chiếu | [handoff integration](../../backend/tests/integration/handoff.test.ts), [contract unit](../../backend/tests/unit/contracts.test.ts) |

Trước PR, chạy các checks chung từ repo root:

```powershell
npm run docs:check
npm run contracts:check
npm run contracts:drift
```

Chạy build/test đúng phần thay đổi: backend `npm run build:backend` và `npm run test:backend`; Web `npm run build` và Playwright; M4 pytest; Mobile `flutter analyze`/`flutter test` trong `mobile`. Với transaction/quyền/replay cần integration PostgreSQL và HTTP/broker thực, theo [verification plan](verification-plan.md). Nếu sửa contract, chạy generate contracts/types và commit output generated; không sửa generated bằng tay hay migration 001–003.

PR ghi: issue, operation/lát cắt đã làm, cách chạy, dữ liệu test, test result, ảnh/video UI nếu có và dependency còn thiếu. PR một phần dùng `Refs #N`; chỉ dùng `Closes #N` khi đủ toàn bộ tiêu chí issue. Member cần review và CI xanh trước merge theo rule main; reviewer theo issue, Công hỗ trợ các điểm shared/tích hợp.

## Ngày 5: demo và chốt bàn giao tuần

| Người | Demo tối thiểu cần có bằng dữ liệu/API thật | Bằng chứng lỗi/quyền |
| --- | --- | --- |
| Thịnh | Public list/detail → Seller list → adjust/read kho; M2 gọi quote; reservation commands | Store khác, Product không bán, thiếu tồn/multi-SKU rollback, replay/conflict/concurrency |
| Trí | CRUD/default Address → Store read/update → M2/M4 gọi lookup | Address khác Customer, Store khác Owner, phiên hết hạn, mất quyền, Store khóa |
| Hoa | Add/list/update/remove Cart qua M1; Voucher CRUD; Order read | Customer/Store khác, version cũ, M1 timeout, request cạnh tranh; event rollback |
| Công | Payment read/attempt/port và COD trong transaction test; consent + nguồn search/view/cart đến M4 | Provider timeout, rollback Order/Payment, COD replay; consent off và inbox dedup |
| Hatsaphone | Customer list → detail/Variant → profile/địa chỉ, responsive và reload | Loading/empty/network error, 401/404/422/501, mutation không gửi trùng |

Checkout/thu tiền thật toàn luồng, callback consume/refund, ALS/RAG, mọi màn Admin/Seller và APK/device không tự được tính hoàn thành từ demo tuần này. Phần còn thiếu giữ task và owner ở [bảng tổng](task-assignment.md).

**Kết thúc tuần:** từng người cập nhật issue/PR với phần đạt/chưa đạt và điểm nối đã bàn giao; kéo Review khi sẵn nghiệm thu, Done chỉ khi đủ tiêu chí/merge/issue completed. Không phải đợi tất cả task của một người xong mới merge các PR độc lập đã đạt.
