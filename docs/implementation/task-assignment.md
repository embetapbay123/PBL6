# Phân công toàn bộ phạm vi triển khai 2.2

**Nền để bắt đầu code:** [contract, DTO runtime, adapter/fixture và mẫu chạy được](foundation-handoff.md).

**Việc cần làm hiện tại:** [Week 2: kế hoạch 5 ngày, link issue và chi tiết từng người](week2.md). [Week 1](week1.md) giữ kế hoạch giai đoạn trước. Bảng dưới giữ toàn bộ phạm vi; CORE/FLOW đã có nền để review, Công bắt đầu Payment/M4.

**Kế hoạch toàn bộ:** [Roadmap Week 1–8](roadmap.md) bao phủ 71 issue và mốc mục tiêu từng scope; Week 3–8 có lịch/việc/handoff riêng. Status thực tế vẫn trên Kanban, không tự Done theo lịch.

**Schema đã chốt để code:** [database baseline 2.2](database-schema.md). Chạy toàn bộ migration hiện có: 001→002→003 ở từng service và thêm 004 ở M2; dùng DTO OpenAPI. Không phải chờ chốt database thêm.

[Mở bảng tổng theo member](https://github.com/users/embetapbay123/projects/1/views/3) · [Kanban tiến độ](https://github.com/users/embetapbay123/projects/1/views/2) · [Cách dùng](kanban-guide.md)

**Đã giao trước toàn bộ71 task của5 người.** Tài liệu này là bảng scope và đường dẫn tới issue; **Status trên Project là nguồn tiến độ duy nhất**. Không đợi Công mở từng task hoặc đợi cả nhóm kết thúc một đợt. Mỗi người chọn một task phù hợp, làm phần độc lập với contract/seed/fixture, rồi tích hợp khi dependency bàn giao API thật.

Task chưa làm không có nghĩa nghiệp vụ đã hoàn thành. Khung vẫn có sample/mock/501; chỉ cập nhật endpoint-status sau nghiệm thu đúng phạm vi. Không dùng fixture để báo thanh toán/Order thành công thật.

## Bảng tổng theo người

| Member | GitHub | Phạm vi đầy đủ | Số task |
| --- | --- | --- | --- |
| Công | [embetapbay123](https://github.com/embetapbay123) | Shared/gateway/CI, contract tích hợp, Payment/Refund/COD, toàn M4, security/load/recovery/demo | 14 |
| Thịnh | [QT-2005](https://github.com/QT-2005) | Catalog/Taxonomy/Inventory/Review/Moderation M1 và toàn Seller Web | 14 |
| Hoa | [mimidangeiu](https://github.com/mimidangeiu) | Cart/Order/Voucher/Report M2, review eligibility và Customer Android | 18 |
| Trí | [phantri1912](https://github.com/phantri1912) | Auth/Profile/Address/Store/Staff/RBAC M3 và toàn Admin Web | 14 |
| Hatsaphone | [HATSAPHONE](https://github.com/HATSAPHONE) | Customer Web theo màn; chỉ UI/API theo mẫu, không BE/AI | 11 |

Cả bốn member đã có quyền cộng tác repo và Write trên Project. Toàn bộ 71 issue gán Assignee theo Owner: Công `embetapbay123`, Hoa `mimidangeiu`, Thịnh `QT-2005`, Trí `phantri1912`, Hatsaphone `HATSAPHONE`. Task member không còn tạm giao Công; Status hiện hành xem trên Kanban.

Số task không là số giờ: Công giữ giao dịch/AI/tích hợp nặng; Hatsaphone nhận các màn theo component/contract mẫu, Công hỗ trợ adapter. Hoa có cả M2 và Android; khi chọn việc cần ưu tiên handoff BE trước phần UI dùng API đó.

## Cách bắt đầu song song

| Người | Ưu tiên lấy việc đầu | Phần khác có thể làm với seed/fixture |
| --- | --- | --- |
| Công | [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-04 · #54](https://github.com/embetapbay123/PBL6/issues/54), [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55) | Review CORE/FLOW đã có; callback/recommendation theo payload đã chốt |
| Thịnh | [INV-02 · #14](https://github.com/embetapbay123/PBL6/issues/14) → [INV-01 · #13](https://github.com/embetapbay123/PBL6/issues/13) → [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11); QuoteVariants đã Done | Product/Variant/Image, taxonomy và Seller page riêng |
| Hoa | [ORDER-01 · #21](https://github.com/embetapbay123/PBL6/issues/21) → [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22)/[VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) → [ORDER-05 · #25](https://github.com/embetapbay123/PBL6/issues/25); Cart/Admin Voucher đã Done | Order read/report và Android; Store Voucher còn acceptance riêng |
| Trí | Nhánh Auth đang làm: [AUTH-01 · #37](https://github.com/embetapbay123/PBL6/issues/37) → [AUTH-02 · #38](https://github.com/embetapbay123/PBL6/issues/38) → [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39); Address/lookup đã Done | Store/staff/RBAC và Admin từ seed/fixture |
| Hatsaphone | [WEB-01 · #5](https://github.com/embetapbay123/PBL6/issues/5) → [WEB-02 · #62](https://github.com/embetapbay123/PBL6/issues/62) → [WEB-04 · #64](https://github.com/embetapbay123/PBL6/issues/64)/[WEB-05 · #65](https://github.com/embetapbay123/PBL6/issues/65) | Dùng login/client nền; làm component và ráp API thật theo Week 2 |

- FLOW-01 đã chốt M1 quote/kho, lookup M3, low-stock/report, scope AI và EntityManager Order/Payment trong [foundation handoff](foundation-handoff.md); member dùng điểm nối này để triển khai.
- API client/types/fixture là điểm xuất phát; generic client hiện có và seed cho phép viết module/page riêng. Không để mọi page chờ Công viết toàn bộ adapter.
- Dependency trong bảng là đầu vào để **nghiệm thu tích hợp**, không là điều kiện để công bố/giao task. Nếu còn phần độc lập, tiếp tục làm phần đó.
- Mỗi người tối đa một task In progress. Các task còn lại đã nằm trên board; owner tự chọn task Todo phù hợp và cập nhật tiến độ.
- P0: contract/nền và luồng mua cốt lõi; P1: nghiệp vụ/UI; P2: nghiệm thu thiết bị/tải/recovery/demo. Ưu tiên không bắt cả nhóm làm tuần tự.
- Không chốt deadline chỉ từ số thẻ. Khi có hạn demo, nhóm chọn scope/mốc theo đầu ra, không tự bỏ các FR/NFR còn thiếu.

## Toàn bộ task và đầu ra

Mở issue để đọc cách bắt đầu, API/path, tiêu chí riêng, reviewer và checklist bằng chứng. Dependency được link tới issue, không cần xin giao thêm việc.

### Công — 14 task

| Task | Đầu ra / scope | Ưu tiên ban đầu | Handoff cần cho tích hợp |
| --- | --- | --- | --- |
| [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1) | Tách route/page/component Web dùng chung | P0 | Khung/contract/seed hiện có |
| [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) | Chốt contract tích hợp và interface Order/Payment | P0 | Khung/contract/seed hiện có |
| [CORE-02 · #50](https://github.com/embetapbay123/PBL6/issues/50) | API adapter/fixture mẫu, codegen và chuẩn bàn giao | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51) | PaymentAttempt, Payment read và provider adapter<br>`createPaymentAttempt`, `getPayment` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [PAY-02 · #52](https://github.com/embetapbay123/PBL6/issues/52) | Webhook SePay Test và callback tương thích<br>`sepayCallback`, `sandboxCallback` | P1 | [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [INV-02 · #14](https://github.com/embetapbay123/PBL6/issues/14), [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22) |
| [PAY-03 · #53](https://github.com/embetapbay123/PBL6/issues/53) | Refund, reconciliation và Payment recovery<br>`getOrderRefund` | P1 | [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-02 · #52](https://github.com/embetapbay123/PBL6/issues/52), [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [PAY-04 · #54](https://github.com/embetapbay123/PBL6/issues/54) | Domain COD collection cùng transaction Order | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51) |
| [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55) | Consent, tracking và consumer sự kiện có dedup<br>`getPersonalizationConsent`, `updatePersonalizationConsent` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [AI-02 · #56](https://github.com/embetapbay123/PBL6/issues/56) | Recommendation ALS, related, fallback và index<br>`getForYou`, `getRelatedProducts` | P1 | [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55), [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11), [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [AI-03 · #57](https://github.com/embetapbay123/PBL6/issues/57) | Chat session/history và RAG theo dữ liệu Catalog<br>`createChatSession`, `sendChatMessage`, `listOwnChatSessions` | P1 | [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55), [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11), [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [AI-04 · #58](https://github.com/embetapbay123/PBL6/issues/58) | AI metrics, evaluation dataset và báo cáo chất lượng<br>`getAiMetrics` | P1 | [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55), [AI-02 · #56](https://github.com/embetapbay123/PBL6/issues/56), [AI-03 · #57](https://github.com/embetapbay123/PBL6/issues/57), [ID-LOOKUP-01 · #45](https://github.com/embetapbay123/PBL6/issues/45) |
| [OPS-01 · #59](https://github.com/embetapbay123/PBL6/issues/59) | Kiểm bảo mật, permission và chịu tải mục tiêu | P2 | [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11), [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39), [AI-03 · #57](https://github.com/embetapbay123/PBL6/issues/57) |
| [OPS-02 · #60](https://github.com/embetapbay123/PBL6/issues/60) | Tích hợp checkout/payment/kho và phục hồi lỗi | P2 | [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22), [ORDER-04 · #24](https://github.com/embetapbay123/PBL6/issues/24), [PAY-02 · #52](https://github.com/embetapbay123/PBL6/issues/52), [PAY-03 · #53](https://github.com/embetapbay123/PBL6/issues/53), [INV-03 · #15](https://github.com/embetapbay123/PBL6/issues/15), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [DEMO-01 · #61](https://github.com/embetapbay123/PBL6/issues/61) | Nghiệm thu FR/NFR, tài liệu và demo toàn hệ thống | P2 | [OPS-01 · #59](https://github.com/embetapbay123/PBL6/issues/59), [OPS-02 · #60](https://github.com/embetapbay123/PBL6/issues/60), [MOB-06 · #36](https://github.com/embetapbay123/PBL6/issues/36), [ADMIN-04 · #49](https://github.com/embetapbay123/PBL6/issues/49), [SELL-03 · #20](https://github.com/embetapbay123/PBL6/issues/20), [WEB-11 · #71](https://github.com/embetapbay123/PBL6/issues/71) |

### Thịnh — 14 task

| Task | Đầu ra / scope | Ưu tiên ban đầu | Handoff cần cho tích hợp |
| --- | --- | --- | --- |
| [CAT-01 · #2](https://github.com/embetapbay123/PBL6/issues/2) | API và danh sách sản phẩm Store trên Seller Web<br>`listOwnStoreProducts`, `listStoreProducts` | P0 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1) |
| [CAT-QUOTE-01 · #7](https://github.com/embetapbay123/PBL6/issues/7) | M1 QuoteVariants: giá và snapshot cho M2<br>Internal: `QuoteVariants` | P0 | [CAT-01 · #2](https://github.com/embetapbay123/PBL6/issues/2) |
| [CAT-02 · #9](https://github.com/embetapbay123/PBL6/issues/9) | Tạo/sửa Product đầy đủ và form Seller<br>`createProduct`, `updateProduct` | P0 | [CAT-01 · #2](https://github.com/embetapbay123/PBL6/issues/2) |
| [CAT-03 · #10](https://github.com/embetapbay123/PBL6/issues/10) | Variant, SKU, ảnh Product và form Seller<br>`createVariant`, `addProductImage` | P1 | [CAT-02 · #9](https://github.com/embetapbay123/PBL6/issues/9) |
| [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11) | Hoàn thiện public Catalog, taxonomy lookup và detail<br>`listCategories`, `listProductTypes`, `listProducts`, `getProduct` | P0 | Khung/contract/seed hiện có |
| [TAX-01 · #12](https://github.com/embetapbay123/PBL6/issues/12) | CRUD taxonomy và attribute definition của Admin<br>`createCategory`, `updateCategory`, `createProductType`, `updateProductType`, `createAttributeDefinition`, `updateAttributeDefinition` | P0 | Khung/contract/seed hiện có |
| [INV-01 · #13](https://github.com/embetapbay123/PBL6/issues/13) | Tồn kho, adjustment, movement và Seller UI<br>`listStoreInventory`, `adjustInventory`, `listStockMovements` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [INV-02 · #14](https://github.com/embetapbay123/PBL6/issues/14) | Reserve, consume, release tồn kho chống lặp<br>Internal: `ReserveInventory`, `ConsumeReservation`, `ReleaseReservation` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [INV-01 · #13](https://github.com/embetapbay123/PBL6/issues/13) |
| [INV-03 · #15](https://github.com/embetapbay123/PBL6/issues/15) | Restock Order và phục hồi reservation hết hạn<br>Internal: `RestockOrder` | P1 | [INV-02 · #14](https://github.com/embetapbay123/PBL6/issues/14), [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [REV-01 · #16](https://github.com/embetapbay123/PBL6/issues/16) | Review sau mua và danh sách đánh giá Product<br>`listProductReviews`, `createReview`, `updateReview` | P1 | [REVIEW-ELIG-01 · #26](https://github.com/embetapbay123/PBL6/issues/26) |
| [MOD-01 · #17](https://github.com/embetapbay123/PBL6/issues/17) | Ẩn/khôi phục Product và Review<br>`hideProduct`, `restoreProduct`, `hideReview`, `restoreReview` | P1 | [CAT-02 · #9](https://github.com/embetapbay123/PBL6/issues/9), [REV-01 · #16](https://github.com/embetapbay123/PBL6/issues/16) |
| [SELL-01 · #18](https://github.com/embetapbay123/PBL6/issues/18) | Seller quản lý Store và staff/invitation | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [STORE-02 · #41](https://github.com/embetapbay123/PBL6/issues/41), [STAFF-01 · #42](https://github.com/embetapbay123/PBL6/issues/42), [STAFF-02 · #43](https://github.com/embetapbay123/PBL6/issues/43) |
| [SELL-02 · #19](https://github.com/embetapbay123/PBL6/issues/19) | Seller list/detail/xử lý Order và thu COD | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23), [ORDER-04 · #24](https://github.com/embetapbay123/PBL6/issues/24), [ORDER-05 · #25](https://github.com/embetapbay123/PBL6/issues/25) |
| [SELL-03 · #20](https://github.com/embetapbay123/PBL6/issues/20) | Seller Voucher và báo cáo Store | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [VOUCHER-01 · #27](https://github.com/embetapbay123/PBL6/issues/27), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29), [REPORT-01 · #30](https://github.com/embetapbay123/PBL6/issues/30) |

### Hoa — 18 task

| Task | Đầu ra / scope | Ưu tiên ban đầu | Handoff cần cho tích hợp |
| --- | --- | --- | --- |
| [CART-01 · #3](https://github.com/embetapbay123/PBL6/issues/3) | Đọc, sửa số lượng và xóa item giỏ hàng<br>`listCartItems`, `updateCartItem`, `removeCartItem` | P0 | [CAT-QUOTE-01 · #7](https://github.com/embetapbay123/PBL6/issues/7) |
| [CART-02 · #8](https://github.com/embetapbay123/PBL6/issues/8) | Thêm item giỏ hàng và tích hợp M1<br>`addCartItem` | P0 | [CART-01 · #3](https://github.com/embetapbay123/PBL6/issues/3), [CAT-QUOTE-01 · #7](https://github.com/embetapbay123/PBL6/issues/7) |
| [ORDER-01 · #21](https://github.com/embetapbay123/PBL6/issues/21) | Quote checkout nhiều Store và snapshot<br>`quoteCheckout` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [CART-02 · #8](https://github.com/embetapbay123/PBL6/issues/8), [CAT-QUOTE-01 · #7](https://github.com/embetapbay123/PBL6/issues/7), [ID-LOOKUP-01 · #45](https://github.com/embetapbay123/PBL6/issues/45), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22) | Confirm checkout tạo purchase group và Order nguyên tử<br>`confirmCheckout`, `getPurchaseGroupOrders` | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [ORDER-01 · #21](https://github.com/embetapbay123/PBL6/issues/21), [INV-02 · #14](https://github.com/embetapbay123/PBL6/issues/14), [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-04 · #54](https://github.com/embetapbay123/PBL6/issues/54), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23) | API đọc Order của Customer và Seller<br>`listOwnOrders`, `getOwnOrder`, `listStoreOrders`, `getStoreOrder` | P1 | Khung/contract/seed hiện có |
| [ORDER-04 · #24](https://github.com/embetapbay123/PBL6/issues/24) | Chuyển trạng thái và hủy Order hai phía<br>`transitionStoreOrder`, `cancelOwnOrder`, `cancelStoreOrder` | P1 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23), [INV-03 · #15](https://github.com/embetapbay123/PBL6/issues/15), [PAY-03 · #53](https://github.com/embetapbay123/PBL6/issues/53), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [ORDER-05 · #25](https://github.com/embetapbay123/PBL6/issues/25) | Endpoint Seller ghi nhận COD phối hợp Payment<br>`collectCod` | P1 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23), [PAY-04 · #54](https://github.com/embetapbay123/PBL6/issues/54) |
| [REVIEW-ELIG-01 · #26](https://github.com/embetapbay123/PBL6/issues/26) | M2 xác minh OrderItem đủ điều kiện Review<br>Internal: `VerifyReviewEligibility` | P1 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23) |
| [VOUCHER-01 · #27](https://github.com/embetapbay123/PBL6/issues/27) | CRUD Voucher của Store<br>`listStoreVouchers`, `createStoreVoucher`, `updateStoreVoucher` | P0 | Khung/contract/seed hiện có |
| [VOUCHER-02 · #28](https://github.com/embetapbay123/PBL6/issues/28) | CRUD Voucher toàn sàn của Admin<br>`listPlatformVouchers`, `createPlatformVoucher`, `updatePlatformVoucher` | P0 | Khung/contract/seed hiện có |
| [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) | Validate, quota, redemption và usage Voucher<br>`validateVouchers`, `getStoreVoucherUsage`, `getPlatformVoucherUsage` | P1 | [VOUCHER-01 · #27](https://github.com/embetapbay123/PBL6/issues/27), [VOUCHER-02 · #28](https://github.com/embetapbay123/PBL6/issues/28), [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6) |
| [REPORT-01 · #30](https://github.com/embetapbay123/PBL6/issues/30) | API Order quản trị, dashboard và report Store<br>`listAllOrders`, `getPlatformDashboard`, `getStoreReport` | P1 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [INV-01 · #13](https://github.com/embetapbay123/PBL6/issues/13), [AI-04 · #58](https://github.com/embetapbay123/PBL6/issues/58) |
| [MOB-01 · #31](https://github.com/embetapbay123/PBL6/issues/31) | Android Auth, profile, địa chỉ và phiên | P1 | [AUTH-01 · #37](https://github.com/embetapbay123/PBL6/issues/37), [AUTH-02 · #38](https://github.com/embetapbay123/PBL6/issues/38), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39), [ID-01 · #4](https://github.com/embetapbay123/PBL6/issues/4) |
| [MOB-02 · #32](https://github.com/embetapbay123/PBL6/issues/32) | Android Catalog/search/detail và recommendation | P1 | [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11), [AI-02 · #56](https://github.com/embetapbay123/PBL6/issues/56) |
| [MOB-03 · #33](https://github.com/embetapbay123/PBL6/issues/33) | Android Cart, Voucher và checkout | P1 | [MOB-01 · #31](https://github.com/embetapbay123/PBL6/issues/31), [MOB-02 · #32](https://github.com/embetapbay123/PBL6/issues/32), [CART-02 · #8](https://github.com/embetapbay123/PBL6/issues/8), [ORDER-01 · #21](https://github.com/embetapbay123/PBL6/issues/21), [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [MOB-04 · #34](https://github.com/embetapbay123/PBL6/issues/34) | Android Order, Payment/Refund và Review | P1 | [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23), [ORDER-04 · #24](https://github.com/embetapbay123/PBL6/issues/24), [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-02 · #52](https://github.com/embetapbay123/PBL6/issues/52), [PAY-03 · #53](https://github.com/embetapbay123/PBL6/issues/53), [REV-01 · #16](https://github.com/embetapbay123/PBL6/issues/16) |
| [MOB-05 · #35](https://github.com/embetapbay123/PBL6/issues/35) | Android Chat, consent và luồng tài khoản Store | P1 | [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55), [AI-03 · #57](https://github.com/embetapbay123/PBL6/issues/57), [STORE-01 · #40](https://github.com/embetapbay123/PBL6/issues/40), [STAFF-01 · #42](https://github.com/embetapbay123/PBL6/issues/42) |
| [MOB-06 · #36](https://github.com/embetapbay123/PBL6/issues/36) | Build APK và nghiệm thu Android thiết bị | P2 | [MOB-01 · #31](https://github.com/embetapbay123/PBL6/issues/31), [MOB-02 · #32](https://github.com/embetapbay123/PBL6/issues/32), [MOB-03 · #33](https://github.com/embetapbay123/PBL6/issues/33), [MOB-04 · #34](https://github.com/embetapbay123/PBL6/issues/34), [MOB-05 · #35](https://github.com/embetapbay123/PBL6/issues/35) |

### Trí — 14 task

| Task | Đầu ra / scope | Ưu tiên ban đầu | Handoff cần cho tích hợp |
| --- | --- | --- | --- |
| [ID-01 · #4](https://github.com/embetapbay123/PBL6/issues/4) | CRUD địa chỉ Customer<br>`listAddresses`, `createAddress`, `updateAddress`, `deleteAddress` | P0 | Khung/contract/seed hiện có |
| [AUTH-01 · #37](https://github.com/embetapbay123/PBL6/issues/37) | Đăng ký và xác minh email<br>`register`, `verifyEmail` | P0 | Khung/contract/seed hiện có |
| [AUTH-02 · #38](https://github.com/embetapbay123/PBL6/issues/38) | Reset và đổi mật khẩu, thu hồi phiên<br>`resetPassword`, `confirmResetPassword`, `changePassword` | P0 | Khung/contract/seed hiện có |
| [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39) | Hoàn thiện phiên, context hiện hành và profile<br>`login`, `refresh`, `logout`, `getAuthContext`, `getProfile`, `updateProfile`<br>Internal: `ResolveContext` | P0 | Khung/contract/seed hiện có |
| [STORE-01 · #40](https://github.com/embetapbay123/PBL6/issues/40) | StoreApplication, duyệt Store và Admin UI<br>`submitStoreApplication`, `listOwnStoreApplications`, `listStoreApplications`, `reviewStoreApplication` | P0 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1) |
| [STORE-02 · #41](https://github.com/embetapbay123/PBL6/issues/41) | Thông tin Store và active Store lookup<br>`getOwnStore`, `updateOwnStore`<br>Internal: `ActiveStores` | P1 | [STORE-01 · #40](https://github.com/embetapbay123/PBL6/issues/40) |
| [STAFF-01 · #42](https://github.com/embetapbay123/PBL6/issues/42) | Invitation staff: mời, thu hồi, nhận và danh sách<br>`listStaffInvitations`, `inviteStaff`, `revokeStaffInvitation`, `listOwnInvitations`, `acceptInvitation` | P1 | [STORE-02 · #41](https://github.com/embetapbay123/PBL6/issues/41) |
| [STAFF-02 · #43](https://github.com/embetapbay123/PBL6/issues/43) | Danh sách staff và cập nhật permission hiệu lực<br>`listStoreStaff`, `updateStaff` | P1 | [STORE-02 · #41](https://github.com/embetapbay123/PBL6/issues/41), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39) |
| [RBAC-01 · #44](https://github.com/embetapbay123/PBL6/issues/44) | Quản trị User, Store, role và thu hồi quyền<br>`listUsers`, `updateUserState`, `listStores`, `updateStoreState`, `updateRole` | P0 | [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39) |
| [ID-LOOKUP-01 · #45](https://github.com/embetapbay123/PBL6/issues/45) | Lookup nội bộ địa chỉ/Store và scope AI cho tích hợp | P0 | [FLOW-01 · #6](https://github.com/embetapbay123/PBL6/issues/6), [ID-01 · #4](https://github.com/embetapbay123/PBL6/issues/4), [STORE-02 · #41](https://github.com/embetapbay123/PBL6/issues/41), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39) |
| [ADMIN-01 · #46](https://github.com/embetapbay123/PBL6/issues/46) | Admin Web quản trị User, Store, role | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [RBAC-01 · #44](https://github.com/embetapbay123/PBL6/issues/44) |
| [ADMIN-02 · #47](https://github.com/embetapbay123/PBL6/issues/47) | Admin Web taxonomy và moderation Product/Review | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [TAX-01 · #12](https://github.com/embetapbay123/PBL6/issues/12), [MOD-01 · #17](https://github.com/embetapbay123/PBL6/issues/17) |
| [ADMIN-03 · #48](https://github.com/embetapbay123/PBL6/issues/48) | Admin Web Voucher, Orders, dashboard | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [VOUCHER-02 · #28](https://github.com/embetapbay123/PBL6/issues/28), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29), [REPORT-01 · #30](https://github.com/embetapbay123/PBL6/issues/30) |
| [ADMIN-04 · #49](https://github.com/embetapbay123/PBL6/issues/49) | Admin Web AI metrics và trạng thái vận hành | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [AI-04 · #58](https://github.com/embetapbay123/PBL6/issues/58) |

### Hatsaphone — 11 task

| Task | Đầu ra / scope | Ưu tiên ban đầu | Handoff cần cho tích hợp |
| --- | --- | --- | --- |
| [WEB-01 · #5](https://github.com/embetapbay123/PBL6/issues/5) | Danh sách sản phẩm Customer gọi API | P0 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11) |
| [WEB-02 · #62](https://github.com/embetapbay123/PBL6/issues/62) | Customer chi tiết Product và chọn Variant | P0 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [CAT-04 · #11](https://github.com/embetapbay123/PBL6/issues/11) |
| [WEB-03 · #63](https://github.com/embetapbay123/PBL6/issues/63) | Customer đăng nhập, đăng ký và password forms | P0 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [AUTH-01 · #37](https://github.com/embetapbay123/PBL6/issues/37), [AUTH-02 · #38](https://github.com/embetapbay123/PBL6/issues/38), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39) |
| [WEB-04 · #64](https://github.com/embetapbay123/PBL6/issues/64) | Customer profile và CRUD địa chỉ | P1 | [CORE-01 · #1](https://github.com/embetapbay123/PBL6/issues/1), [AUTH-03 · #39](https://github.com/embetapbay123/PBL6/issues/39), [ID-01 · #4](https://github.com/embetapbay123/PBL6/issues/4) |
| [WEB-05 · #65](https://github.com/embetapbay123/PBL6/issues/65) | Customer Cart: xem/sửa/xóa/thêm item | P1 | [WEB-02 · #62](https://github.com/embetapbay123/PBL6/issues/62), [CART-01 · #3](https://github.com/embetapbay123/PBL6/issues/3), [CART-02 · #8](https://github.com/embetapbay123/PBL6/issues/8) |
| [WEB-06 · #66](https://github.com/embetapbay123/PBL6/issues/66) | Customer checkout và xác nhận quote nhiều Store | P1 | [WEB-04 · #64](https://github.com/embetapbay123/PBL6/issues/64), [WEB-05 · #65](https://github.com/embetapbay123/PBL6/issues/65), [ORDER-01 · #21](https://github.com/embetapbay123/PBL6/issues/21), [ORDER-02 · #22](https://github.com/embetapbay123/PBL6/issues/22), [VOUCHER-03 · #29](https://github.com/embetapbay123/PBL6/issues/29) |
| [WEB-07 · #67](https://github.com/embetapbay123/PBL6/issues/67) | Customer lịch sử và chi tiết Order, hủy đơn | P1 | [ORDER-03 · #23](https://github.com/embetapbay123/PBL6/issues/23), [ORDER-04 · #24](https://github.com/embetapbay123/PBL6/issues/24) |
| [WEB-08 · #68](https://github.com/embetapbay123/PBL6/issues/68) | Customer QR Payment, polling và Refund status | P1 | [PAY-01 · #51](https://github.com/embetapbay123/PBL6/issues/51), [PAY-02 · #52](https://github.com/embetapbay123/PBL6/issues/52), [PAY-03 · #53](https://github.com/embetapbay123/PBL6/issues/53), [WEB-07 · #67](https://github.com/embetapbay123/PBL6/issues/67) |
| [WEB-09 · #69](https://github.com/embetapbay123/PBL6/issues/69) | Customer đọc/viết/sửa Review sau mua | P1 | [REV-01 · #16](https://github.com/embetapbay123/PBL6/issues/16), [WEB-02 · #62](https://github.com/embetapbay123/PBL6/issues/62), [WEB-07 · #67](https://github.com/embetapbay123/PBL6/issues/67) |
| [WEB-10 · #70](https://github.com/embetapbay123/PBL6/issues/70) | Customer recommendation và Chat UI | P1 | [AI-02 · #56](https://github.com/embetapbay123/PBL6/issues/56), [AI-03 · #57](https://github.com/embetapbay123/PBL6/issues/57), [WEB-02 · #62](https://github.com/embetapbay123/PBL6/issues/62) |
| [WEB-11 · #71](https://github.com/embetapbay123/PBL6/issues/71) | Customer consent, đăng ký Store và nhận invitation | P1 | [AI-01 · #55](https://github.com/embetapbay123/PBL6/issues/55), [STORE-01 · #40](https://github.com/embetapbay123/PBL6/issues/40), [STAFF-01 · #42](https://github.com/embetapbay123/PBL6/issues/42) |

## Mốc nghiệm thu, không phải đợt mở task

| Mốc | Kết quả cần demo |
| --- | --- |
| Nền và CRUD | Auth/quyền hiện hành, địa chỉ/Store, Catalog/kho/Cart/Voucher, ba Web/Android nối các API đã bàn giao |
| Mua hàng | Quote nhiều Store → reserve → Order/Payment riêng Store; COD/SePay Test, hủy/refund, voucher và kho không lặp hiệu ứng |
| Hoàn chỉnh chức năng | Staff/RBAC, Review/moderation, reports, consent/recommendation/RAG, các màn Web/Android tích hợp thật |
| Bằng chứng cuối | Thiết bị/APK, security/100-user load, restart/recovery/backup-restore và FR/NFR có PASS/FAIL/NOT_RUN |

## Độ phủ và quy tắc code

Đối chiếu khi giao: **99/99 public operation** có đúng một task BE chịu trách nhiệm, **11/11 internal operation** có task phụ trách. Sample/mock cũng có task hoàn thiện; UI gọi API đó nhưng không đổi owner service. Lookup M3/low-stock/scope AI đã chốt contract trong nền 2.2.1 và triển khai ở ID-LOOKUP-01/INV-01/AI-04. Tracking search/view/cart/purchase có ingress/producer/caller được chốt ở FLOW-01, triển khai ở AI-01/CAT-04/CART-02/ORDER-04; không chỉ dùng event giả. Chat Guest/Customer cần scope phiên đúng; Seller xem metric M4 đúng Store trong SELL-03.

- Hoa sở hữu controller/permission/Order flow của ORDER-05 (`collectCod`); Công sở hữu domain ghi nhận tiền ở PAY-04, cùng transaction M2. Không viết hai logic COD.
- M1/M2/M3/M4 giữ DB riêng; không join/FK/ghi DB service khác. M2 Order/Payment dùng chung EntityManager khi cần nguyên tử; tích hợp nhiều service dùng operation ID/outbox/inbox/recovery.
- Branch theo task, PR nhỏ về main, test/bằng chứng rõ. Member cần1 approval và CI đạt theo [rule Protect main](https://github.com/embetapbay123/PBL6/rules/24367668); embetapbay123 có ngoại lệ bypass.
- Migration append-only; báo owner khi sửa file shared/contract/types/route registration. Reviewer không thay owner phải code task.
- Done cần demo/test đạt, phần tích hợp thật đủ, PR merge và issue completed. Không gắn IMPLEMENTED cho cả endpoint nếu mới hoàn thành một phần.

Tài liệu nền: [ownership](service-ownership.md), [backlog nghiệp vụ](member-backlog.md), [code guide](development-guide.md), [verification](verification-plan.md), [security](security.md), [resilience](error-handling-and-resilience.md), [OpenAPI](../contracts/openapi.json), [internal contract](../contracts/internal-api.json), [FR/NFR acceptance](../requirements-acceptance.md).
