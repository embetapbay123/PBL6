# Week 2 — ráp kho, Payment/COD và checkout thật

Kế hoạch chốt ngày **06/10/2026**, gồm **5 ngày làm việc kể từ khi nhóm bắt đầu Week 2**. Ngày 1–5 là mốc phối hợp, không giả định nhóm bắt đầu vào một ngày lịch cụ thể. Dùng `main` sau [PR #88](https://github.com/embetapbay123/PBL6/pull/88), [#89](https://github.com/embetapbay123/PBL6/pull/89) và [#87](https://github.com/embetapbay123/PBL6/pull/87); không tiếp tục code trên nhánh PR đã merge.

[Kanban theo member](https://github.com/users/embetapbay123/projects/1/views/3) · [Toàn bộ task](task-assignment.md) · [Cách chạy](../../README.md) · [Contract tích hợp](../integration-contract.md) · [Week 1](week1.md)

[Roadmap toàn bộ](roadmap.md) chốt mốc dự kiến Week 6 đủ chức năng, Week 8 nghiệm thu và Week 9 dự phòng; [Week 3](week3.md) tiếp Online Payment/Refund và màn mua hàng. Rà mốc sau demo Week 2 bằng kết quả thực tế.

## Đầu vào đã có và kết quả cần đạt

Main đã có QuoteVariants M1; Cart M2; Address/Profile và hai lookup M3; Order read, Voucher CRUD, review eligibility và Seller transition/Shipment mô phỏng; Mobile có các màn/client để tiếp tục tích hợp. Customer Web hiện có danh sách mẫu với retry. Xem [bàn giao Hoa](hoa-consolidated-handoff.md), [bàn giao Trí](tri-lookup-handoff.md) và [trạng thái API](endpoint-status.md). Có code hoặc PR đã merge không đồng nghĩa toàn bộ issue rộng đã hoàn thành.

**Luồng nghiệm thu chính cuối tuần:** Customer chọn Variant → Cart → quote từ M1/M3 thật → confirm COD tạo purchase group và Order/Payment từng Store → consume kho → Seller xác nhận/xử lý/giao → thu COD đủ tiền → COMPLETED. Web/Mobile chỉ báo thành công khi API thực sự hoàn tất bước tương ứng. M4 consent/tracking là luồng riêng, không chặn mua hàng khi AI lỗi.

Sandbox callback/refund/recovery có lát cắt riêng. Chỉ demo thành công nếu đã kiểm chứng trọn luồng; phần chưa đạt giữ 501/trạng thái pending rõ ràng. Không trả thành công giả để đủ demo. Dữ liệu seed và Shipment mô phỏng được ghi đúng nhãn; đây chưa phải carrier hoặc tiền production.

Phần M4 độc lập của Công có [AI runtime handoff](ai-runtime-handoff.md): session/Guest key/history, retrieval Catalog có kiểm version, adapter model mặc định none, recommendation baseline/ALS offline và metrics đúng scope. Chỉ bật `AI_MODE=real` sau migration 006; provider chưa cấu hình thì fallback có lý do, không nhận là AI/model đã nghiệm thu. AI-02/03/04 vẫn cần dữ liệu/provider/bằng chứng chất lượng theo issue; các module Cart/Checkout/Inventory của owner khác không được thay bằng fake để đóng task.

Hoa đã có [Refund request/read/worker kernel](refund-runtime-handoff.md) để nối cancel/expiry cùng transaction Order; provider hiện disabled, Refund REQUESTED/UNKNOWN không phải tiền đã hoàn. Normal late payment của Order đóng có job ổn định; tiền chuyển dư và RECONCILE_REQUIRED giữ scope riêng, không tự đóng theo khoản chính.

## Phân công và thứ tự

### Cập nhật review ngày 10/10/2026

- Thịnh đã bàn giao reserve/consume/release ở [PR #98](https://github.com/embetapbay123/PBL6/pull/98), inventory/low-stock backend ở [#99](https://github.com/embetapbay123/PBL6/pull/99) và public Catalog/taxonomy/filter/ảnh/search-view producer ở [#100](https://github.com/embetapbay123/PBL6/pull/100). INV-02 #14 và CAT-04 #11 hoàn thành; INV-01 #13 còn Seller UI. Tiếp INV-03 #15 và Seller UI, không viết lại command đã bàn giao.
- Hatsaphone có Product detail/Variant/ảnh/addCart thật và route Cart/Checkout qua [PR #96](https://github.com/embetapbay123/PBL6/pull/96). WEB-02 #62 hoàn thành; WEB-05 #65 còn enrich thông tin Product/giá và nghiệm thu UI; WEB-06 #66 mới có client COD, còn nghiệm thu backend confirm/multi-Store, voucher/online Payment và khôi phục attempt khi reload. Chi tiết: [Customer Web handoff](customer-web-handoff.md).
- Trí sửa [PR #101 theo review](https://github.com/embetapbay123/PBL6/pull/101#pullrequestreview-5478882839): email delivery/fail-closed; vô hiệu reset token cũ; chống ghi đè khi đổi password đồng thời; payload event đúng schema và effective permission. AUTH-01 #37, AUTH-02 #38, RBAC-01 #44 giữ mở/In progress, không dùng CI xanh hiện tại để coi các lỗi này đã đạt.
- Hoa có thể tích hợp Inventory và Catalog thật từ main; Công tiếp nghiệm thu nguồn tracking thật và các điểm nối Payment/Refund theo task hiện có. Không đổi owner của Checkout, Inventory hay M3.

Kiểm tra tích hợp sau review: **179 Node unit, 85 HTTP/PostgreSQL integration, 14 Web e2e** đạt; CI kiểm thêm Python, Flutter và schema/contract. Additive contract `Product.images` yêu cầu rebuild cả các consumer M2/M4; container cũ có validator cũ sẽ từ chối response mới bằng 503. Setup giữ migration/seed và `.env` local theo README.

| Người / GitHub | Task chính theo thứ tự | Task tiếp khi phần chính đạt | Đầu ra bàn giao |
| --- | --- | --- | --- |
| Công / `embetapbay123` | [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51) → [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54) → [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55) | [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52), lát cắt [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60); [PAY-03 #53](https://github.com/embetapbay123/PBL6/issues/53) khi bắt đầu Refund | PaymentPort/Payment read, COD cùng manager; consent GET/PATCH và inbox consumer; bộ test điểm nối |
| Thịnh / `QT-2005` | [INV-02 #14](https://github.com/embetapbay123/PBL6/issues/14) → [INV-01 #13](https://github.com/embetapbay123/PBL6/issues/13) → [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11) | [INV-03 #15](https://github.com/embetapbay123/PBL6/issues/15), Seller flow [SELL-02 #19](https://github.com/embetapbay123/PBL6/issues/19) | Reserve/consume/release; low-stock/read/adjust; Catalog đủ dữ liệu cho UI; restock/recovery |
| Hoa / `mimidangeiu` | [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) → [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) + [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) → [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25) | [MOB-03 #33](https://github.com/embetapbay123/PBL6/issues/33), [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24); chốt [ORDER-03 #23](https://github.com/embetapbay123/PBL6/issues/23)/[VOUCHER-01 #27](https://github.com/embetapbay123/PBL6/issues/27) | Quote thật, confirm/idempotency/quota/compensation; controller COD; Mobile nối luồng đã hoàn thiện |
| Trí / `phantri1912` | Hoàn thiện nhánh đang làm [AUTH-01 #37](https://github.com/embetapbay123/PBL6/issues/37) → [AUTH-02 #38](https://github.com/embetapbay123/PBL6/issues/38) → chốt [AUTH-03 #39](https://github.com/embetapbay123/PBL6/issues/39) | [RBAC-01 #44](https://github.com/embetapbay123/PBL6/issues/44), [STORE-02 #41](https://github.com/embetapbay123/PBL6/issues/41); [STORE-01 #40](https://github.com/embetapbay123/PBL6/issues/40) là bước tiếp | Register/verify/reset/change-password thật; session revoke; Admin User/Store và event; Store lookup/update |
| Hatsaphone / `HATSAPHONE` | Chốt [WEB-01 #5](https://github.com/embetapbay123/PBL6/issues/5) → [WEB-02 #62](https://github.com/embetapbay123/PBL6/issues/62) → [WEB-04 #64](https://github.com/embetapbay123/PBL6/issues/64) → [WEB-05 #65](https://github.com/embetapbay123/PBL6/issues/65) | Form [WEB-03 #63](https://github.com/embetapbay123/PBL6/issues/63); khung [WEB-06 #66](https://github.com/embetapbay123/PBL6/issues/66) sau handoff quote | List/detail, Profile/Address và Cart nối API thật; chỉ UI và adapter theo mẫu, không nhận BE/AI |

Owner và Assignee phải khớp tên trên bảng này. Không đổi owner để vượt dependency. Những task tiếp theo đã có issue; bảng này là kế hoạch scope, **Status sống trên Kanban**. Giữ thẻ đang In progress do member đặt; Trí đang có nhiều thẻ active cần tự chốt một nhánh chính, bàn giao từng lát cắt rồi lấy tiếp. Không tự kéo toàn bộ kế hoạch sang In progress.

## Việc cụ thể và file bắt đầu

### Công — Payment/COD và M4

Bổ sung [AI evaluation handoff](ai-evaluation-handoff.md): dataset/runner/baselines và case chat đã chạy synthetic controls; provider none, quality thực NOT_RUN. #56–58 vẫn giữ phần nghiệm thu riêng.

Cập nhật 07/10: [bàn giao toàn phần độc lập](cong-independent-handoff.md), PR #92/#93 đã merge. Model chưa chọn nên adapter/fallback rõ ràng; Refund provider disabled; smoke Catalog/related và restore 4 DB có bằng chứng. Các issue rộng giữ mở cho nghiệm thu thực và owner dependency.

**Cập nhật sau PR #90:** PAY-01 #51 và PAY-04 #54 đã Done, port/Payment read/attempt dùng được trên main; không viết lại. AI-01 #55 Todo cho phần còn lại, còn nghiệm thu đủ nguồn search/view/cart/purchase thật; producer giữ đúng owner. [Handoff và CI](cong-week2-handoff.md). PAY-02 #52/PAY-03 #53 giữ kế hoạch tiếp theo, không tự đưa toàn bộ task tương lai vào Todo. Các mục dưới mô tả phạm vi và tiêu chí để đối chiếu.

- Đọc [PaymentPort](../../backend/commerce-service/src/payment/payment.port.ts) và module [Payment/Refund](../../backend/commerce-service/src/payment/README.md). Implement `createForOrder`, `recordCodCollection` bằng đúng manager truyền vào. Hoa gọi port; Công ghi Payment/CODCollection/PaymentEvent và audit. Không có writer tiền thứ hai trong OrderRepository, không gọi provider trong transaction DB.
- PAY-01: `getPayment` kiểm Customer/Order; `createPaymentAttempt` cấp reference từ server, đúng amount và idempotency. QR/reference chưa chứng minh đã thu tiền; timeout chưa xác định phải giữ UNKNOWN để đối soát.
- PAY-04: chỉ thu Order SHIPPED/COD, đúng payable và operation ID. Hai request cạnh tranh/replay chỉ ghi một collection; lỗi Payment rollback Order và tiền. Bàn giao port ngày 2 để Hoa ráp endpoint.
- AI-01: [consent](../../backend/ai-service/app/consent/README.md), [tracking](../../backend/ai-service/app/tracking/README.md). GET/PATCH consent theo User; consumer kiểm schema/consent/inbox trước lưu hành vi, kiểm off/retention và event lặp. Dùng event 1.0 đã chốt; không làm recommendation/chat hoàn chỉnh trong lát cắt này.
- PAY-02/OPS-02: raw body signature trước DTO; dedup callback/reference/amount; Payment success nhưng consume lỗi phải RECOVERING và retry cùng operation ID. Refund là PAY-03 của Công, không đẩy cho Hoa hoặc giả refund thành công.

### Thịnh — command kho trước, Catalog/Seller sau

- Đọc [Inventory](../../backend/catalog-service/src/inventory/README.md), generated internal DTO và shared idempotency. Implement `ReserveInventory`, `ConsumeReservation`, `ReleaseReservation` theo contract hiện có; QuoteVariants đã có, không viết lại.
- Khóa SKU theo thứ tự ổn định; reserve nhiều SKU/mọi Store nguyên tử, không oversell. Command dùng operation ID: cùng ID/cùng payload trả cùng kết quả; cùng ID khác payload 409. Consume/release không lặp hiệu ứng, kiểm trạng thái/expiry.
- INV-01: read/adjust/movement và `ListLowStockVariants` dùng token, Store permission, pagination, lý do adjustment và audit/StockMovement. Nối Seller UI bằng dữ liệu thật; không trả low-stock rỗng khi dependency lỗi.
- CAT-04: mở rộng mẫu public list/detail/taxonomy để Web/Mobile có filter, ảnh, Variant/status đúng. Kiểm Product/Store khóa, ID sai, pagination/sort và query tránh N+1. Search/view phát event đúng nguồn M1 nếu có User xác thực.
- INV-03: restock theo Order đã consume, một lần; worker đối soát reservation hết hạn trước release nếu Payment chưa rõ. Bàn giao cho Hoa để triển khai hủy; không tự quyết định Payment từ DB M2.

### Hoa — ráp Order bằng dependency thật

- Đọc [Order](../../backend/commerce-service/src/order/README.md), [quote store](../../backend/commerce-service/src/order/quote-store.ts), [Voucher](../../backend/commerce-service/src/voucher/README.md). Không sửa lại Cart CRUD đã bàn giao.
- ORDER-01: M3 context đã trên main qua #87. Chạy quote từ Cart thật, kiểm snapshot/address/Store shipping/version và voucher stacking/phân bổ. Kiểm thay đổi giá/tồn/địa chỉ/quyền, hash/TTL/owner; chưa đánh dấu toàn endpoint hoàn thành chỉ vì lookup đã có.
- ORDER-02/VOUCHER-03: cấp ID Order trước reserve; persist orchestration/idempotency để restart được. Reserve đủ rồi transaction M2 tạo toàn nhóm Order/OrderItem/Payment, quota/redemption/snapshot/outbox bằng cùng manager; lỗi DB phải release tất cả reservation và phần giữ quota trước commit. COD consume sau tạo: lỗi giữ PREPARING và worker retry, chưa cho Seller xử lý. Không tự retry command HTTP trong request.
- Chốt lượt Voucher theo BR-40: lỗi trước commit nhóm thì release phần giữ; hủy/hết hạn một Order sau commit **không khôi phục lượt đã chốt hoặc tính lại Order khác**. VOUCHER-01 còn bằng chứng hai Store/Voucher đã dùng; ORDER-03 còn nghiệm thu read/payment/refund scope. Các card rộng này giữ mở đến đủ tiêu chí.
- ORDER-05: kiểm scope/SHIPPED/COD/version/amount rồi gọi port Công. ORDER-04 đã có transition/Shipment; phần còn lại là hủy + release/restock/refund chống lặp, không viết lại transition và không báo hủy thành công trước compensation.
- MOB-03: [Mobile README](../../mobile/README.md); chạy Cart/quote/COD confirm thật trên Android/emulator, giữ key qua retry cùng attempt và lấy quote mới khi 409. MOB-01/02 và report còn phạm vi riêng; không đóng bằng widget mock hoặc dependency vừa merge.

### Trí — Auth/RBAC thật, giữ lookup đã xong

- Đọc [Auth](../../backend/identity-store-service/src/auth/README.md), [handoff M3](tri-lookup-handoff.md), [security](security.md). Address và hai lookup đã có; không làm lại.
- AUTH-01/02: token verify/reset riêng, hash trong DB, expiry/one-time/rate limit; không dùng access-token verifier sai mục đích. Register phải tạo User/Profile/role theo schema và transaction; password mới revoke phiên theo BR. Không có route trùng skeleton, không để change-password Public, không log token/raw email link hoặc dùng mock email tự động trong production.
- AUTH-03: chốt WEB/MOBILE, refresh replay/expiry/CSRF/logout, effective permission sau User/Store khóa hoặc membership revoke, Profile ownership/audit và response schema. API còn sample giữ sample đến đủ nghiệm thu; không gom thiếu register/reset vào task này vì #37/#38 là task riêng.
- [Administration](../../backend/identity-store-service/src/administration/README.md), [Store](../../backend/identity-store-service/src/store/README.md): RBAC-01 kiểm Admin-only/version và UserLocked/StoreStatusChanged/MembershipChanged outbox cùng audit. STORE-02 nối Owner update/ActiveStores thật; User/Store count phục vụ report M2 phải từ nguồn Admin M3, không tự lấy số khách có Order.
- Admin Web chỉ nối API đã bàn giao; StoreApplication/staff/invitation giữ các issue riêng. Không nhận Payment hoặc Catalog của member khác.

### Hatsaphone — tiếp tục UI theo mẫu

- Đọc [frontend README](../../frontend/README.md), `frontend/src/features/customer`, [typed adapter](../../frontend/src/api/operations.ts) và [components](../../frontend/src/bootstrap/components.tsx). Dùng một AuthProvider/QueryClient/client chung; không tự lưu thêm access token hoặc tính lại giá nguồn.
- WEB-01: hoàn thiện màn list theo scope issue và demo search/pagination/loading/empty/error/correlation/điện thoại; #89 mới sửa retry của mẫu. WEB-02: detail, chọn Variant, trạng thái không bán/404, addCartItem gửi Product ID + Variant ID + quantity đúng contract.
- WEB-04: M3 Profile/Address đã thật. Form allowlist, đổi default qua PATCH, reload sau mutation, hiển thị lỗi field/IDOR/phiên hết hạn.
- WEB-05: Cart API đã thật. Hiển thị Store/item, quantity/version/remove, chặn thao tác trùng, cập nhật dữ liệu sau mutation. Giá hiển thị lấy Catalog, total cuối cùng lấy quote; item không resolve được Product/giá phải có trạng thái rõ.
- WEB-03/06: phần độc lập dùng fixture dev chọn rõ; nối Auth của Trí và quote/confirm của Hoa khi đạt. Khi server 501 không mở trang đặt hàng thành công. Không nhận nhiệm vụ backend, quota hoặc Payment.

## Lịch 5 ngày và handoff

| Ngày | Công | Thịnh | Hoa | Trí | Hatsaphone |
| --- | --- | --- | --- | --- | --- |
| 1 | Payment create/read cùng manager; test rollback | Reserve multi-SKU + lock/idempotency | Quote thật + thiết kế persisted confirm/quota | Chốt một nhánh Auth đang làm; verify/token/role/profile | Chốt list rồi detail/chọn Variant |
| 2 | Bàn giao Payment create và COD port | Bàn giao reserve/consume/release có replay/concurrency test | Ráp confirm bằng port/commands thật; lỗi DB release | Bàn giao register/verify; tiếp reset/change | Detail → add Cart thật; Profile/Address |
| 3 | COD/replay/amount; consent GET/PATCH | Inventory/low-stock và Catalog đủ payload | Quota/redemption atomic; COD endpoint; read scopes | Reset/change/revoke session; Auth-03 | Profile/Address reload/default/error; Cart |
| 4 | Consent/inbox consumer; callback/recovery lát cắt | Restock/expiry/recovery; Seller flow | Confirm crash/retry, Mobile thật; hủy phần đã có compensation | RBAC/User/Store state/event; Store/count API | Cart mutation/error/phone; form Auth nếu API đạt |
| 5 | Chạy test tích hợp COD và ghi pending online/refund | Demo kho/Catalog + invariant | Demo nhiều Store/COD + Android; phần hủy chưa đủ giữ pending | Demo token/revoke/scope và API/Admin đã làm | Demo list/detail/Profile/Address/Cart thật |

Mốc ngày 2 là handoff **lát cắt chạy được**, không yêu cầu hoàn thành tất cả task owner mới bàn giao. Nếu chưa có dependency, consumer vẫn viết phần độc lập với adapter/fixture; issue ghi operation đang chờ, owner, lỗi thực tế và điều kiện nối lại. Không chuyển cả task sang Blocked khi vẫn có phần độc lập.

## Nghiệm thu cuối tuần

1. Một purchase group có Order/Payment từng Store, một key không tạo hai nhóm. SKU cuối không oversell; thay payload cùng operation ID trả 409.
2. Reserve thành công/transaction M2 lỗi không để Order một phần hoặc reservation/quota treo. Crash sau commit/consume lỗi có state và worker retry cùng ID.
3. COD chưa thu đủ không COMPLETED; cùng key/replay chỉ thu một lần; lỗi Payment rollback cả transaction. Shipment vẫn được ghi rõ là mô phỏng.
4. Address/User/Store/permission thay đổi được kiểm từ M3 hiện hành. Search/view/cart/purchase vào M4 đúng nguồn; consent off hoặc event lặp không lưu hành vi trái phép.
5. Web chạy ở màn hình điện thoại; Android có bằng chứng API thật. 401/409/422/501/503 có UX rõ; không fixture fallback. Online/refund chưa đủ giữ task mở.

Chạy docs/OpenAPI/drift, build và test module; PR nghiệp vụ cần integration PostgreSQL/HTTP và CI từ checkout mới. Sử dụng [verification plan](verification-plan.md) và [validation record](validation-record.md). Commit message, tiêu đề và mô tả PR **viết tiếng Anh**, ghi `Refs #N` nếu chỉ xong một phần; `Closes #N` chỉ khi đủ toàn bộ tiêu chí. Không thêm mẫu tin nhắn nhóm vào tài liệu hoặc commit.
