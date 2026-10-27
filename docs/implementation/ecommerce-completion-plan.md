# Kế hoạch hoàn thiện nghiệp vụ TMĐT

Cập nhật 27/10/2026. Nguồn: [audit 20 nhóm chức năng](ecommerce-gap-audit-2026-10-27.md), main/deployment `5029298`, [cam kết demo 03/11](demo-2026-11-03.md). Đây là kế hoạch triển khai và nghiệm thu; các ngày dưới đây không chứng minh task đã Done. Chưa thay đổi trạng thái Kanban hoặc triển khai thêm tính năng khi lập kế hoạch này.

## 1. Đầu ra và thời gian

| Mốc | Đầu ra cần đạt | Điều kiện |
| --- | --- | --- |
| **03/11 — demo** | Phạm vi đã cam kết chạy qua Web Customer/Store/Admin và APK: tài khoản, sản phẩm, kho, checkout nhiều Store, COD/online, hủy/Refund, Review, AI; hai luồng trả toàn đơn của extension được trình bày đúng khả năng. | Không có 501/fixture trong kịch bản bắt buộc; online Refund, email và thiết bị có bằng chứng thật trong môi trường test. |
| **04–10/11 — hoàn thiện lõi** | Luồng Product/Cart/Order/Shipment dễ dùng; chính sách sau mua, nhập kho, thống kê và công cụ ngoại lệ có thiết kế/triển khai đủ lát cắt; bắt đầu returns từng dòng. | Chốt DTO/state machine trước khi mở rộng; không làm lại transaction/recovery đã có. |
| **11–17/11 — tích hợp và nghiệm thu phần mở rộng** | Returns từng dòng/hoàn từng phần, phiếu nhập và hàng hỏng, thông báo/exception queue, báo cáo theo thời điểm phát sinh được tích hợp và kiểm chứng; Web/mobile đồng bộ phần được giao. | Dự kiến với 5 người tham gia đủ và provider sẵn sàng; chi tiết effort được cập nhật sau khi review các PR hiện có. Không bảo đảm ngày kết thúc nếu điều kiện không đạt. |

Chỉ tính ngày làm việc: 27–30/10, 02/11; 04–06/11, 09–10/11; 11–13/11, 16–17/11. Không mặc định làm cuối tuần. Mốc **17/11** là ước lượng khép phạm vi nghiệp vụ mở rộng dưới đây, không phải chứng nhận đủ để vận hành marketplace production.

Các module đã cam kết demo không được lặng lẽ chuyển sang sau demo. Mốc 04–17/11 dành cho chiều sâu bổ sung từ audit như trả từng món, phiếu nhập nhiều SKU, thông báo và báo cáo dòng tiền. Nếu phạm vi bắt buộc chưa đạt, báo cáo blocker và tác động trước demo.

## 2. Nguyên tắc thực hiện

