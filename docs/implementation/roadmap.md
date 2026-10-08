# Roadmap hoàn thiện PBL6 — Week 1 đến Week 8

Cập nhật **06/10/2026**, baseline main `98915a6` sau PR #86/#88/#89/#87. **Mục tiêu: cuối Week 6 đủ chức năng; cuối Week 8 hoàn tất nghiệm thu/bàn giao; Week 9 dự phòng.** Đây là ước lượng triển khai, chưa là deadline nộp đề tài. Một tuần gồm 5 ngày làm việc; từ đầu Week 2 còn khoảng 7 tuần đến hết Week 8, 8 tuần nếu dùng dự phòng. Chưa có lịch bắt đầu chung nên không gán ngày kết thúc lịch giả định.

## Cơ sở và điều kiện dự kiến

- Nền đã có 99 public/11 internal DTO + fixture, 7 event, 4 service/4 DB, mẫu và CI. Baseline có 7 scope Done; 24 public IMPLEMENTED không đồng nghĩa 24 issue hoặc toàn luồng đã xong. Task rộng và sample/mock/501 vẫn cần acceptance thật.
- Ước lượng giả định mỗi người dành khoảng **20–25 giờ tập trung/tuần**, 5 người tổng 100–125 giờ; đây là giả định lập kế hoạch, chưa phải năng lực nhóm đã xác nhận. Cần reviewer phản hồi trong một ngày làm việc và handoff nhỏ giữa tuần. Hai tuần đầu đo thời gian thực để điều chỉnh.
- AI hỗ trợ sinh code/test/tài liệu, nhưng không bỏ thời gian review, test cạnh tranh/recovery, thiết bị hoặc đánh giá AI. Không ước lượng chỉ từ 71 thẻ hay tốc độ sinh code.
- Giữ owner hiện có. Công giữ Payment/Refund/M4/điều phối; Hoa giữ M2 và Android; Thịnh M1/Seller; Trí M3/Admin; Hatsaphone Customer Web. Hai người đầu có tải nặng, nên ưu tiên handoff và trì hoãn phần thứ cấp theo mốc, không lấy thêm nghiệp vụ của member khác.
- Provider test/SMTP, dataset AI và môi trường Android/tải phải sẵn sàng trước tuần sử dụng. Mốc chỉ đạt khi API và UI thật tích hợp; fixture dùng phần phát triển độc lập, không là bằng chứng hoàn thành.

## Mốc toàn nhóm

| Tuần | Đầu ra | Cổng kiểm chứng |
| --- | --- | --- |
| [Week 1](week1.md) | Nền + QuoteVariants/Cart/Address/lookup và mẫu client | Đã có baseline merge/test; task rộng còn mở được chuyển tiếp, không làm lại |
| [Week 2](week2.md) | Kho reserve/consume/release + Payment/COD + checkout nhiều Store; Auth/UI tiếp song song | Ngày 2 dependency; ngày 5 COD từ Cart đến COMPLETED, crash/replay không lặp |
| [Week 3](week3.md) | Online sandbox/callback, hủy/Refund, Product/Variant và Web/Android mua hàng | Test callback/recovery/cancel, hàng mới do Seller tạo, không ảnh hưởng Order khác |
| [Week 4](week4.md) | Staff/invitation, Review, report commerce, recommendation và các màn tương ứng | Quyền hiện hành, eligibility, consent/model/fallback, report đúng nguồn |
| [Week 5](week5.md) | RAG/chat, moderation và UI nghiệp vụ còn lại | History scope, Product card live, Admin/Seller/Android/Customer nối API |
| [Week 6](week6.md) | AI evaluation/metrics, report đầy đủ, APK RC và feature complete | 71 scope được đối chiếu; không còn nghiệp vụ đích chỉ là stub; RC chạy toàn hệ thống |
| [Week 7](week7.md) | Security/load/recovery/restore/device, fix và retest | NFR có run/evidence, sửa lỗi tiền/dữ liệu/quyền và hiệu năng |
| [Week 8](week8.md) | Nghiệm thu FR/NFR, release, APK, báo cáo và demo sạch | Đủ evidence, CI xanh, setup tái lập, không lỗi chặn release |
| Week 9 dự phòng | Chỉ hoàn tất scope hoặc lỗi chưa đạt từ tuần 6–8 | Không mở tính năng mới; cập nhật mốc nếu còn FAIL/NOT_RUN |

