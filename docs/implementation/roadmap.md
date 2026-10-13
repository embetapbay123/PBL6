# Roadmap — full demo 03/11/2026

Cập nhật **13/10/2026**, theo deadline người phụ trách chốt: **thứ Ba 03/11/2026, demo đủ chức năng**, gồm online Payment/Refund, AI sinh câu trả lời và APK Android. **Mốc Week 6/8/9 cũ đã bị thay thế**, không còn là thời hạn hoàn thành chức năng. [Phạm vi và gate demo](demo-2026-11-03.md) quy định điều kiện bàn giao. Mục tiêu là full scope, không tự giảm yêu cầu vì thiếu thời gian.

## Ba tuần còn lại

| Tuần | Khoảng lịch | Kết quả phải đạt |
| --- | --- | --- |
| [Week 1](week1.md)/[Week 2](week2.md) | Lịch sử | Nền và handoff đã có; phần tồn đưa vào Week 3, không làm lại Done. |
| [Week 3](week3.md) | 13–19/10 | Confirm/quota/Cancel, Auth/RBAC/Store và điểm nối online/Refund; provider/model/email/Android sẵn trước 15/10; COD thật và APK đầu tiên. |
| [Week 4](week4.md) | 20–26/10 | Đủ toàn bộ chức năng BE, Seller/Admin/Customer Web và Android; staff/Review/moderation/report, recommendation/chat/metrics/evaluation, APK candidate. Bắt đầu security/load/recovery. |
| [Week 5](week5.md) | 27/10–02/11 | Freeze từ 27/10, full FR/NFR/integration/device, sửa lỗi/kiểm lại và hai lần diễn tập; release trước demo. |
| Demo | 03/11 | Chạy đủ chức năng từ commit/APK đã xác minh, provider thật trong môi trường test và evidence rõ. |

Mỗi cửa sổ tuần bố trí 5 phiên làm việc; không mặc định làm cuối tuần. Kế hoạch đang rất gấp: Confirm/Cancel còn 501, M3 PR #103 còn CHANGES_REQUESTED, nhiều UI còn placeholder và provider/model chưa cấu hình. Đây là mục tiêu phải kiểm bằng gate, không bảo đảm chỉ từ số task hay tốc độ sinh code.

## Dependency và cách xử lý trễ

- **15/10:** Công provider payment/refund/model + callback routing; Trí email test; Hoa SDK/device/APK. Thiếu prerequisite thì báo blocker với owner/ngày khắc phục ngay, không fake success.
- **19/10:** M1/Payment handoff → Hoa atomic group/Cancel → Web/Android; Auth/Store/Admin lists → forms/report. Giữ quyền sở hữu service/DB và transaction chung Order–Payment.
- **22/10:** staff/Review/moderation/AI endpoints đủ cho mọi UI; **26/10:** không còn chức năng bắt buộc chỉ là placeholder/501, PR review/merge và APK cài được.
- **30/10:** evidence FR/NFR và diễn tập lần 1; **02/11:** clean setup/restore/release/APK và diễn tập cuối. Tuần cuối chỉ sửa lỗi và hoàn thiện phần đã cam kết; không mở feature mới.
- Trễ gate thì ghi rõ scope chưa đạt, impact và owner; thông báo ngay người phụ trách. Không đổi deadline, giảm acceptance, dời chức năng sau demo hoặc tự đóng task nếu chưa được chấp thuận.

## Mốc mục tiêu toàn bộ 71 issue