- Giữ bốn service, DB riêng, owner và task gốc. Công chịu điều phối/Payment/AI; Thịnh M1/Seller; Hoa M2/Android; Trí M3/Admin; Hatsaphone Customer Web. Hỗ trợ sửa code không làm đổi owner chịu trách nhiệm nghiệm thu.
- Review PR hiện có trước khi viết trùng: [#130 taxonomy](https://github.com/embetapbay123/PBL6/pull/130), [#131 moderation](https://github.com/embetapbay123/PBL6/pull/131), [#132 Review](https://github.com/embetapbay123/PBL6/pull/132), [#133 Seller forms](https://github.com/embetapbay123/PBL6/pull/133), [#129 Android](https://github.com/embetapbay123/PBL6/pull/129). Xác minh dependency và head thực tế; chỉ merge PR đạt, chạy lại kiểm tra sau giải conflict. Không mặc định các PR độc lập hoặc đã sửa hết lỗi audit.
- Mỗi lát cắt phải có contract/schema tăng thêm nếu cần → BE → UI → kiểm thử → evidence. Cùng một thay đổi deploy API, worker, Web tương thích; Flutter không bị ép hỗ trợ DTO mới trước khi client được cập nhật.
- Dùng lại EntityManager của transaction, outbox/inbox, version/lock và operation ID hiện có. Lỗi sau side effect phải đối soát/replay cùng payload. Callback tiếp tục xác minh raw body trước DTO.
- Không đổi migration đã áp dụng, không reset demo data; bảo toàn hồ sơ trả hàng/tiền đã có. Provider/network call ngoài transaction.
- Chỉ bổ sung kiểm thử cho các bất biến/nguy cơ thực tế và kiểm thử tích hợp cần thiết. Hoàn thành code không tự hoàn thành issue; Review chờ nghiệm thu, Done cần đủ acceptance và merge.

## 3. Các gói trước demo

### D0 — Chốt nền và contract, 27/10 — Công điều phối

1. Review năm PR hiện có, ghi rõ phần giữ/sửa và lỗi còn lại; giữ đúng owner. Tách lỗi trên main khỏi thay đổi mới trên PR.
2. Lập bảng operation theo revision cho các lát cắt bên dưới; sửa mô tả tài liệu đã lỗi thời về Product, Auth/RBAC, M4 và số API. Lưu riêng các mốc lịch sử.
3. Chốt một state matrix cho Order/Payment/Shipment/Return/Inventory: ai thao tác, điều kiện, trạng thái trước/sau, compensation và dấu thời gian. Payment SUCCEEDED không tự chứng minh giao xong; Return RECEIVED không tự chứng minh hoàn tiền xong.
4. Chốt input/output/error và fixture cho management Product read, availability public, thông tin Shipment, bộ lọc Order. Sinh DTO/types/client từ contract và bàn giao ngay; không để mỗi FE tự đặt field.

**Đạt:** member biết file/operation cần sửa và dependency thực; không phải chờ Công code lại nghiệp vụ của mình. Contract mới không tự ghi IMPLEMENTED.

### D1 — Khép vòng đời Product, 27–28/10 — Thịnh

Task gốc [#9](https://github.com/embetapbay123/PBL6/issues/9), [#10](https://github.com/embetapbay123/PBL6/issues/10); review PR #133 trước.

- Thay `type-default` bằng loại đang hoạt động; render thuộc tính Product và Variant theo definition; hiển thị nhãn màu/size, không chỉ SKU.
- Bổ sung **GET `/store/products/{id}`** theo membership/permission, trả cả trạng thái nháp/dừng/ẩn thuộc đúng Store. Editor dùng read này; public read tiếp tục chỉ trả hàng được phép công khai. Owner không tự gỡ kiểm duyệt của Admin.
- Tạo ở trạng thái DRAFT, giữ Product ID qua các bước Product → Variant → ảnh. Cho tiếp tục đúng bước sau lỗi/reload; giữ pending command theo tài khoản/Store. Dùng idempotency phía server cho create: dự kiến thêm header `Idempotency-Key` vào ba operation tạo Product/Variant/ảnh, UI mới luôn gửi, chính sách tương thích client cũ chốt ở D0. Cùng key khác body trả 409.
- Chốt điều kiện xuất bản: trường/thuộc tính hợp lệ, ít nhất một Variant đang bán với giá hợp lệ và ảnh hợp lệ theo contract. Tồn 0 được hiển thị hết hàng; không bắt xóa Product. Trả lỗi nghiệp vụ rõ nếu chưa đủ điều kiện.
- Sửa nháp, xuất bản, dừng và mở bán lại; kiểm SKU/default Variant và ảnh theo API đã có. Upload file an toàn nếu thuộc tiêu chí ảnh đã cam kết vẫn phải có bằng chứng; nhận URL chưa tự chứng minh đã có upload.

**Đạt:** Owner tạo từ form, refresh, sửa/mở lại hàng dừng; Store khác không đọc/sửa được; lỗi sau tạo không sinh Product/SKU trùng. Mọi trạng thái đều có đường quản lý hợp lệ.

### D2 — Review và kiểm duyệt, 27–28/10 — Thịnh BE, Hatsaphone UI, Trí Admin

Task [#16](https://github.com/embetapbay123/PBL6/issues/16), [#17](https://github.com/embetapbay123/PBL6/issues/17), [#69](https://github.com/embetapbay123/PBL6/issues/69), [#47](https://github.com/embetapbay123/PBL6/issues/47); tích hợp PR #131/#132 sau review.

- Hoàn thiện năm operation Review trên main: đọc, tạo, sửa, hide/restore. Lookup eligibility qua M2, đúng Customer/OrderItem và trạng thái theo policy.
- Chống Review trùng OrderItem; sửa theo version; bài ẩn không xuất hiện công khai; rating/count được tính nhất quán.
- UI Customer và Admin dùng API thật; phân biệt chưa có Review với dependency lỗi. Không làm lại form đã có nếu chỉ cần sửa điểm nối.

**Đạt:** OrderItem mua thật đủ điều kiện tạo/sửa được; mua của người khác/chưa hoàn tất/trùng/stale version bị chặn; Admin hide/restore cập nhật public list và aggregate.

### D3 — Account/email, Admin và APK sớm, 27–29/10 — Trí và Hoa

- **Trí:** cấu hình SMTP/provider đã có trong adapter bằng secret local, xác minh register → nhận mail → verify và reset thật; token hết hạn/replay, đổi mật khẩu/thu hồi phiên. Nghiệm thu Staff invite và quyền cập nhật trên phiên cũ. Task [#37](https://github.com/embetapbay123/PBL6/issues/37)–[#44](https://github.com/embetapbay123/PBL6/issues/44).
- **Hoa:** review/tích hợp PR #129, build/cài candidate **ngày 27/10**, xác minh base URL và login/Cart/Order ngay; sửa sớm lỗi SDK/device. Sau đó tích hợp phần M2 cần sửa, không chờ 02/11 mới build APK. Task [#31](https://github.com/embetapbay123/PBL6/issues/31)–[#36](https://github.com/embetapbay123/PBL6/issues/36).
- **Trí Admin:** khép các màn đã cam kết với taxonomy/moderation/Orders/Voucher/AI metrics; chưa có run/metric phải hiện chưa có dữ liệu đúng nghĩa, không chế số 0.

**Đạt:** tài khoản mới dùng được qua email thật; APK cài trên thiết bị demo, đi qua gateway; bằng chứng đủ scope quyền thay vì chỉ build pass.

### D4 — Payment/Refund và AI bắt buộc, 27–29/10 — Công

Task [#52](https://github.com/embetapbay123/PBL6/issues/52), [#53](https://github.com/embetapbay123/PBL6/issues/53), [#55](https://github.com/embetapbay123/PBL6/issues/55)–[#60](https://github.com/embetapbay123/PBL6/issues/60).

- **27/10 chốt dependency Refund:** xác minh provider thật hỗ trợ refund và lookup/idempotency; ghi blocker/owner/mốc nếu chưa có. SePay inbound không tự cung cấp khả năng chuyển tiền hoàn. Cơ chế hoàn thủ công có chứng từ là đề xuất khác, chỉ thay yêu cầu online Refund nếu chủ dự án quyết định rõ; không tự coi nó thỏa cam kết hiện tại.
- Adapter hoàn dùng operation ID ổn định, kiểm reference/amount/receipt; UNKNOWN phải lookup trước retry. Tích hợp runner hiện có, giữ audit/tiền và trạng thái nguyên tử. Không dùng test double cho bằng chứng provider.
- Chạy online Order bằng provider test: callback lặp/chậm, thanh toán sát hạn/hủy, stock command mất ACK và restart; không thu/hoàn hai lần hoặc đụng sibling Order. Chạy COD thu đủ và cash refund có xác nhận riêng.
- AI dùng provider/model đã cấu hình; kiểm generation, grounding, timeout và consent/revoke; ghi dataset/model/evaluation/run cho recommendation. Không bắt đầu thay model/kiến trúc nếu adapter hiện tại đáp ứng.

**Đạt:** có bằng chứng online nhận và hoàn tiền test, trạng thái cuối đúng; AI sinh câu trả lời dựa Catalog và có evaluation theo task. Nếu Refund chưa sẵn sàng, **full demo vẫn còn blocker**, không chuyển mốc bắt buộc sang sau 03/11.

### D5 — Customer, vận hành đơn và giao nhận tối thiểu, 28–29/10

**Hoa M2, Thịnh Seller, Hatsaphone Customer; Công chốt contract và hỗ trợ phần giao dịch khó.** Giữ owner task [#23](https://github.com/embetapbay123/PBL6/issues/23)/[#24](https://github.com/embetapbay123/PBL6/issues/24)/[#19](https://github.com/embetapbay123/PBL6/issues/19)/[#65](https://github.com/embetapbay123/PBL6/issues/65)–[#68](https://github.com/embetapbay123/PBL6/issues/68).

- Public availability theo Product/Variant đã được lọc Store/Product active; chỉ trả thông tin được phép công khai. Failure không biến thành 0 tồn. Customer chọn màu/size, thấy còn/hết hàng; Cart báo dòng dừng bán/không còn Variant/giá đổi trước Checkout, vẫn lấy quote cuối từ server.
- Giữ operation ID cho Add Cart nếu bổ sung retry; nếu chưa có khả năng đối soát thì tải lại Cart trước thao tác tiếp, không tự gửi lại lệnh cộng số lượng. Test mất ACK và đổi tài khoản.
- Thêm lọc trạng thái/ngày/mã đơn theo server, pagination giữ bộ lọc; thay UUID/enum ở vị trí chính bằng tên Store/nhãn trạng thái/mã hiển thị, UUID vẫn là identity nội bộ.
- Shipment thủ công có đơn vị/mã hoặc reference/ghi chú được chốt, actor và thời điểm. Mở rộng **một đường chuyển trạng thái đang có**, không thêm hai writer độc lập cho Order/Shipment. Khi giao xong phải có căn cứ xác nhận giao nhận và thu đủ tiền theo policy; không lấy Payment làm bằng chứng nhận hàng.
- Order detail trả snapshot Shipment/lịch sử, tách Order, giao hàng, tiền và hồ sơ trả. Carrier production không tự bổ sung vào phạm vi demo.
- Hatsaphone nhận lát cắt UI rõ và nhỏ: nhãn Variant, cảnh báo Cart, bộ lọc Order, đọc Shipment/return/refund; không giao thêm ownership BE/transaction.

**Đạt:** người mua biết món nào không mua được và vì sao; người bán tìm và xử lý được đơn; thông tin giao nhận có nguồn/actor; reload/version/permission đúng.

### D6 — Chính sách trả toàn đơn và ý nghĩa báo cáo, 28–29/10

**Hoa/Công M2 và Payment; Thịnh kho/Seller; Hatsaphone hiển thị Customer.** Không làm lại ReturnService của #134.

- D0 chốt policy hiển thị: cutoff hủy như baseline, trả toàn đơn sau COMPLETED, ai chịu phí giao/hoàn và trường hợp bị từ chối. **Đề xuất 7 ngày từ mốc giao thành công** cho yêu cầu Customer; đây là quy tắc đề xuất cần chốt trong contract/business rules trước khi áp dụng. Không hồi tố làm mất quyền xử lý hồ sơ đang có; Order cũ thiếu mốc hợp lệ cần đường review rõ.
- Tối thiểu hồ sơ có lý do, mốc quyết định/nhận và tình trạng; nếu hỗ trợ bằng chứng ảnh thì dùng đường lưu file an toàn đã chốt, không coi URL nhập tay là bằng chứng được xác thực.
- Nhận hàng tốt mới queue Restock; hàng hỏng không nhập bán. Online/COD hoàn độc lập với nhận hàng. Trường hợp hỗn hợp tốt/hỏng từng dòng và hoàn một phần chuyển gói N1, UI phải nói rõ giới hạn toàn đơn hiện tại.
- Báo cáo hiện có ghi rõ cohort ngày tạo đơn, tiền đã thu và hoàn; phân biệt xuất cho Order với bán hoàn tất. Không ghi lợi nhuận khi chưa có giá vốn. Báo cáo theo event time được triển khai ở N3.

**Đạt:** cả giao thất bại và Customer trả toàn đơn có hướng xử lý/tiền/kho rõ; không có bước duyệt là cộng kho hoặc tạo Refund là đã trả tiền.

## 4. Lịch khép demo và trách nhiệm

| Ngày | Công | Thịnh | Hoa | Trí | Hatsaphone | Gate cuối ngày |
| --- | --- | --- | --- | --- | --- | --- |
| **27/10** | Review/triage PR; D0 contract/state; chốt Refund dependency | Sửa vòng đời Product, tiếp nhận kết quả review #130–133 | Build/cài APK, đối chiếu #129; retest M2 | Email receipt + quyền/staff; Admin dependency | Review API thật; sửa form/nhãn/cảnh báo theo contract | PR có kết luận; thiết bị kết nối; từng blocker provider/mail có owner và bước khắc phục. |
| **28/10** | Refund adapter/integration và AI evidence | Product lifecycle/recovery, Review/moderation; bàn giao API | Order/Shipment/filter + xử lý integration; APK đọc các flow | Email/staff/Admin chạy thật | Customer Cart/Variant/Order/Review UI | Product lifecycle + Review qua UI; contract/API mới đủ cho client. |
| **29/10** | Money/stock/provider/recovery + AI chốt evidence | Seller/kho/giao/trả toàn đơn | M2 và Android toàn luồng | Admin, mail, permission regressions | Web checkout/giao/return/refund/error | Candidate đủ chức năng bắt buộc; không còn 501 trong tuyến demo. |
| **30/10** | Điều phối nghiệm thu FR/NFR, security/load/recovery/restore | Retest M1/Seller, sửa lỗi | Retest M2/device, APK candidate | Retest M3/Admin/IDOR/revocation | Retest Customer/mobile viewport | Diễn tập lần 1 bằng candidate, ghi rõ PASS/PARTIAL/BLOCKED. |
| **02/11** | Release đồng bộ, backup/restore/runbook | Sửa lỗi chặn demo và nghiệm thu lại | APK cuối: cài lại, version/checksum | Tài khoản/quyền/email/Admin cuối | Kịch bản Web cuối, evidence | Khóa release đã kiểm; không thêm module mới. |
| **03/11** | Điều phối demo bằng release đã xác minh | Seller | Android/M2 | Admin | Customer Web | Trình bày đúng khả năng và blocker còn lại. |

Lịch này đang căng vì gate feature-complete 26/10 chưa khép. D0 phải rà effort thật sau review; không ghi tất cả chắc chắn xong trong ngày chỉ vì có AI. Công hỗ trợ review/transaction/integration khi cần; không biến toàn bộ FE/M2 thành việc Công phải code xong trước người khác mới làm.

## 5. Hoàn thiện lõi mở rộng — 04–17/11

| Gói / ngày dự kiến | Phạm vi và thay đổi cần thiết | Owner / phụ thuộc | Nghiệm thu |
| --- | --- | --- | --- |
| **N1 — 04–06/11 thiết kế và BE; 09–13/11 UI/mobile + test** | Returns theo OrderItem/số lượng; nhận từng phần, tình trạng từng dòng, hủy yêu cầu trước bước giới hạn, lý do/chứng cứ và review lại theo policy. Tách ReturnCase/ReturnItem/Receipt thay vì boolean restock toàn đơn. Refund từng phần dùng allocation snapshot, BigInt/làm tròn nhất quán và tổng hoàn không vượt thực thu/qty đã mua. Một Payment hiện bị unique một Refund: cần migration tăng thêm thay ràng buộc bằng mô hình nhiều Refund và kiểm tổng dưới lock; không chỉ bỏ unique. Idempotency và provider lookup cho từng Refund. Quy tắc quota/review/report khi trả một phần phải chốt. | Hoa M2, Công Payment; Thịnh M1 disposition; Hatsaphone Customer. Phụ thuộc D4 provider, D6 policy. | Một đơn có 2 món: trả 1 món, một phần tốt/một phần hỏng; tổng kho/tiền/discount đúng, lặp/concurrent không tăng tổng. Dòng còn lại tiếp tục hợp lệ. Chứng minh rollback và provider outcome. |
| **N2 — 04–10/11 BE/Seller; 11–13/11 đối chiếu** | Phiếu nhập nhiều SKU: số phiếu, supplier/reference, DRAFT/SUBMITTED/APPROVED/RECEIVED/CANCELLED theo policy; nhận từng phần nếu chốt. ReceiptLine có qty/đơn giá, stock movement liên kết chứng từ. Tách tồn bán được và hàng hỏng/cách ly vật lý theo Variant; có disposition/tiêu hủy/khôi phục được duyệt, không sửa số liệu âm thầm. Điều chỉnh kiểm kê vẫn là nghiệp vụ riêng. | Thịnh M1/Seller; Công review invariant/transaction. N1 bàn giao hợp đồng hàng hoàn; không đọc DB M2. | Đầu kỳ + nhập + hoàn + điều chỉnh − xuất = cuối kỳ theo từng loại tồn; replay phiếu không nhập hai lần, hàng cách ly không bán được, audit trỏ đúng actor/chứng từ. |
| **N3 — 04–06/11 chốt metric; 09–13/11 BE/UI** | Giữ report cohort hiện tại và bổ sung báo cáo theo completed_at/payment collected/refund succeeded. Sổ phát sinh immutable hoặc projection từ event được dedup có source ID/version; có report tiền thu/hoàn/net, hàng hoàn theo kỳ và export có kiểm quyền/giới hạn. Giá vốn/lợi nhuận chỉ thêm sau khi chọn phương pháp giá vốn và dữ liệu N2 đủ; không gọi net sales là profit. | Hoa M2/report; Thịnh Store UI; Trí Admin; Công review financial meaning. Phụ thuộc N1 allocation và N2 nếu tính giá vốn. | Đơn tạo tháng trước, hoàn tất/thu/hoàn tháng này xuất hiện đúng báo cáo tương ứng; không trừ hai lần khoản đã excluded; có đối chiếu transaction và timezone. |
| **N4 — 04–10/11 API/worker; 11–13/11 UI** | Notification in-app có recipient, type, resource ID, created/read và dedup; outbox/retry. M3 có thể sở hữu inbox người nhận trong bốn service, chỉ sau khi chốt ADR/caller/event contract. Product/kho/Order phát sự kiện từ service sở hữu, consumer xác minh đối tượng nhận. Không dùng InteractionRecorded dành cho AI làm thông báo nghiệp vụ. Email tiếp tục là kênh có status độc lập. | Trí M3/Admin; Công contract/outbox/worker; Thịnh/Hoa producer theo module; Hatsaphone list/read nhỏ. | Đơn/duyệt kho/return/refund phát thông báo đúng người; replay không trùng; người khác không đọc; delivery lỗi không rollback giao dịch đã commit hoặc giả delivered. |
| **N5 — 04–10/11 vận hành; 11–13/11 kiểm quyền/recovery** | Admin exception queue đọc ca UNKNOWN/refund treo/command lỗi, filtering tuổi lỗi và audit được redact. Chỉ bổ sung lệnh retry/reconcile có domain guard, operation ID, version và bằng chứng; không nút sửa thẳng số dư/tồn. Support ticket cơ bản gắn Order có scope, trạng thái và lịch sử; dispute/settlement đầy đủ là dự án khác. | Công Payment/ops; Trí Admin/M3; Hoa M2; Thịnh M1 command. | Có thể tìm ca lỗi, xem nguyên nhân và chạy đúng quy trình khôi phục; privilege/replay/race bị kiểm soát, PII/secret không lọt UI/log. |
| **N6 — 04–10/11 UX tìm/mua; 11–13/11 đồng bộ client** | Khoảng giá/thuộc tính/còn hàng theo server; phân trang toàn bộ taxonomy; trang Store có thông tin và sản phẩm đúng scope. Cart giải thích thay đổi giá/tồn, Add Cart idempotency hoàn chỉnh; Order filters và mã hiển thị. AI/recommendation tiếp tục lọc đúng Product/Store và consent. | Thịnh M1/Seller; Hatsaphone Customer UI; Hoa mobile; Công AI freshness. | URL giữ filter/pagination; giá/Variant/kết quả lọc đúng; hết hàng/ẩn/Store khóa phản ánh nhất quán; query lỗi không thành empty; account isolation/reload đạt. |
| **N7 — 16–17/11 nghiệm thu tổng** | Chạy lại các luồng sau mở rộng, migration upgrade với dữ liệu cũ, tải theo profile đã chốt, backup/restore, source/runtime/API/worker/client version và tài liệu. | Cả nhóm; Công điều phối. | P0 đã đóng, P1 có kết quả và owner rõ, không gắn Done bằng DTO/CI/happy path. Danh sách phần chưa đủ còn được giữ trong issue. |

Mốc N1–N7 là dự kiến theo dependency, không yêu cầu một người làm đồng thời mọi dòng. Trong giai đoạn 04–10/11: Hoa ưu tiên N1 BE rồi N3; Thịnh N2; Trí N4/N5; Hatsaphone N6 và UI được bàn giao; Công N1 Payment/N5/contract. Giai đoạn 11–13/11 ưu tiên ghép client/kiểm thử, không mở thêm domain mới. Nếu không đủ capacity, cập nhật thứ tự và ngày hoàn tất, không thay kết quả kiểm bằng lịch.

## 6. Những quyết định phải có trước code mở rộng

| Quyết định | Người chốt / thời hạn | Sản phẩm tài liệu |
| --- | --- | --- |
| Provider Refund hỗ trợ gì và bằng chứng test | Công, **27/10** | Contract adapter, mode, receipt/lookup, blocker nếu chưa có; không gửi key vào tài liệu. |
| Product xuất bản/nháp, management read, idempotency create | Công + Thịnh, **27/10** | OpenAPI/DTO và tiêu chí publication, policy tương thích. |
| Hoàn tất giao nhận và actor được xác nhận | Công + Hoa + Thịnh, **27/10** | State matrix/DTO Shipment và hiển thị nguồn thủ công. |
| Thời hạn trả, phí, chứng cứ, review/voucher sau trả | Công + Hoa, **28/10** cho toàn đơn; **04/11** cho partial | Business rules/ADR, policy version và bảng quyết định; không hồi tố sai dữ liệu cũ. |
| Giá vốn và nghĩa từng báo cáo | Hoa + Thịnh + Công, **04–06/11** | Định nghĩa metric, timestamp, công thức, dữ liệu nguồn và ví dụ đối chiếu. |
| Notification/support ownership và events | Công + Trí, **04/11** | ADR trong bốn service, schema/version/producer/consumer/recipient, retention và quyền. |

## 7. Kanban, PR và phát hành

1. Việc D0–D6 gắn checklist/lỗi/evidence vào issue gốc; mở issue phụ chỉ khi là phạm vi mới rõ ràng. Không gộp cả Product/Return/Inventory/AI thành một PR lớn.
2. Chỉ đưa công việc đang trong cửa sổ làm vào Todo; mỗi người một gói chính In progress, phần đã gửi chuyển Review. Blocked ghi dependency cụ thể và phần vẫn làm độc lập; không giấu bug trong trạng thái chờ nghiệm thu.
3. N1–N7 lập Backlog có dependency/mốc, chỉ đưa vào Todo khi tới cửa sổ và đã có capacity. Giữ owner, không mở lại task Done chỉ vì có yêu cầu mở rộng; tạo scope bổ sung có dẫn task gốc khi cần.
4. Mỗi PR tiếng Anh, body có trigger/before-after, operation/schema/migration nếu đổi, test đúng nguy cơ và phần chưa đủ. Review đúng head; generated DTO/types/fixture không drift. Không commit `.env`, secret hoặc mẫu chat nhóm.
5. Deploy từ revision sạch đã merge: build → ngừng ingress/writer → backup bốn DB → restore drill → migration tăng thêm → API/worker/Web matching → health/schema/version → mở gateway → UI/provider/device acceptance. Dùng helper hiện có; không seed/reset dữ liệu demo.
6. Evidence ghi revision, runtime, loại môi trường, TC, kết quả tiền/kho cuối và provider/device receipt phù hợp. Fixture/DB tạm/public read/provider test là các bằng chứng khác nhau; chỉ nhận đúng phạm vi đã kiểm.

## 8. Ngoài mốc hoàn thiện này

Carrier production nhiều hãng, đa kho quy mô lớn, commission/payout/settlement/wallet, flash sale, loyalty, livestream, dispute thương mại đầy đủ và vận hành production cần yêu cầu/nguồn lực riêng. Wishlist/so sánh là tiện ích sau các gói lõi. Không dùng danh sách này để tự loại các module đã cam kết cho demo 03/11.