Week 2 là kế hoạch hiện tại. Week 3–8 là mục tiêu dự kiến được rà cuối mỗi tuần, không tự đổi Status trên Kanban. Feature complete không đồng nghĩa đã đạt tải/bảo mật hoặc production-ready.

## Dependency cần bàn giao sớm

1. **Week 2 ngày 2:** Thịnh #14 + Công #51/#54 → Hoa #22/#25 → Web #66/Android #33. Đây là đường quyết định mốc mua hàng; không chờ toàn Inventory/Payment mới bàn giao.
2. **Week 3 ngày 2–3:** Công #52/#53 + Thịnh #15 → Hoa #24 → Web #67/#68 và Android #34. Test compensation/restart theo từng Order, giữ BR-40.
3. **Week 4 ngày 2:** Trí #42/#43 và Thịnh #16 → Seller #18, Web #69/#71, Android #34/#35. Công #56 ngày 4 → Android #32 và Web #70 tuần 5.
4. **Week 5 ngày 2:** Công #57 → Web #70 và Android #35. **Week 6 ngày 2:** Công #58 → Hoa #30, Thịnh #20, Trí #49/#48.
5. **Week 6 ngày 5:** RC/APK → kiểm toàn hệ thống tuần 7; không để APK và security lần đầu đến tuần 8.

## Tuần dự kiến hoàn tất từng issue

