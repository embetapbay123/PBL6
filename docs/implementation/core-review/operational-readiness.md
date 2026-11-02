# Mức sẵn sàng vận hành và phần còn phải review

> Hồ sơ dưới đây giữ kết quả **baseline review30/10**. Đợt sửa đã xác minh52finding gốc và24finding bổ sung; sáu chuỗi chung mã ứng dụng đạt ở62. Xem [trạng thái sửa hiện tại](../core-fix/README.md) và [audit158ID](../core-fix/wave-37-coverage-audit.md). Không chuyển các hàng baseline cũ sangPASS hoặc nhận đây là nghiệm thu production.

**Chưa sẵn sàng vận hành. Đã chốt trạng thái và giới hạn cho đủ158 ID; chưa thực thi đầy đủ mọi nhánh.** Còn38FAIL,10BLOCKED và5POLICY_GAP. Hồ sơ review không phải nghiệm thu production; các bảng snapshot bên dưới giữ lịch sử.

Baseline `operational-20261029T075615Z`, commit `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree chưa commit. Xem [baseline/hash từng file](../../../artifacts/core-review/operational/baseline.json) và [coverage 158 hàng](scenario-coverage.md). Vite `127.0.0.1:3109`, gateway `127.0.0.1:18080`, Docker project **pbl6-fe-verify**; không dùng project demo chung `pbl6`. Browser là Edge trên Windows, không phải thiết bị di động vật lý.

## Kết quả chốt hồ sơ — 30/10/2026

Xem [lượt06 Admin](continuation-06-admin.md) và [lượt07 ảnh/bàn phím/nội dung](continuation-07-accessibility-content.md). Catalog158: **54PASS,51FRICTION,38FAIL,10BLOCKED,5POLICY_GAP,0NOT_RUN**. Có149ID có walkthrough hoặc điểm dừng UI,406lượt browser hiện hành:256assertionqua/148lỗi/2skipped. Không coi assertion, viewport hoặc đường phục hồi là nhiệm vụ mới; lần probe native bị chặn được lưu riêng.

| Nhóm | ID | PASS | FRICTION | FAIL | BLOCKED | POLICY_GAP |
|---|---|---:|---:|---:|---:|---:|
| Customer | C01–C54 |13|20|13|6|2|
| STORE_OWNER/SELLER | S01–S42 |15|14|9|1|3|
| Admin | A01–A24 |10|8|6|0|0|
| Gián đoạn/accessibility | X01–X30 |16|8|3|3|0|
| Bổ sung vận hành | N01–N08 |0|1|7|0|0|

27 CR hiện có:0P0/4P1/22P2/1P3. Lượt06 thêmCR-026/027P2; lượt07 tái xác minhCR-005P3/CR-017P2, không thêmP0/P1. Những tổng tiền đã đối chiếu đều khớp dữ liệu gốc trong mẫu; không suy mọi giao dịch an toàn hoặc báo cáo đã đủ để vận hành. PASS fixture không chứng minh provider thật.

## Ưu tiên xử lý trước vận hành

| Ưu tiên | Finding | Công việc bị ảnh hưởng và yêu cầu nghiệm thu tối thiểu |
|---|---|---|
| P1 | UX-03 | Lấy và giao đúng hàng: đủ màu/size, người nhận/phone/địa chỉ trên phiếu xử lý; manual shipping vẫn được chấp nhận |
| P1 | CR-001 | Mua ngay giữ đúng lượng người mua chọn khi giỏ đã có cùng variant; xác minh quote/order cùng lượng |
| P1 | CR-016 | Đổi tài khoản/refresh đồng bộ identity, membership và cache giữa tab; không dùng context cũ để trình bày hành động |
| P1 | CR-025 | Nhân viên kho nhận ra đúng món/SKU ở mọi trang mà không cần quyền sửa sản phẩm; giữ phạm vi Store |
| P1 | OP-01 | Có đường ghi giao thất bại/tiếp nhận hoàn về theo policy, không thu COD hoặc restock hàng chưa kiểm giả |
| P1 | CR-006 | CODrefund đi tới kết thúc có xác nhận đúng tiền, retry an toàn; không gọi yêu cầu hoàn là đã hoàn |
| P1 | OP-02 | Đối chiếu tồn/giữ theo kỳ từ biến động và actor phù hợp quyền; không nhập nhằng tồn vật lý với số thương mại |

Các P2 tiếp theo: bảo toàn chọn một phần giỏ và giá sau requote; đồng bộ lịch sử; editor/voucher; Admin nhận đúng Store/actor/ảnh hưởng trước quyết định. Danh sách trên phân biệt bug và thiếu khả năng vận hành, không phải tổngbug mới. Hướng sửa và hồi quy ở [findings](findings.md)/[usability-findings](usability-findings.md); đợt này chưa sửa ứng dụng.

Cleanup gần nhất của dữ liệu runtime mới:7productSTOPPED,2typeINACTIVE,4StoreLOCKED,4pendingapplication đã từ chối, privateRoleINACTIVE/quyềnrỗng,11user tổng hợpLOCKED,0order mới. Không thay dữ liệu demo chung hoặc xóa audit/lịch sử. Lượt07 chỉ HTTPfixture, không phát sinh giao dịch runtime. USER_VALIDATION_PENDING.

## Snapshot lượt 06 — giữ lịch sử


[Admin24ID](continuation-06-admin.md) đã đi UI1440/390,10PASS/8FRICTION/6FAIL. Tổng **138ID/360lượt**,228assertionqua/132lỗi. Catalog158: **51PASS,46FRICTION,36FAIL,9BLOCKED,5POLICY_GAP,11NOT_RUN**. Không cộng viewport hoặc rerun thành ID mới.

CR-026P2 bộlọcpending bỏsót trang sau, CR-027P2 promptkhóa khôngđốitượng/tácđộng; UX-16 thiếuStore/ngữcảnhkiểmduyệt/return, UX-17 auditUUIDkhôngánhxạ, OP-05 reportAdminthiếuStore/kỳ. Không cóP0/P1mới; bốn tổngtiền toàn sàn khớpSQL, không kết luận sai tiền. A18gộpUX-15; policykỳ POL-07 giữ riêng.

Cleanup thật:7productSTOPPED,2typeINACTIVE,4StoreLOCKED,4pendinghồsơđãtừchối,privateRoleINACTIVE/quyềnrỗng,11user tổnghợpLOCKED,0order mới. Các objectsđềucótag riêng; giữaudit/lịchsử, khôngđổiứngdụng/contract. Chưaproviderthật/screenreader/thiếtbịvậtlý; USER_VALIDATION_PENDING. Còn11NOT_RUN:C08,X19/20/21/23/24/26–30. Nguồnhiệnhành làsummary/coverage/CSV/lượt06.

## Snapshot lượt 05 — giữ lịch sử


Ngày30/10/2026, [đơn/COD/sau bán/điều hành Seller](continuation-05-seller-orders-operations.md): 15ID điUI, gồm14ID trướcNOT_RUN và S36 bổ sungwalkthrough. 34lượt hiệnhành,28assertionqua/6lỗi; tổng **114ID/286lượt**,180qua/106lỗi, không tăng ID theo viewport/nhánh/phục hồi.

Catalog158 hiện **41 PASS, 38 FRICTION, 30 FAIL, 9 BLOCKED, 5 POLICY_GAP, 35 NOT_RUN**. Đủ42ID Seller đã có đường đi/điểm dừngUI, nhưng9FAIL, emailS39BLOCKED, policyS22/S35/S42cònmở. Lượt05 không tăng sốbug kỹthuật; các vấn đề bàn giao, giải thích quyềnCOD, voucher editor và CODrefund nối finding cũ.

Báo cáo UI/API/SQL thật:104đơn,giátrị10672000,hànghoàntất90000,thu90000,hoàn0; không tự gọi là lợinhuận. **POL-07 cần chốt kỳ**: code lọc collected/refunded theo order.created_at, không phải event-date cashflow; chưa coi là tính sai tiền khi định nghĩa chưa rõ. S35 dùngPOL-02 địa chỉ/phí trả; không bịa nơi nhận. NămIDPOLICY_GAP: C49,C52,S22,S35,S42.

Batch05 chỉ đọc runtime ngoài invitationmock mới trả503vàREVOKED; không tạo order/thu/hoàn/tin nhắn thật. Closeout xác nhận0productreviewACTIVE, haiStoremớiLOCKED, tồnseed0/reserved0, permissionphục hồi và ordercountvẫn104. Nguồn hiệnhành là summary/coverage/CSV và lượt05; các snapshot dưới giữ lịch sử. 35NOT_RUN: C08,A01–A24,X19/X20/X21/X23/X24/X26–X30. USER_VALIDATION_PENDING; chưa hoàn tất toàn158/chưa sẵn sàng vận hành.

## Snapshot lượt 04 — giữ lịch sử

Ngày30/10/2026, xem [22 nhiệm vụ Seller/catalog/kho](continuation-04-seller-catalog-stock.md). Tích lũy **99 ID đi UI / 252 lượt browser hiện hành**: 152 assertion qua/100 lỗi. Lượt04 có70 lượt sau gộp chạy lại, 48qua/22lỗi; viewport/vòng tránh/vai trò không tăng số ID hoặc bug.

158 nhiệm vụ: **38 PASS, 33 FRICTION, 27 FAIL, 8 BLOCKED, 3 POLICY_GAP, 49 NOT_RUN**. Thêm CR-025 P1 không nhận ra món/SKU ở màn kho, CR-023 P2 chặn giá hợp lệ, CR-024 P2 lịch sử chưa đồng bộ và UX-15 P2 thiếu lý do kiểm duyệt. Đã báo lỗi kho P1 ngay trong lượt. Chưa có bằng chứng ghi nhầm tồn/sai tiền.

Mở Store đã kiểm UI/API thật: gửi/PENDING/trùng/REJECTED/gửi lại/APPROVED; sau reload đúng STORE_OWNER và membership OWNER. S09 tạo12tổ hợp thủ công được, editor kiểm thêm768/1024; không chấm thiếu bulk thành FAIL. S12 dùng Customer riêng tạo đơn chưa trả, giữ2đúng; không có payment/provider attempt.

Cleanup lượt04: 0 product mới ACTIVE, productSTOPPED/HIDDEN, typeINACTIVE; hai Store mớiLOCKED, sáu hồ sơ test pending đã từ chối để thu hồi; orderCANCELLED, tồn khởi tạo đã bù về0/reserved0. Quyền nhân viên/name/fee/giá được phục hồi. Dữ liệu/audit/lịch sử giữ lại. Docker/Vite khởi động lại sau gián đoạn, không rebuild;239path nguồn vẫn kiểm theo baseline.

Ba POLICY_GAP: C49 phục hồi lượt voucher, C52 gửi trả/phí/địa chỉ, S22 nghĩa tồn vật lý/thương mại. Tám BLOCKED provider/email/screen reader/thiết bị giữ nguyên. USER_VALIDATION_PENDING; còn49NOT_RUN từng ID trong coverage, ưu tiên tiếp Seller đơn–COD–sau bán–voucher–staff/report rồi Admin và accessibility. Nguồn hiện hành là summary/coverage/CSV và lượt04; các mục dưới là snapshot lịch sử.

## Snapshot lượt 03 — giữ lịch sử

Xem [34 ID mới về xác thực/sau mua/phục hồi](continuation-03-auth-aftersales.md). Tích lũy **77 ID đi UI / 182 lượt browser hiện hành**: 104 assertion qua, 78 lỗi. Sau gộp chạy lại cùng file/title/project, lượt 03 có 78 lượt cho 34 ID; không đếm viewport, lần phục hồi hoặc failure thành nhiệm vụ/bug mới.

158 nhiệm vụ hiện có **26 PASS, 26 FRICTION, 25 FAIL, 8 BLOCKED, 2 POLICY_GAP, 71 NOT_RUN**. CR-016 P1 đã có hai tab thật; CR-015 P2 đã được nâng CONFIRMED sau lifecycle Admin hide; thêm CR-022 P2 tổng mới/đơn giá cũ, có thể reload phục hồi. Không có bằng chứng thu sai hoặc backend vượt ownership ở các ca này.

API/DB/worker bổ sung xác nhận same-key concurrent confirm chỉ một order; hai Customer tranh tồn 1 chỉ một winner; địa chỉ bị xóa không tạo order; token SELLER cũ bị chặn đúng khi thu quyền. Hai order lượt 03 đều CANCELLED, last unit khôi phục 1/reserved=0, giá/review/quyền/mật khẩu đã khôi phục; 0 sản phẩm review ACTIVE, type INACTIVE. Xem cleanup lượt 03, không dùng snapshot cleanup cũ làm bằng chứng hiện tại.

C14–C16 BLOCKED email adapter trả 503; C39–C41 vẫn BLOCKED provider thanh toán; X22 screen reader, X25 thiết bị/bàn phím ảo vẫn BLOCKED. C49 POLICY_GAP chỉ phần phục hồi lượt voucher, hủy COD và tồn đã kiểm đúng; C52 chưa chốt địa chỉ/cách gửi/phí trả. USER_VALIDATION_PENDING.

**71 NOT_RUN còn lại** được liệt kê từng ID trong coverage. Tiếp theo: Seller/Owner đăng sản phẩm–kho–đóng gói–staff, Admin duyệt/quyền/vụ việc, C08 ảnh có nghĩa và X19–X30 keyboard/focus/zoom/nội dung khó; bổ sung 768/1024px cho màn phù hợp. Các snapshot bên dưới giữ lịch sử, không thay kết quả hiện hành này.

## Snapshot lượt 02 — giữ lịch sử

Xem [báo cáo Customer lượt 02](continuation-02-customer.md). Đã thêm **31 ID Customer**, tổng tích lũy **43 ID đi UI / 104 lượt browser hiện hành** sau gộp chạy lại harness; 48 assertion qua, 56 lỗi. Không cộng lại ID khi chạy ca biên, đường phục hồi hoặc viewport.

158 nhiệm vụ hiện có **11 PASS, 21 FAIL, 15 FRICTION, 5 BLOCKED, 1 POLICY_GAP, 105 NOT_RUN**. PASS chỉ cho mục tiêu đã đi được trong dữ liệu và loại bằng chứng nêu rõ; các ca provider thật, thiết bị vật lý và nghiên cứu người thật vẫn chưa được suy thành PASS. Hai lỗi mới CR-020/021, hai vướng usability UX-13/14 và phần mở rộng findings cũ được nối trong ledger.

Điểm rủi ro xác nhận thêm bằng UI+DB thật: “Mua ngay 2” khi giỏ có 2 thành quantity 4, quote hàng hóa 400.000đ; chưa confirm nên không tạo đơn sai. Ba đơn API fixture giao dịch của lượt mới đều đã CANCELLED, 0 sản phẩm review ACTIVE, type INACTIVE và voucher STOPPED. Bộ 100 đơn của lượt 01 là snapshot: hiện Store A có 102 đơn, Store B có 3 sau các ca bổ sung.

Phần dưới giữ số liệu lượt 01 để bảo toàn lịch sử. Nguồn hiện hành là summary/coverage/CSV và báo cáo lượt 05; các tổng lượt 01/02/03/04 không thay kết quả mới.

## Snapshot lượt 01 — giữ lịch sử

- Tách [158 nhiệm vụ](scenario-catalog.md), mỗi ID một hàng với mục tiêu/tiền điều kiện/dữ liệu/điểm bắt đầu/mong đợi/đối chiếu. Mở rộng tiêu chí theo phạm vi đã chốt, không áp quy tắc Shopee/Shopify.
- Phân loại [325/325 ID góp ý](plan-review-decisions.md): 6 IN_SCOPE, 169 MERGED, 115 DEFERRED, 35 OUT_OF_SCOPE; không ID trùng/thiếu. Đã tách scope khỏi kết quả chạy.
- Chạy lại bộ UI hiện có: **109 passed, 3 skipped / 112 trường hợp duy nhất** sau ghép lần chạy đúng cấu hình. Trong đó **108 ca passed có mapping ID**, vượt mức 60 subcase ổn định; một ca legacy demo không đưa vào review core. Đây là kiểm tra thành phần/luồng hẹp, không phải 108 nhiệm vụ hoàn chỉnh hoặc 108 người dùng.
- Đi UI có ghi điểm dừng cho **12 ID**, **26 lượt** ở 1440px và 390px: 20 lượt fixture + 6 lượt dùng API/DB thật. **22 assertion thất bại, 4 qua**. Bốn assertion qua gồm hai thao tác điều chỉnh bù N07 và hai lần tìm món bằng dò trang S13; vẫn có FRICTION ở cấp nhiệm vụ. 22 failure không phải 22 bug riêng.
- Sáu chuỗi có checkpoint hoặc điểm dừng rõ trong [live-review.json](../../../artifacts/core-review/operational/live-review.json). Không chuỗi nào được công nhận PASS toàn bộ UI → nghiệp vụ → report của cả ba vai trò.
- Trạng thái tổng hợp 158 ID hiện là **13 FAIL, 3 FRICTION, 1 POLICY_GAP, 5 BLOCKED, 136 NOT_RUN; 0 PASS toàn nhiệm vụ**. NOT_RUN nghĩa chưa đi đủ hai lượt/hai viewport của nhiệm vụ; có thể đã chạy subcase automation, được giữ trong CSV. Không xóa kết quả/bằng chứng lịch sử trước.
- Chạy lại riêng **23/23 ca chứng minh bug CR/UX**; chúng kỳ vọng hành vi đang lỗi, không cộng vào acceptance. Tên test UX-04/05/06 cũ tương ứng lần lượt với UX-06/UX-04/UX-11 trong báo cáo theo chủ đề; ledger chuẩn hóa theo nội dung, không theo nhãn test cũ.

Nguồn số liệu máy đọc: [summary.json](../../../artifacts/core-review/operational/summary.json), [automation-manifest.json](../../../artifacts/core-review/operational/automation-manifest.json), [scenario-results.csv](scenario-results.csv). Trạng thái kết quả đỏ của test thiếu khả năng được giữ nguyên; không đổi assertion để làm test xanh.

## Dữ liệu và giới hạn chuẩn bị

Tag chính **op-review-1793261067285**. Tạo người mới chưa có giỏ/địa chỉ/đơn, khách quay lại có hai địa chỉ và nhiều đơn, Customer khác, hai Store/Owner và hai nhân viên SELLER đủ/thiếu quyền. Admin dùng tài khoản kiểm thử của stack riêng để duyệt đúng hồ sơ mới; không sửa Owner/Store demo. Vai trò STORE_OWNER và membership OWNER khác cách đặt tên nhưng cùng chỉ chủ Store; SELLER là nhân viên.

Store A có **300 sản phẩm**, sản phẩm áo có **3 màu × 4 size**, **100 đơn** được tạo qua checkout thật, gồm CANCELLED 25, SHIPPED 19, PENDING 18, PROCESSING 19, COMPLETED 1, CONFIRMED 18 ở checkpoint seed. Store B có sản phẩm và các đơn xuyên chuỗi riêng; thêm đơn COD SHIPPED chưa thu để kiểm RTS. Đây là dữ liệu kiểm thử, không có tiền thu thật hay giao hàng vật lý. Có tồn 0/1/nhiều, tên và địa chỉ tổng hợp dài; SKU khó đoán.

API được dùng để duyệt Store, tạo sản phẩm, điều chỉnh tồn, checkout và chuyển trạng thái. SQL chỉ dùng provisioning user, taxonomy/thuộc tính riêng có tag, nhân viên fixture và đọc hậu điều kiện/thu hồi dữ liệu riêng. **Ảnh thật có nghĩa chưa được seed**; không coi ảnh fixture/ảnh lỗi trong suite khác là đáp ứng toàn bộ nhu cầu nhận diện bằng ảnh.

Sản phẩm review được đưa STOPPED và taxonomy riêng INACTIVE sau thực thi; truy vấn cuối xác nhận **0 sản phẩm ACTIVE** trong hai Store của lượt chính. Orders, users, memberships, stock movement và audit được giữ để kiểm lại. Lượt chuẩn bị đầu `op-review-1793260896502` tạo 301 sản phẩm rồi dừng do giả định test sai; đã thu hồi đủ 301 sản phẩm, giữ [retirement-attempt-1.json](../../../artifacts/core-review/operational/retirement-attempt-1.json). Không xóa lịch sử giao dịch.

## Sáu chuỗi và điểm dừng

| Chuỗi | Checkpoint cùng đối tượng đã chạy | Đối chiếu và điểm còn thiếu | Kết luận hiện tại |
|---|---|---|---|
| CH01 — COD nhiều Store | Hai món/hai Store, voucher 10.000đ, confirm/retry cùng key trả cùng order IDs; CONFIRMED → PROCESSING → SHIPPED → thu đúng COD → COMPLETED; review và notification; Admin đọc đúng | Mỗi món stock 250 → 249, reserved=0. Tiền completed/collected Store A 90.000đ, B 100.000đ, refunded=0; report đọc lại khớp checkpoint. Seller thiếu người nhận/màu/size ở UI, không thực hiện giao vật lý | API/DB đoạn đã chạy qua; **UI FAIL UX-03**, chưa PASS toàn chuỗi |
| CH02 — Hủy trước bàn giao | COD PENDING và hủy cạnh tranh xác nhận Store, một bên nhận VERSION_CONFLICT; hủy đúng version; lặp hủy không tăng lại tồn | Chờ worker RESTOCK xong mới so quantity; stock về mốc đầu, reserved=0, không refund COD chưa thu. Redemption voucher của đơn hủy vẫn tồn tại; chưa quyết định đúng/sai khi chưa chốt phục hồi lượt. Chưa walkthrough đủ ba vai trò | **PARTIAL**, policy voucher cần chốt; không PASS toàn chuỗi |
| CH03 — Online chưa rõ kết quả | Tạo đơn SANDBOX AWAITING_PAYMENT, thử tạo attempt thật | Provider disabled trả 503; không có giao dịch provider để mất phản hồi/đối soát/refund thật. Hủy đơn test hợp lệ. Fixture hiện có kiểm UI UNKNOWN/retry body/key, không thay cho provider thật | **BLOCKED** từ ranh giới provider |
| CH04 — Giao thất bại/hoàn về | Đơn COD riêng đi tới SHIPPED; payment PENDING, collected=0, refunded=0; thử dùng return hiện có trên đơn này trả RETURN_NOT_ELIGIBLE | Dừng trước ghi thất bại và nhận hàng về vì không có workflow tương ứng. Chưa kiểm nhận thực tế/phân loại, không bịa restock hoặc refund | **FAIL OP-01**, N03/N04 bị chặn theo phụ thuộc; nhánh online còn giới hạn provider |
| CH05 — Đổi/trả hiện có | EXCHANGE → APPROVED → RECEIVED → EXCHANGE_SENT → Customer confirm COMPLETED; REFUND COD → APPROVED → RECEIVED | COD completion 409 REFUND_NOT_CONFIRMED, refund row=0. Thiếu hướng dẫn gửi/địa chỉ/phí và chọn lại variant. Chưa kiểm hàng/gửi đổi vật lý; nhánh online thật tắt | **FAIL CR-006/UX-08**, đoạn trạng thái exchange qua API không chứng minh hậu cần đầy đủ |
| CH06 — Kho có đơn giữ | Tồn đầu 250; online giữ 1; giảm xuống dưới giữ bị 409; nhầm +5/replay cùng ID/bù −5; hủy nhả giữ; COD consume/hủy/restock | Ledger DB cộng quantity và reserved khớp snapshot, bù không xóa dòng cũ. UI/API Store thiếu delta_reserved/actor và view kỳ. COD consume trước PENDING nên quantity không đồng nhất với số đếm vật lý trước giao | **PARTIAL_API_PASS / UI FAIL OP-02**, cần làm rõ nghĩa tồn |

Thời gian, UUID và movement của mỗi checkpoint được giữ trong JSON; không ghép đơn khác nhau để tuyên bố một chuỗi đã hoàn tất. Report sau seed vẫn dùng đúng các đơn COD completed của CH01; phần order_value gồm cả đơn các trạng thái khác và không được gọi là tiền thu hoặc lợi nhuận.

## Công việc làm được và đường thủ công

| Công việc | Hiện trạng | Đường thủ công có thể chấp nhận/chưa đủ |
|---|---|---|
| Tạo/đổi trạng thái đơn, xác nhận COD | API/DB đúng ở mẫu đã chạy | Giao thủ công được chấp nhận, nhưng UI hiện thiếu dữ liệu giao nên chưa chấp nhận đường này là hoàn chỉnh |
| Tìm món giữa 300 sản phẩm | Dò trang tìm được, search chỉ trong trang | Có vòng tránh thực tế; đo số lần đổi trang trong `real-ui-screenshots/**/walkthrough.json`, không đặt ngưỡng click tuỳ ý |
| Xử lý hàng đợi 100 đơn | Phân trang và mở đơn được | Thiếu lọc theo việc; phải đọc/dò từng trang; FRICTION, chưa khẳng định mọi đơn đều bị chặn |
| Sửa lần điều chỉnh nhầm | Làm được bằng adjustment bù và lý do, DB giữ lịch sử | Không yêu cầu sửa/xóa phiếu hoặc ERP; còn phải tự tính delta và thiếu truy vết actor/kỳ |
| Nhận hàng hoàn về, COD chưa thu | Không có đường lifecycle từ SHIPPED | Ghi chat ngoài luồng chưa đủ đảm bảo đơn–hàng–tiền; cần policy và khả năng tối thiểu trong sản phẩm |
| Hoàn COD đã thu | Nhận yêu cầu được, kết thúc không được | Chưa có adapter/phương án xác nhận hoàn thủ công được sản phẩm hỗ trợ; không đánh dấu đã hoàn giả |
| Theo dõi nhân viên/diễn biến đơn | DB có dấu vết, UI Store thiếu đường xem | Không coi truy DB hoặc tài khoản Admin là workaround hợp lệ cho Owner |

## Giới hạn còn mở và điều kiện chạy tiếp

Không còn ID chưa được phân loại kết quả, nhưng còn10BLOCKED:

- C14/C15/C16: email runtime503; S39: delivery lời mời503 và invitation đãREVOKED. Chưa đi nhận thư/chấp nhận link thực qua adapter có kiểm soát.
- C39/C40/C41: payment provider disabled, CH03 dừng ở ranh giới503; chưa chạy full giao dịch online,UNKNOWN/hết hạn và nhánh online CH04/05 qua provider kiểm thử runtime.
- X22: chưa có phiên screen reader thực. X25: chưa có thiết bị vật lý/bàn phímảo; viewport390 không thay thế.
- X26: zoom200% chưa thực thi được. Shortcut headless không đổi hệ số; probe settings/headed đóng browser trước xác minh, không có cửa sổ test để điều khiển native. Không chỉnh cửa sổ cá nhân hoặc giả zoom bằng viewport/CSS.

NămIDPOLICY_GAP là C49,C52,S22,S35,S42: phục hồi lượt voucher; địa chỉ/cách gửi/phí trả; nghĩa tồn vật lý/thương mại; hướng dẫn tiếp nhận hàng; định nghĩa kỳ tiền thu/hoàn. Bảy câu hỏiPOL-01–07 ở [usability-findings](usability-findings.md) giữ nguyên, chưa bịa quyết định hoặc người/ngày chốt.

**Chín ID chưa có walkthrough đầy đủ riêng:** C39/C40/C41 dừngprovider; C52 thiếupolicy; C53 đãFAIL bằng API/DB CODrefund nhưng chưa toàn bộ UI và nhánhonline; X22/X25 thiếumôi trường; N03/N04 phụ thuộc workflow hoàn về hiện không có. Subcase tự động/lỗi chặn vẫn được giữ trongledger; không giả là chưa làm gì hoặc đãPASS. File máy đọc: `walkthrough-gaps.json`.

Ảnh C08 chỉ dùng minh họa trước/sau có ý nghĩa; chưa seed ảnh chụp hàng thật hoặc đánh giá chất lượng nhận diện với người dùng. USER_VALIDATION_PENDING cho toàn bộ bộ bài [nghiên cứu người thật](user-validation-tasks.md), chưa có tỷ lệ thành công/thời gian hoặc kiểm chứng tác động UX-20. Các PASS của keyboard/dialog/semanticstatus/CTA giới hạn đúng mẫu đã chạy, không chứng nhận toàn bộ WCAG.

Để mở lại phần còn chặn: cung cấp adapter/capture kiểm thử được kiểm soát, môi trường zoom/screenreader/thiết bị phù hợp và quyết định chính sách. Sau sửa cácP1/P2, chạy lại sáu chuỗi trên đúng đối tượng, cả ba vai trò và hậu điều kiện đơn–tiền–tồn–voucher–report. Không cần provider tiền thật, phí sàn, ví, hoa hồng, ERP hoặc tích hợp hãng vận chuyển để nghiệm thu phạm vi này.

## Tính toàn vẹn bằng chứng

- `acceptance-results.json` lần đầu bật WEB_TEST_API_MODE=fixture trong khi Vite live: 106 pass/4 skip/2 fail do mode/selector test. `store-application-rerun.json` chạy đúng mode cho 3 pass/2 skip; manifest ưu tiên kết quả mới của cùng file+title, không cộng hai lần. Ca nhắn tin thật bị skip vì không bật ghi message vào tài khoản demo.
- `walkthrough-results.json` lần đầu có fixture return thiếu amount/updated_at và selector search sai. Sửa **script kiểm thử**, chạy lại thành `walkthrough-v2-results.json`; hai lỗi thiết lập không được đưa thành bug sản phẩm.
- `live-attempt-1.json` nhầm COD PENDING vẫn giữ reservation; `live-attempt-2.json` chờ reserved=0 nhưng chưa chờ worker restock quantity; `live-attempt-3.json` chọn owner theo vị trí mảng đơn. Đã sửa cách kiểm, tiếp tục bằng đúng order.store_id và dữ liệu cùng tag. Các lỗi harness này không phải bug ứng dụng.
- Chuỗi kỹ thuật gọi API trước để chuẩn bị/tái hiện; không được ghi thành UI-first walkthrough. 12 ID browser đi từ login/menu, đối chiếu mã/DB sau điểm vướng. Bằng chứng loại này được tách trong CSV.
- Không ghi token/password thật hoặc thông tin cá nhân thực vào artifact. Các tên/contact/địa chỉ đều tổng hợp cho kiểm thử. Không đo hoặc bịa tỷ lệ thành công, thời gian hoàn tất hay tần suất; có đo thao tác cụ thể thì giữ file riêng.

## Điều kiện kết luận

Hồ sơ đã phản ánh đủ158ID,325ý nguồn và sáu chuỗi có checkpoint hoặc điểm dừng. Mọi ID có kết quả cùng bằng chứng hoặc giới hạn; lịch sử không bị reset. **Không kết luận mọi nhánh đã thực thi hoặc các công việc thiết yếu đã đạt.** Các phần BLOCKED/POLICY_GAP và chín walkthrough còn thiếu được nêu cụ thể để tiếp tục khi có điều kiện.

**Sản phẩm chưa sẵn sàng vận hành** do còn FAIL/POLICY_GAP ở công việc thiết yếu. Không có thay đổi nghiệp vụ, contract, triển khai, gửi thư thật hoặc chuyển tiền thật trong các lượt review. Tập239path nguồn phải giữ hash baseline; validator kiểm catalog/mapping/ledger/cleanup và quét secret trong bằng chứng. Điều này không chứng minh mọi file backend image hoặc mọi tổ hợp cạnh tranh đều được kiểm.