Bảng dưới là mục tiêu full scope, không phải trạng thái thực tế. [Kanban](https://github.com/users/embetapbay123/projects/1/views/3) và evidence/review trong issue quyết định Review/Done. Task có thể bắt đầu sớm hơn mốc để bàn giao dependency. Core/lookup đã Done vẫn retest trong luồng liên quan, không mở lại issue.

| Owner | Task | Scope | Mốc mục tiêu |
| --- | --- | --- | --- |
| Công | [CORE-01 #1](https://github.com/embetapbay123/PBL6/issues/1) | Tách route/page/component Web dùng chung | Đã Done — retest theo luồng demo |
| Công | [FLOW-01 #6](https://github.com/embetapbay123/PBL6/issues/6) | Chốt contract tích hợp và interface Order/Payment | Week 3: 19/10; retest Week 5 |
| Công | [CORE-02 #50](https://github.com/embetapbay123/PBL6/issues/50) | API adapter/fixture mẫu, codegen và chuẩn bàn giao | Đã Done — retest theo luồng demo |
| Công | [PAY-01 #51](https://github.com/embetapbay123/PBL6/issues/51) | PaymentAttempt, Payment read và provider adapter | Đã Done — retest theo luồng demo |
| Công | [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52) | Webhook SePay Test và callback tương thích | Week 3: 19/10; retest Week 5 |
| Công | [PAY-03 #53](https://github.com/embetapbay123/PBL6/issues/53) | Refund, reconciliation và Payment recovery | Week 3: 19/10; retest Week 5 |
| Công | [PAY-04 #54](https://github.com/embetapbay123/PBL6/issues/54) | Domain COD collection cùng transaction Order | Đã Done — retest theo luồng demo |
| Công | [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55) | Consent, tracking và consumer sự kiện có dedup | Week 3: 19/10; retest Week 5 |
| Công | [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56) | Recommendation ALS, related, fallback và index | Week 4: 26/10; retest Week 5 |
| Công | [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57) | Chat session/history và RAG theo dữ liệu Catalog | Week 4: 26/10; retest Week 5 |
| Công | [AI-04 #58](https://github.com/embetapbay123/PBL6/issues/58) | AI metrics, evaluation dataset và báo cáo chất lượng | Week 4: 26/10; retest Week 5 |
| Công | [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59) | Kiểm bảo mật, permission và chịu tải mục tiêu | Week 5: trước 02/11; kiểm sớm Week 4 |
| Công | [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60) | Tích hợp checkout/payment/kho và phục hồi lỗi | Week 5: trước 02/11; kiểm sớm Week 4 |
| Công | [DEMO-01 #61](https://github.com/embetapbay123/PBL6/issues/61) | Nghiệm thu FR/NFR, tài liệu và demo toàn hệ thống | Week 5: trước 02/11; kiểm sớm Week 4 |
| Thịnh | [CAT-01 #2](https://github.com/embetapbay123/PBL6/issues/2) | API và danh sách sản phẩm Store trên Seller Web | Week 4: 26/10; retest Week 5 |
| Thịnh | [CAT-QUOTE-01 #7](https://github.com/embetapbay123/PBL6/issues/7) | M1 QuoteVariants: giá và snapshot cho M2 | Đã Done — retest theo luồng demo |
| Thịnh | [CAT-02 #9](https://github.com/embetapbay123/PBL6/issues/9) | Tạo/sửa Product đầy đủ và form Seller | Week 4: 26/10; retest Week 5 |
| Thịnh | [CAT-03 #10](https://github.com/embetapbay123/PBL6/issues/10) | Variant, SKU, ảnh Product và form Seller | Week 4: 26/10; retest Week 5 |
| Thịnh | [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11) | Hoàn thiện public Catalog, taxonomy lookup và detail | Đã Done — retest theo luồng demo |
| Thịnh | [TAX-01 #12](https://github.com/embetapbay123/PBL6/issues/12) | CRUD taxonomy và attribute definition của Admin | Week 4: 26/10; retest Week 5 |
| Thịnh | [INV-01 #13](https://github.com/embetapbay123/PBL6/issues/13) | Tồn kho, adjustment, movement và Seller UI | Week 4: 26/10; retest Week 5 |
| Thịnh | [INV-02 #14](https://github.com/embetapbay123/PBL6/issues/14) | Reserve, consume, release tồn kho chống lặp | Đã Done — retest theo luồng demo |
| Thịnh | [INV-03 #15](https://github.com/embetapbay123/PBL6/issues/15) | Restock Order và phục hồi reservation hết hạn | Week 4: 26/10; retest Week 5 |
| Thịnh | [REV-01 #16](https://github.com/embetapbay123/PBL6/issues/16) | Review sau mua và danh sách đánh giá Product | Week 4: 26/10; retest Week 5 |
| Thịnh | [MOD-01 #17](https://github.com/embetapbay123/PBL6/issues/17) | Ẩn/khôi phục Product và Review | Week 4: 26/10; retest Week 5 |
| Thịnh | [SELL-01 #18](https://github.com/embetapbay123/PBL6/issues/18) | Seller quản lý Store và staff/invitation | Week 4: 26/10; retest Week 5 |
| Thịnh | [SELL-02 #19](https://github.com/embetapbay123/PBL6/issues/19) | Seller list/detail/xử lý Order và thu COD | Week 4: 26/10; retest Week 5 |
| Thịnh | [SELL-03 #20](https://github.com/embetapbay123/PBL6/issues/20) | Seller Voucher và báo cáo Store | Week 4: 26/10; retest Week 5 |
| Hoa | [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3) | Đọc, sửa số lượng và xóa item giỏ hàng | Đã Done — retest theo luồng demo |
| Hoa | [CART-02 #8](https://github.com/embetapbay123/PBL6/issues/8) | Thêm item giỏ hàng và tích hợp M1 | Đã Done — retest theo luồng demo |
| Hoa | [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) | Quote checkout nhiều Store và snapshot | Week 3: 19/10; retest Week 5 |
| Hoa | [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) | Confirm checkout tạo purchase group và Order nguyên tử | Week 3: 19/10; retest Week 5 |
| Hoa | [ORDER-03 #23](https://github.com/embetapbay123/PBL6/issues/23) | API đọc Order của Customer và Seller | Week 3: 19/10; retest Week 5 |
| Hoa | [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24) | Chuyển trạng thái và hủy Order hai phía | Week 3: 19/10; retest Week 5 |
| Hoa | [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25) | Endpoint Seller ghi nhận COD phối hợp Payment | Week 3: 19/10; retest Week 5 |
| Hoa | [REVIEW-ELIG-01 #26](https://github.com/embetapbay123/PBL6/issues/26) | M2 xác minh OrderItem đủ điều kiện Review | Đã Done — retest theo luồng demo |
| Hoa | [VOUCHER-01 #27](https://github.com/embetapbay123/PBL6/issues/27) | CRUD Voucher của Store | Week 3: 19/10; retest Week 5 |
| Hoa | [VOUCHER-02 #28](https://github.com/embetapbay123/PBL6/issues/28) | CRUD Voucher toàn sàn của Admin | Đã Done — retest theo luồng demo |
| Hoa | [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) | Validate, quota, redemption và usage Voucher | Week 3: 19/10; retest Week 5 |
| Hoa | [REPORT-01 #30](https://github.com/embetapbay123/PBL6/issues/30) | API Order quản trị, dashboard và report Store | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-01 #31](https://github.com/embetapbay123/PBL6/issues/31) | Android Auth, profile, địa chỉ và phiên | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-02 #32](https://github.com/embetapbay123/PBL6/issues/32) | Android Catalog/search/detail và recommendation | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-03 #33](https://github.com/embetapbay123/PBL6/issues/33) | Android Cart, Voucher và checkout | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-04 #34](https://github.com/embetapbay123/PBL6/issues/34) | Android Order, Payment/Refund và Review | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-05 #35](https://github.com/embetapbay123/PBL6/issues/35) | Android Chat, consent và luồng tài khoản Store | Week 4: 26/10; retest Week 5 |
| Hoa | [MOB-06 #36](https://github.com/embetapbay123/PBL6/issues/36) | Build APK và nghiệm thu Android thiết bị | Week 5: trước 02/11; kiểm sớm Week 4 |
| Trí | [ID-01 #4](https://github.com/embetapbay123/PBL6/issues/4) | CRUD địa chỉ Customer | Đã Done — retest theo luồng demo |
| Trí | [AUTH-01 #37](https://github.com/embetapbay123/PBL6/issues/37) | Đăng ký và xác minh email | Week 3: 19/10; retest Week 5 |
| Trí | [AUTH-02 #38](https://github.com/embetapbay123/PBL6/issues/38) | Reset và đổi mật khẩu, thu hồi phiên | Week 3: 19/10; retest Week 5 |
| Trí | [AUTH-03 #39](https://github.com/embetapbay123/PBL6/issues/39) | Hoàn thiện phiên, context hiện hành và profile | Week 3: 19/10; retest Week 5 |
| Trí | [STORE-01 #40](https://github.com/embetapbay123/PBL6/issues/40) | StoreApplication, duyệt Store và Admin UI | Week 3: 19/10; retest Week 5 |
| Trí | [STORE-02 #41](https://github.com/embetapbay123/PBL6/issues/41) | Thông tin Store và active Store lookup | Week 3: 19/10; retest Week 5 |
| Trí | [STAFF-01 #42](https://github.com/embetapbay123/PBL6/issues/42) | Invitation staff: mời, thu hồi, nhận và danh sách | Week 4: 26/10; retest Week 5 |
| Trí | [STAFF-02 #43](https://github.com/embetapbay123/PBL6/issues/43) | Danh sách staff và cập nhật permission hiệu lực | Week 4: 26/10; retest Week 5 |
| Trí | [RBAC-01 #44](https://github.com/embetapbay123/PBL6/issues/44) | Quản trị User, Store, role và thu hồi quyền | Week 3: 19/10; retest Week 5 |
| Trí | [ID-LOOKUP-01 #45](https://github.com/embetapbay123/PBL6/issues/45) | Lookup nội bộ địa chỉ/Store và scope AI cho tích hợp | Đã Done — retest theo luồng demo |
| Trí | [ADMIN-01 #46](https://github.com/embetapbay123/PBL6/issues/46) | Admin Web quản trị User, Store, role | Week 4: 26/10; retest Week 5 |
| Trí | [ADMIN-02 #47](https://github.com/embetapbay123/PBL6/issues/47) | Admin Web taxonomy và moderation Product/Review | Week 4: 26/10; retest Week 5 |
| Trí | [ADMIN-03 #48](https://github.com/embetapbay123/PBL6/issues/48) | Admin Web Voucher, Orders, dashboard | Week 4: 26/10; retest Week 5 |
| Trí | [ADMIN-04 #49](https://github.com/embetapbay123/PBL6/issues/49) | Admin Web AI metrics và trạng thái vận hành | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-01 #5](https://github.com/embetapbay123/PBL6/issues/5) | Danh sách sản phẩm Customer gọi API | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-02 #62](https://github.com/embetapbay123/PBL6/issues/62) | Customer chi tiết Product và chọn Variant | Đã Done — retest theo luồng demo |
| Hatsaphone | [WEB-03 #63](https://github.com/embetapbay123/PBL6/issues/63) | Customer đăng nhập, đăng ký và password forms | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-04 #64](https://github.com/embetapbay123/PBL6/issues/64) | Customer profile và CRUD địa chỉ | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-05 #65](https://github.com/embetapbay123/PBL6/issues/65) | Customer Cart: xem/sửa/xóa/thêm item | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-06 #66](https://github.com/embetapbay123/PBL6/issues/66) | Customer checkout và xác nhận quote nhiều Store | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-07 #67](https://github.com/embetapbay123/PBL6/issues/67) | Customer lịch sử và chi tiết Order, hủy đơn | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-08 #68](https://github.com/embetapbay123/PBL6/issues/68) | Customer QR Payment, polling và Refund status | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-09 #69](https://github.com/embetapbay123/PBL6/issues/69) | Customer đọc/viết/sửa Review sau mua | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-10 #70](https://github.com/embetapbay123/PBL6/issues/70) | Customer recommendation và Chat UI | Week 4: 26/10; retest Week 5 |
| Hatsaphone | [WEB-11 #71](https://github.com/embetapbay123/PBL6/issues/71) | Customer consent, đăng ký Store và nhận invitation | Week 4: 26/10; retest Week 5 |

## Nghiệm thu và nhịp làm

Đối chiếu đủ [98 FR/28 NFR](../requirements-acceptance.md), [verification](verification-plan.md), [AI evaluation](../ai-evaluation.md), [capacity](performance-and-capacity.md) và [recovery](observability-and-recovery.md). Kiểm tiền/quota/kho/quyền/retry/crash, dataset/model/index/run thật; 100 người dùng đồng thời và ≥95% request dưới 2 giây theo NFR, RAG mục tiêu dưới 4 giây theo điều kiện đã chốt. Không nhận synthetic-only quality, callback ACK hoặc Refund pending là kết quả cuối.

Mỗi người PR nhỏ, cập nhật evidence/ngày; reviewer phản hồi trong một ngày làm việc. Không commit secret hoặc mẫu tin nhắn nhóm. Dùng Refs khi mới giao một phần; issue chỉ completed/Done khi đủ tiêu chí và merge. Không kéo toàn bộ 57 issue mở vào In progress/Todo chỉ vì deadline gần.

[Week 6](week6.md)/[Week 7](week7.md)/[Week 8](week8.md) là kế hoạch lưu tham khảo **sau demo** cho cải tiến/bảo trì theo quyết định mới. Những phần từng đặt ở tuần 6–8 nhưng thuộc scope đã cam kết đã được kéo vào Week 3–5; không dùng tài liệu cũ để trì hoãn nghiệm thu full demo.