Bảng bao phủ **71/71 issue**, gồm scope Done và review nền. Đây là tuần mục tiêu hoàn tất *toàn scope*; một issue có thể bắt đầu/bàn giao sớm hơn. Bảng tuần chi tiết ghi các lát cắt tiếp tục hoặc kiểm lại, không mở lại Done. Scope hiện hành, API/file và acceptance ở [bảng phân công](task-assignment.md) và issue. Status thực tế duy nhất ở [Kanban](https://github.com/users/embetapbay123/projects/1/views/3).

| Owner | Task | Scope | Mốc mục tiêu |
| --- | --- | --- | --- |
| Công | [CORE-01 #1](https://github.com/embetapbay123/PBL6/issues/1) | Tách route/page/component Web dùng chung | Week 2 — review nền |
| Công | [FLOW-01 #6](https://github.com/embetapbay123/PBL6/issues/6) | Chốt contract tích hợp và interface Order/Payment | Week 2 — review nền |
| Công | [CORE-02 #50](https://github.com/embetapbay123/PBL6/issues/50) | API adapter/fixture mẫu, codegen và chuẩn bàn giao | Week 2 — review nền |
| Công | [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51) | PaymentAttempt, Payment read và provider adapter | Week 2 |
| Công | [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52) | Webhook SePay Test và callback tương thích | Week 3 |
| Công | [PAY-03 #53](https://github.com/embetapbay123/PBL6/issues/53) | Refund, reconciliation và Payment recovery | Week 3 |
| Công | [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54) | Domain COD collection cùng transaction Order | Week 2 |
| Công | [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55) | Consent, tracking và consumer sự kiện có dedup | Week 2 |
| Công | [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56) | Recommendation ALS, related, fallback và index | Week 4 |
| Công | [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57) | Chat session/history và RAG theo dữ liệu Catalog | Week 5 |
| Công | [AI-04 #58](https://github.com/embetapbay123/PBL6/issues/58) | AI metrics, evaluation dataset và báo cáo chất lượng | Week 6 |
| Công | [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59) | Kiểm bảo mật, permission và chịu tải mục tiêu | Week 7 |
| Công | [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60) | Tích hợp checkout/payment/kho và phục hồi lỗi | Week 7 |
| Công | [DEMO-01 #61](https://github.com/embetapbay123/PBL6/issues/61) | Nghiệm thu FR/NFR, tài liệu và demo toàn hệ thống | Week 8 |
| Thịnh | [CAT-01 #2](https://github.com/embetapbay123/PBL6/issues/2) | API và danh sách sản phẩm Store trên Seller Web | Week 3 |
| Thịnh | [CAT-QUOTE-01 #7](https://github.com/embetapbay123/PBL6/issues/7) | M1 QuoteVariants: giá và snapshot cho M2 | Baseline đã Done |
| Thịnh | [CAT-02 #9](https://github.com/embetapbay123/PBL6/issues/9) | Tạo/sửa Product đầy đủ và form Seller | Week 3 |
| Thịnh | [CAT-03 #10](https://github.com/embetapbay123/PBL6/issues/10) | Variant, SKU, ảnh Product và form Seller | Week 3 |
| Thịnh | [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11) | Hoàn thiện public Catalog, taxonomy lookup và detail | Week 2 |
| Thịnh | [TAX-01 #12](https://github.com/embetapbay123/PBL6/issues/12) | CRUD taxonomy và attribute definition của Admin | Week 4 |
| Thịnh | [INV-01 #13](https://github.com/embetapbay123/PBL6/issues/13) | Tồn kho, adjustment, movement và Seller UI | Week 2 |
| Thịnh | [INV-02 #14](https://github.com/embetapbay123/PBL6/issues/14) | Reserve, consume, release tồn kho chống lặp | Week 2 |
| Thịnh | [INV-03 #15](https://github.com/embetapbay123/PBL6/issues/15) | Restock Order và phục hồi reservation hết hạn | Week 3 |
| Thịnh | [REV-01 #16](https://github.com/embetapbay123/PBL6/issues/16) | Review sau mua và danh sách đánh giá Product | Week 4 |
| Thịnh | [MOD-01 #17](https://github.com/embetapbay123/PBL6/issues/17) | Ẩn/khôi phục Product và Review | Week 5 |
| Thịnh | [SELL-01 #18](https://github.com/embetapbay123/PBL6/issues/18) | Seller quản lý Store và staff/invitation | Week 4 |
| Thịnh | [SELL-02 #19](https://github.com/embetapbay123/PBL6/issues/19) | Seller list/detail/xử lý Order và thu COD | Week 4 |
| Thịnh | [SELL-03 #20](https://github.com/embetapbay123/PBL6/issues/20) | Seller Voucher và báo cáo Store | Week 6 |
| Hoa | [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3) | Đọc, sửa số lượng và xóa item giỏ hàng | Baseline đã Done |
| Hoa | [CART-02 #8](https://github.com/embetapbay123/PBL6/issues/8) | Thêm item giỏ hàng và tích hợp M1 | Baseline đã Done |
| Hoa | [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) | Quote checkout nhiều Store và snapshot | Week 2 |
| Hoa | [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) | Confirm checkout tạo purchase group và Order nguyên tử | Week 2 |
| Hoa | [ORDER-03 #23](https://github.com/embetapbay123/PBL6/issues/23) | API đọc Order của Customer và Seller | Week 3 |
| Hoa | [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24) | Chuyển trạng thái và hủy Order hai phía | Week 3 |
| Hoa | [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25) | Endpoint Seller ghi nhận COD phối hợp Payment | Week 2 |
| Hoa | [REVIEW-ELIG-01 #26](https://github.com/embetapbay123/PBL6/issues/26) | M2 xác minh OrderItem đủ điều kiện Review | Baseline đã Done |
| Hoa | [VOUCHER-01 #27](https://github.com/embetapbay123/PBL6/issues/27) | CRUD Voucher của Store | Week 3 |
| Hoa | [VOUCHER-02 #28](https://github.com/embetapbay123/PBL6/issues/28) | CRUD Voucher toàn sàn của Admin | Baseline đã Done |
| Hoa | [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) | Validate, quota, redemption và usage Voucher | Week 2 |
| Hoa | [REPORT-01 #30](https://github.com/embetapbay123/PBL6/issues/30) | API Order quản trị, dashboard và report Store | Week 6 |
| Hoa | [MOB-01 #31](https://github.com/embetapbay123/PBL6/issues/31) | Android Auth, profile, địa chỉ và phiên | Week 3 |
| Hoa | [MOB-02 #32](https://github.com/embetapbay123/PBL6/issues/32) | Android Catalog/search/detail và recommendation | Week 4 |
| Hoa | [MOB-03 #33](https://github.com/embetapbay123/PBL6/issues/33) | Android Cart, Voucher và checkout | Week 3 |
| Hoa | [MOB-04 #34](https://github.com/embetapbay123/PBL6/issues/34) | Android Order, Payment/Refund và Review | Week 4 |
| Hoa | [MOB-05 #35](https://github.com/embetapbay123/PBL6/issues/35) | Android Chat, consent và luồng tài khoản Store | Week 5 |
| Hoa | [MOB-06 #36](https://github.com/embetapbay123/PBL6/issues/36) | Build APK và nghiệm thu Android thiết bị | Week 6 |
| Trí | [ID-01 #4](https://github.com/embetapbay123/PBL6/issues/4) | CRUD địa chỉ Customer | Baseline đã Done |
| Trí | [AUTH-01 #37](https://github.com/embetapbay123/PBL6/issues/37) | Đăng ký và xác minh email | Week 2 |
| Trí | [AUTH-02 #38](https://github.com/embetapbay123/PBL6/issues/38) | Reset và đổi mật khẩu, thu hồi phiên | Week 2 |
| Trí | [AUTH-03 #39](https://github.com/embetapbay123/PBL6/issues/39) | Hoàn thiện phiên, context hiện hành và profile | Week 2 |
| Trí | [STORE-01 #40](https://github.com/embetapbay123/PBL6/issues/40) | StoreApplication, duyệt Store và Admin UI | Week 3 |
| Trí | [STORE-02 #41](https://github.com/embetapbay123/PBL6/issues/41) | Thông tin Store và active Store lookup | Week 2 |
| Trí | [STAFF-01 #42](https://github.com/embetapbay123/PBL6/issues/42) | Invitation staff: mời, thu hồi, nhận và danh sách | Week 4 |
| Trí | [STAFF-02 #43](https://github.com/embetapbay123/PBL6/issues/43) | Danh sách staff và cập nhật permission hiệu lực | Week 4 |
| Trí | [RBAC-01 #44](https://github.com/embetapbay123/PBL6/issues/44) | Quản trị User, Store, role và thu hồi quyền | Week 2 |
| Trí | [ID-LOOKUP-01 #45](https://github.com/embetapbay123/PBL6/issues/45) | Lookup nội bộ địa chỉ/Store và scope AI cho tích hợp | Baseline đã Done |
| Trí | [ADMIN-01 #46](https://github.com/embetapbay123/PBL6/issues/46) | Admin Web quản trị User, Store, role | Week 3 |
| Trí | [ADMIN-02 #47](https://github.com/embetapbay123/PBL6/issues/47) | Admin Web taxonomy và moderation Product/Review | Week 5 |
| Trí | [ADMIN-03 #48](https://github.com/embetapbay123/PBL6/issues/48) | Admin Web Voucher, Orders, dashboard | Week 6 |
| Trí | [ADMIN-04 #49](https://github.com/embetapbay123/PBL6/issues/49) | Admin Web AI metrics và trạng thái vận hành | Week 6 |
| Hatsaphone | [WEB-01 #5](https://github.com/embetapbay123/PBL6/issues/5) | Danh sách sản phẩm Customer gọi API | Week 2 |
| Hatsaphone | [WEB-02 #62](https://github.com/embetapbay123/PBL6/issues/62) | Customer chi tiết Product và chọn Variant | Week 2 |
| Hatsaphone | [WEB-03 #63](https://github.com/embetapbay123/PBL6/issues/63) | Customer đăng nhập, đăng ký và password forms | Week 3 |
| Hatsaphone | [WEB-04 #64](https://github.com/embetapbay123/PBL6/issues/64) | Customer profile và CRUD địa chỉ | Week 2 |
| Hatsaphone | [WEB-05 #65](https://github.com/embetapbay123/PBL6/issues/65) | Customer Cart: xem/sửa/xóa/thêm item | Week 2 |
| Hatsaphone | [WEB-06 #66](https://github.com/embetapbay123/PBL6/issues/66) | Customer checkout và xác nhận quote nhiều Store | Week 3 |
| Hatsaphone | [WEB-07 #67](https://github.com/embetapbay123/PBL6/issues/67) | Customer lịch sử và chi tiết Order, hủy đơn | Week 3 |
| Hatsaphone | [WEB-08 #68](https://github.com/embetapbay123/PBL6/issues/68) | Customer QR Payment, polling và Refund status | Week 4 |
| Hatsaphone | [WEB-09 #69](https://github.com/embetapbay123/PBL6/issues/69) | Customer đọc/viết/sửa Review sau mua | Week 4 |
| Hatsaphone | [WEB-10 #70](https://github.com/embetapbay123/PBL6/issues/70) | Customer recommendation và Chat UI | Week 5 |
| Hatsaphone | [WEB-11 #71](https://github.com/embetapbay123/PBL6/issues/71) | Customer consent, đăng ký Store và nhận invitation | Week 4 |

## Nhịp làm việc và xử lý trễ

Ngày 1 chọn một task chính; ngày 2 bàn giao lát cắt; ngày 3 tích hợp/PR; ngày 4 test lỗi và fix; ngày 5 demo/evidence/cập nhật board. Reviewer, handoff, docs và test nằm trong tuần của task. Viết README/báo cáo phần mình từ lúc bàn giao, không dồn toàn bộ sang tuần 8. Commit/PR tiếng Anh; không lưu mẫu tin nhắn nhóm vào repo.

Nếu deadline dependency ngày 2 trễ một ngày làm việc, owner ghi operation còn thiếu, lỗi, người nhận và mốc mới trong issue; consumer tiếp phần độc lập. Cuối tuần chuyển **phần chưa đạt cùng dependency** sang tuần sau, không tự giảm acceptance, đổi owner hoặc đóng task vì hết tuần. Một tuần dự phòng chỉ hấp thụ trễ nhỏ; trễ hơn phải báo mốc mới.

Sau Week 2 rà số scope nghiệm thu/giờ thực tế, tuổi PR, dependency trễ và phần chưa có bằng chứng. Nếu COD chưa chạy hoặc chỉ đạt dưới khoảng 70% đầu ra tuần, **ước lượng lại Week 6/8 ngay**, không giữ lịch đẹp trên docs. Nếu từng người dành dưới 20 giờ/tuần, cần kéo dài hoặc người phụ trách đề tài chấp thuận giảm phạm vi; không mặc định full scope vẫn xong Week 8.

Không nhận feature mới sau Week 6 trừ phần đã chốt nhưng còn thiếu. Tuần 7–8 dành cho kiểm chứng/fix/bàn giao; lỗi về thu/hoàn tiền, mất dữ liệu, oversell hoặc quyền là lỗi chặn release. Mỗi FR/NFR phải có PASS/evidence, hoặc thay đổi phạm vi được phê duyệt; FAIL/NOT_RUN không được trình bày thành hoàn thành.

## Checklist bàn giao cuối

- Giữ 4 service/DB, contract, migration append-only, 99 public + 11 internal + 7 event đúng phạm vi; DTO hoặc stub không tự tính IMPLEMENTED.
- Ba Web + APK Android demo API thật; Shipment/provider môi trường test có nhãn. Setup/migrate/seed từ checkout sạch và nâng cấp dữ liệu hiện có chạy được.
- AI có dataset/split/model/index/run, baseline và metric; security/quyền, ít nhất 100 user đồng thời và ≥95% request dưới 2 giây theo NFR; RAG mục tiêu dưới 4 giây theo điều kiện MVP, backup/restore/restart có evidence.
- Test/CI/review/merge và acceptance đầy đủ trước issue completed/Done. Đối chiếu [verification](verification-plan.md), [FR/NFR](../requirements-acceptance.md), [AI evaluation](../ai-evaluation.md), [capacity](performance-and-capacity.md), [recovery](observability-and-recovery.md).
