# Phát hiện vận hành sau điều chỉnh phạm vi

Baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cùng working tree chưa commit. Đây là đánh giá chuyên gia, **USER_VALIDATION_PENDING**. Chỉ review, chưa sửa ứng dụng. SELLER là nhân viên; STORE_OWNER là chủ Store. Không có phát hiện P0 mới.

**Cập nhật lượt 02:** [31 mục tiêu Customer và bằng chứng](continuation-02-customer.md). Thêm CR-020 (giỏ tự chọn lại Store từng bỏ), CR-021 (tìm không dấu), UX-13 (gộp nguồn giảm giá), UX-14 (mất kết quả sau reload). CR-001/UX-01 được xác minh lại bằng UI và DB thật trên desktop/mobile. Các quan sát có đường vòng được chấm FRICTION; không đếm mỗi assertion đỏ thành bug mới.

Bằng chứng mới đặt tại [artifacts operational](../../../artifacts/core-review/operational/). `walkthrough-v2-results.json` và `real-ui-results.json` là assertion mong đợi hành vi đúng, nên lỗi thiếu khả năng sẽ làm test đỏ. `bug-proof-results.json` chứng minh hành vi lỗi hiện tại; xanh không đồng nghĩa sản phẩm đạt. [Coverage từng ID](scenario-coverage.md) và [ledger từng lần chạy](scenario-results.csv) là nguồn kết quả, không dùng số ảnh/assertion thay số nhiệm vụ.

**Cập nhật lượt 03:** [34 ID xác thực/sau mua/phục hồi](continuation-03-auth-aftersales.md). CR-016 P1 có hai tab thật; CR-015 nâng CONFIRMED sau hide thật; thêm CR-022 P2 đơn giá checkout cũ dù tổng mới. C45/C46/C47 mở rộng UX-12/UX-03/UX-07 và OP-03 đã có, không đếm thành lỗi mới. X03/X06 mất draft chưa gửi là UX-05; attempt chưa rõ kết quả X10 giữ body/key đúng.

**Cập nhật lượt 04 (30/10):** [22 nhiệm vụ Seller/catalog/kho](continuation-04-seller-catalog-stock.md). Thêm CR-025 P1, CR-023/024 P2 và UX-15 P2; các ca tìm SKU/mất draft/tính delta nối finding cũ. S06 thiếu chỉ dẫn quyền là giả thuyết về mức hiểu cần nghiên cứu người thật, không phải lỗi permission backend. S22 thêm POLICY_GAP POL-06 về nghĩa tồn vật lý/thương mại.

**Cập nhật lượt05:** [15ID Seller về đơn/COD/điềuhành](continuation-05-seller-orders-operations.md), trong đó14ID trướcNOT_RUN. S31/S34/S38 nối UX-03/UX-12/CR-013; không tạo IDbug trùng. S36 vẫnFAIL CODrefund dù nhánhgửiđổi/guardkhôngfakehoàn qua; S39BLOCKED delivery. S42 thêmPOL-07 về kỳthu/hoàn, sốthực hiện khớpSQL theo cohortđơn hiện tại.

**Kết quả hiện hành lượt06–07:** [Admin](continuation-06-admin.md) và [ảnh/bàn phím/nội dung](continuation-07-accessibility-content.md). Đủ158ID có kết quả/giới hạn,54PASS/51FRICTION/38FAIL/10BLOCKED/5POLICY_GAP;0NOT_RUN không có nghĩa mọi nhánh đã chạy. ThêmUX-16/17/18/19/20,OP-05 và CR-026/027; tái xác minhCR-005/017. Không thêmP0/P1 ở hai lượt này. Danh sách ưu tiên và giới hạn cuối ở [readiness](operational-readiness.md).

## Các điểm cần xử lý trước vận hành

| ID | Ưu tiên | Loại finding | Nhiệm vụ | Kết luận và bằng chứng |
|---|---|---|---|---|
| OP-01 | P1 | Thiếu khả năng vận hành, CONFIRMED | N01–N04, CH04 | Không có đường ghi giao thất bại/từ chối nhận và tiếp nhận hoàn về từ đơn đang SHIPPED. UI hai viewport; contract/service; đơn thật SHIPPED trả `409 RETURN_NOT_ELIGIBLE` khi thử luồng trả hàng hiện có. Chưa chứng minh sai tiền/tồn đã phát sinh. |
| UX-03 (giữ ID cũ) | P1 | Bug thiếu dữ liệu thiết yếu, CONFIRMED lại | S27/S28/S31, CH01 | Phiếu xử lý có tên món/lượng nhưng thiếu màu/size và người nhận/điện thoại/địa chỉ. Không đủ để lấy và giao đúng hàng bằng quy trình thủ công. |
| CR-006 (giữ ID cũ) | P1 | Bug luồng hoàn tiền, CONFIRMED lại | C53/S36, CH05 | COD refund được nhận, đi tới RECEIVED; hoàn tất trả `409 REFUND_NOT_CONFIRMED`, không có refund row. Không có đường thu hồi khoản COD bằng adapter hiện tại. |
| OP-02 | P1 | Thiếu khả năng đối chiếu tồn đã chốt, CONFIRMED | S24/N06, CH06 | DB có delta_reserved/actor nhưng API lịch sử chỉ trả delta_quantity/reason/time/order_id; UI không thể giải thích biến động giữ theo kỳ. P1 áp cho công việc đối chiếu thiết yếu bị chặn, không phải kết luận tồn DB sai. |
| OP-03 | P2 | Thiếu thông tin vận hành, CONFIRMED | N05 | DB có order_status_history nhưng mapper/order UI không đưa timeline/time/actor ra. Các vai trò phải suy đoán bước trước đó. |
| OP-04 | P2 | Thiếu khả năng truy vết cho Owner, CONFIRMED | N08 | Owner không có đường nhật ký nhân viên theo Store. Nhật ký quản trị hiện có không phải công cụ Store và không được mở quyền raw audit để chữa tạm. |
| UX-06 (giữ ID cũ) | P2 | Vướng mắc usability, CONFIRMED lại | C43 | Lịch sử thiếu món/ngày/Store để nhận ra đơn cùng tiền; walkthrough hai viewport. |
| UX-10 (giữ ID cũ) | P2 | Vướng mắc usability, CONFIRMED lại | S13/S25 | Tìm chỉ trong trang, hàng đợi đơn không có bộ lọc. Dữ liệu thật 300 sản phẩm/100 đơn vẫn dò trang được, nên kết quả nhiệm vụ là FRICTION. |
| UX-11 (giữ ID cũ) | P2 | Vướng mắc usability, CONFIRMED lại | S20/N07 | Điều chỉnh bù làm được; người dùng vẫn phải tự quy đổi số đếm thành delta có dấu. Không yêu cầu ERP hoặc sửa/xóa lịch sử cũ. |
| CR-020 | P2 | Bug trạng thái, CONFIRMED | C34/C23/C36 | Quay lại giỏ tự chọn Store B đã bỏ; quote sau từ một thành hai dòng. Có thể sửa trước confirm; chưa đặt sai đơn thật. |
| CR-021 | P2 | Thiếu hỗ trợ tìm kiếm tiếng Việt đã giữ, CONFIRMED | C01 | API thật có dấu thấy món, không dấu trả 0; nhập lại có dấu là đường vòng. |
| UX-13 | P2 | Vướng mắc usability, CONFIRMED | C28 | Quote tách giảm Store/sàn nhưng UI cộng một dòng; tổng đúng, khách phải nhớ/tính nguồn giảm. |
| UX-14 | P2 | Vướng mắc phục hồi, CONFIRMED | C37 | Reload mất màn kết quả thành công; đi menu/lịch sử tìm lại được, không phát lại POST. |
| CR-016 | P1 | Bug lẫn context, CONFIRMED bằng hai tab thật | X17 | Tab cũ đọc địa chỉ B nhưng còn UI Owner A sau refresh; token/quyền backend vẫn được kiểm. |
| CR-015 | P2 | Bug chặn sửa review sở hữu, CONFIRMED lifecycle thật | C54 | Sau hide/reload không có entry sửa, gửi lại 409; sửa bản VISIBLE vẫn qua. |
| CR-022 | P2 | Bug dữ liệu hiển thị, CONFIRMED UI/API thật | X13 | Tổng 110.000đ nhưng dòng giá 100.000đ sau QUOTE_CHANGED; reload khôi phục. |
| UX-12 (giữ ID cũ) | P2 | Thiếu chỉ dẫn bước tiếp, CONFIRMED lại | C45/C50/S04/S06/S32/S34/S40 | Customer cần biết đang chờ ai/giới hạn; duyệt Store cần reload chủ động. Mức khó hiểu của menu ẩn theo quyền ở S06 cần người thật xác nhận. |
| CR-025 | P1 | Bug thiếu nhận diện hàng thiết yếu, CONFIRMED UI/API thật | S23 | Nhân viên kho độc lập và Owner catalog300 thấy UUID thay tên/SKU; chưa ghi nhầm tồn. |
| CR-023 | P2 | Bug validation, CONFIRMED UI/API thật | S10 | Giá100500 bị step1000 chặn trước POST; API/editor nhận; có vòng tránh nháp rồi sửa. |
| CR-024 | P2 | Bug đồng bộ view, CONFIRMED UI/API thật | S19 | Nhập+5 đã ghi DB nhưng lịch sử chưa cập nhật tới reload; không mất movement. |
| UX-15 | P2 | Thiếu thông tin vận hành, CONFIRMED | S17 | Lý do Admin ẩn có trong audit nhưng Seller payload/UI không có để hiểu hướng khắc phục. |

Không cộng các biểu hiện cùng nguyên nhân thành bug mới. S27/S28 dùng UX-03; C43 dùng UX-06; tìm và hàng đợi dùng UX-10; việc sửa điều chỉnh nhầm dùng UX-11. Các phát hiện CR còn lại giữ tại [báo cáo kỹ thuật](findings.md), UX đầy đủ ở [báo cáo thao tác trước](user-workflow-review.md); không mặc định mọi mục cũ đã xác minh toàn bộ trên baseline này.

## OP-01 — Đơn đang giao không có đường hoàn về

- **Tiền điều kiện:** đơn COD đã qua CONFIRMED → PROCESSING → SHIPPED; khách từ chối nhận, chưa có tiền thu. Đối tượng thật: `live-review.json → ids.failed_delivery_order`, Store thứ hai của tag `op-review-1793261067285`.
- **Tái hiện UI:** đăng nhập STORE_OWNER → Menu tài khoản → Store Portal → Đơn hàng Store → xem đơn SHIPPED → tìm hành động/hướng dẫn ghi giao thất bại hoặc tiếp nhận hoàn về. Không xác nhận thu COD để ép kết thúc.
- **Expected:** ghi được vấn đề và biết ai làm bước tiếp; liên kết đơn/variant/lượng/tình trạng khi nhận về; không mặc định bán lại hàng chưa kiểm; COD chưa thu không phát sinh hoàn tiền.
- **Actual:** modal chỉ có bước COMPLETED (bị khóa khi chưa thu COD), xác nhận thu COD, đọc lại và đóng. Luồng return hiện có yêu cầu đơn COMPLETED; request thật trên SHIPPED trả `RETURN_NOT_ELIGIBLE`. N02 kiểm màn nhận trả hiện có: chỉ có phản hồi và nút đã nhận, chưa có quy trình RTS được nối với đơn đang giao.
- **Bằng chứng:** `walkthrough-v2-results.json` N01/N02, ảnh `walkthrough-v2-screenshots/**/checkpoint.png`; `live-review.json → journeys.CH04` ghi SHIPPED, payment PENDING, collected=0/refunded=0 và mã 409. Đã xem trực tiếp ảnh N01 desktop và N02 mobile. Textarea phản hồi có thể ghi chú kiểm hàng thủ công, nhưng chưa chứng minh một quy trình RTS hoàn chỉnh; không kết luận thiếu field riêng tự nó là bug.
- **Mã:** [đích chuyển trạng thái](../../../backend/commerce-service/src/order/order.service.ts:755), [hành động UI](../../../frontend/src/live/SellerWorkspace.tsx:595), [nhận hàng trả](../../../frontend/src/features/returns/ReturnsPage.tsx:41). Không tìm thấy contract RTS tương ứng trong registry hiện tại.
- **Tác động:** đơn ngoài đời không giao được nhưng người vận hành không thể hoàn tất xử lý hàng/tiền đúng trong sản phẩm. Không thử ghi COMPLETED giả hoặc thu tiền giả.
- **Hướng sửa tối thiểu:** chủ sản phẩm chốt xử lý thất bại/nhận lại và phí; cung cấp đường ghi nhận có dấu vết, kiểm hàng rồi điều chỉnh tồn/tiền theo trạng thái riêng, kèm hướng dẫn thủ công nếu đó là phương án được chấp nhận. Đây là đề xuất review, không tự thêm enum/API.
- **Nghiệm thu hồi quy:** đơn COD chưa thu và online đã thu; nguyên/thiếu/hỏng; nhận lại/lệnh lặp; hai người cùng xử lý; đối chiếu physical/reserved/collected/refunded trước–sau và cả ba vai trò. Không áp số lần giao theo Shopee.

## OP-02 — Lịch sử không đủ để đối chiếu giữ hàng

- **Tiền điều kiện:** tồn đầu 250; online chờ trả giữ 1; có điều chỉnh nhầm +5 rồi bù −5; hủy/nhả; thêm chuỗi COD consume rồi hủy/restock. Các đối tượng dùng xuyên CH06/CH02.
- **Tái hiện:** Owner → Tồn kho → đọc số đang giữ → Lịch sử biến động kho → giải thích tại sao reserved tăng/giảm và ai điều chỉnh. Lặp trên UI thật với dữ liệu đã seed.
- **Expected:** đối chiếu riêng physical/commercial quantity và reservation, có đủ mốc đầu/cuối/biến động, nguồn và người; không suy ra mọi dòng delta_quantity=0 là không thay đổi.
- **Actual:** dòng reserve có delta_quantity=0; delta_reserved và actor nằm trong DB nhưng bị bỏ ở query/mapper/contract. Không có lọc kỳ/số đầu-cuối giúp người được quyền kho thực hiện nhiệm vụ N06. API/DB có thể đối chiếu bằng script review nhưng Owner không có đường đó trong sản phẩm.
- **Mã:** [query lịch sử](../../../backend/catalog-service/src/inventory/inventory.repository.ts:117), [mapper](../../../backend/catalog-service/src/inventory/inventory.mapper.ts:45), [bảng UI](../../../frontend/src/live/SellerWorkspace.tsx:296).
- **Bằng chứng:** `live-review.json → trace` so keys API/DB và `journeys.CH06` chứa từng movement; N06 fixture và S24 UI thật đều thiếu cột cần thiết. Hai sổ của script cộng khớp; **không phát hiện sai tổng DB ở chuỗi đã chạy**.
- **Tác động:** không giải thích được tồn/giữ theo kỳ chỉ bằng công cụ Store; kiểm kê dễ hiểu sai phần đã consume nhưng chưa giao ngoài đời.
- **Hướng sửa tối thiểu:** chốt nghĩa của quantity và mốc consume; cung cấp ledger có delta_reserved, actor phù hợp quyền, nguồn và đủ mốc đối chiếu kỳ. Có thể cho xuất/phân trang phù hợp nếu không cần dashboard mới; không yêu cầu giá vốn/ERP.
- **Nghiệm thu:** initial + adjustment + reserve + release + consume + restock; bản ghi trùng/version; bù giữ nguyên lịch sử. Tổng quantity/reserved khớp snapshot, actor chỉ thuộc đúng Store.

## OP-03 — Thiếu diễn biến đơn để giải thích đang chờ ai

- **Tái hiện:** Owner xem đơn SHIPPED; Customer/Admin xem cùng mã và cần giải thích thời điểm qua từng bước. DB đã có các mốc PREPARING → PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED.
- **Expected/actual:** xem được lịch sử theo quyền; hiện chỉ thấy current status/version/payment, không thấy các mốc trước. Test N05 thất bại ngay tại điểm đọc diễn biến trong modal; chưa hoàn tất walkthrough riêng Customer/Admin nên phạm vi xác nhận UI mới là Owner.
- **Mã/bằng chứng:** [mapOrderRowToDto](../../../backend/commerce-service/src/order/order.service.ts:105), `live-review.json → journeys.CH01.checkpoints.history`, `walkthrough-v2-results.json` N05.
- **Hướng sửa/nghiệm thu:** timeline có thời điểm nhất quán và bước tiếp dễ hiểu; Customer chỉ xem thông tin được phép, Owner nhận diện nhân viên đúng Store. Test một đơn xuyên ba vai trò, thay timezone và reload; không trả raw audit nhạy cảm.

## OP-04 — Owner không truy được thao tác nhân viên

- **Tái hiện:** Owner → Store Portal → Nhân viên & lời mời → tìm lịch sử đổi giá/tồn/trạng thái/quyền theo người/thời gian. Menu Store không có đường nhật ký; bảng kho cũng không có actor.
- **Expected/actual:** Owner truy được thao tác thuộc Store; công cụ hiện tại chỉ có nhật ký Admin và lịch sử kho rút gọn, chưa đủ N08. Chưa tái hiện mọi loại mutation bằng hai nhân viên thật; không tuyên bố đã kiểm hết scope log hoặc có rò dữ liệu.
- **Mã/bằng chứng:** [merchantLinks](../../../frontend/src/live/LiveApp.tsx:131), N08 desktop/mobile và API keys ở `live-review.json → trace`. Đây là khả năng thiếu trong UI/contract được kiểm, không phải lỗi cho phép vượt quyền.
- **Hướng sửa/nghiệm thu:** Owner có read view được lọc Store/actor/object/time, đủ thay đổi trước/sau theo công việc; nhân viên không được mở quyền platform.admin. Dùng hai Store, nhân viên đủ/thiếu quyền, lọc chéo và link đến đúng đối tượng; che dữ liệu ngoài nhu cầu.

## UX-15 — Seller không biết cần sửa gì khi sản phẩm bị ẩn

- **Loại/mức:** thiếu thông tin vận hành, P2, CONFIRMED; S17 FAIL mục tiêu đọc lý do/biết bước tiếp. Không phải finding vượt quyền.
- **Tiền điều kiện/bước:** Owner mở Sản phẩm Store → badge Đang bị ẩn → Chi tiết; Admin vừa lưu lý do “Ảnh không khớp sản phẩm, cần ảnh mặt trước” trên đúng product riêng.
- **Expected/actual:** Seller cần lý do/quyết định liên quan món của mình và chỉ dẫn phù hợp. Dialog chỉ có STOPPED/HIDDEN; GET ownProduct không chứa lý do, dù m1_audit có lý do thật. Không có đường khắc phục hiển thị tại điểm vướng.
- **Vị trí/bằng chứng:** `frontend/src/features/seller/ProductList.tsx:35`, `backend/catalog-service/src/catalog/catalog.mapper.ts:10`, moderation repository lưu reason tại dòng91. `seller-round4-http.json` check audit/projection và `seller-round4-operations-real-results.json` S17 hai viewport.
- **Tác động:** không đủ thông tin để sửa nguyên nhân ẩn hoặc biết cần nhờ ai; không yêu cầu Seller tự bỏ moderation.
- **Hướng tối thiểu/nghiệm thu:** cung cấp lý do/quyết định phù hợp scope Store cùng hướng liên hệ/sửa, không mở raw audit. Admin ẩn có lý do → Owner/nhân viên đúng quyền đọc đúng lý do → sửa nội dung không tự công khai lại; Store khác không đọc được. Các bước nghiệm thu sau sửa là đề xuất, chưa báo đã chạy.

## Các câu hỏi chính sách cần chủ sản phẩm trả lời

| Mã | Câu hỏi cụ thể | Bằng chứng/ảnh hưởng | Kết quả khi chưa chốt |
|---|---|---|---|
| POL-01 | Sau giao thất bại, ai ghi nhận, ai nhận kiện, điều kiện đóng đơn và có hẹn giao lại không? | N01–N04, CH04 không có đường xử lý hiện tại | Thiếu khả năng hiện tại vẫn FAIL; không lấy policy chưa chốt để xóa finding. |
| POL-02 | Hàng trả gửi về đâu, dùng cách gì, bên nào chịu phí hai chiều; thiếu/hỏng được đưa lại bán khi nào? | C52/S35/N02 | C52 POLICY_GAP; receipt/RTS thiếu là finding riêng. |
| POL-03 | Hủy/hoàn toàn đơn có phục hồi lượt voucher theo khách và tổng không? Áp dụng lúc nào? | `voucher_after_cancel` còn redemption cho đơn CANCELLED; chưa được kết luận sai | Giữ sự kiện quan sát, chưa gán bug do trái policy. |
| POL-04 | Owner và nhân viên được xem danh tính/chi tiết thay đổi nào trong log? | N05/N08, dữ liệu địa chỉ và quyền | Chốt view theo công việc, không mặc định raw audit. |
| POL-05 | Cửa sổ đổi trả, điều kiện từ chối, hết hàng đổi và COD hoàn bằng cách nào? | C51–C53/S35–S36/CR-006 | Chưa dùng hạn mặc định bên thứ ba; COD thiếu adapter vẫn là chặn hiện tại. |
| POL-06 | Quantity trong màn "Trong kho" là tồn vật lý được đếm hay số thương mại đã trừ ngay khi COD vào PENDING? | CH01/CH02 quantity đã giảm trước bàn giao; online chờ trả còn reserved | Cần mô tả/nhãn và quy trình kiểm kê đúng nghĩa; không tự chuyển mốc consume hoặc sửa mô hình kho. |
| POL-07 | “Đã thu/Đã hoàn” theo kỳ là số hiện tại của các đơn tạo trong kỳ hay tiền phát sinh thu/hoàn trong kỳ? Đơn cũ thu/hoàn trong kỳ tính ra sao? | S42 API/SQL/UI khớp theo order.created_at; repository JOINpayment lọc ngày tạođơn, UI chưa giải thích cohort | S42 POLICY_GAP; chọnđịnhnghĩa rồi làmnhãn/đốichiếu phùhợp, không tự sửa thànheventcashflow hoặc kết luậnDBsai tiền. |

Các câu hỏi chưa có người/ngày chốt được chỉ định. Không bịa tần suất, tỷ lệ lỗi hoặc tác động tiền thực tế. Mức ưu tiên dựa hậu quả công việc, tần suất chưa đo.
## UX-16 — Admin thiếu Store và ngữ cảnh đối tượng trước quyết định

**P2 · thiếu khả năng vận hành · CONFIRMED.** A14 dùng hai Store thật, tên món và SKU giống hệt: tìm kiếm ra haiarticle giống nhau, không có Store/ID/link để biết đang xem món bên nào. Payload cóstore_id. A22 fixture yêu cầu đổi trả chỉ có UUIDđơn/status/phản hồi, thiếu Store/khách/ngữ cảnh để hỗ trợ vụ việc. Không phải chứng minh ghi nhầm hoặc truy cập trái quyền; không yêu cầu CRM/phân xử tự động.

Evidence: `admin-round6-live-operations-results.json` A14, `admin-round6-results.json` A22, hai viewport; metadata lưu hai entityStore khác nhau, UI đi trước API. Nguồn: `frontend/src/features/admin/ProductModeration.tsx:27` và `frontend/src/features/returns/ReturnsPage.tsx`. Giải pháp tối thiểu: định danh Store và đối tượng phù hợp quyền, link/chi tiết nguồn cần thiết trước quyết định; không lộ dữ liệu riêng ngoài scope. Nghiệm thu: hai Store cùngtitle/SKU, hai đơn cùngtiền; Admin phân biệt được đúng đối tượng bằngUI, mutation đúngID/version.

## UX-17 — Audit có actor UUID nhưng không có đường nhận diện người

**P2 · thiếu khả năng vận hành · CONFIRMED.** A23 UI thật lọc đúng PRODUCT_HIDDEN/target/time nhưng cột người thực hiện chỉUUID. BảngUsers hiển thịemail, không cóID hoặc link ánh xạ; reviewer chỉ giải ra email bằngAPI sau điểmvướng. Không tính API này thành đường tự phục vụ. Owner đọc auditplatform trả403, không phát hiện lộ dữ liệu.

Mã: `frontend/src/features/admin/AuditLogPage.tsx:19`, UsersManagement trongroutes.tsx. Evidence: A23 `admin-round6-live-operations-results.json` vàguard `admin-round6-cleanup.json`. Hướng sửa: hiển thị nhãn người đáng tin và định danh/link phù hợp quyền, giữ UUID kỹ thuật ở chi tiết; xử lý actor đã xóa/hệ thống và tránh ánh xạ nhầm người. Nghiệm thu actor cùngtên/khácemail, tài khoảnkhóa, page/filter và scopeStore; không công khai rawlog nhạy cảm choOwner để chữa lỗi này. N08 vẫnOP-04 riêng.

## OP-05 — Admin chưa đối chiếu được báo cáo theo Store và kỳ của vụ việc

**P2 · thiếu khả năng vận hành · CONFIRMED.** A24: “Store đang được hỗ trợ có giá trịđơn/thu/hoàn bao nhiêu trong kỳ?” Tổngquan Admin chỉtoànsàn/lifetime, không controlStore/date hoặc đường drilldown nguồn. Bốn số tiền hiện có khớp SQL thật; đây không phải lỗi tính tiền. Store report có phạmvi riêng, không giả Admin có quyền đọcStore bất kỳ.

Evidence: `admin-round6-http.json` SQL/API và A24 UI thật hai viewport. Giải pháp tối thiểu: công cụ đối chiếu phạmvi cần thiết cùngđịnh nghĩa và nguồnđơn/thanh toán; có thể cáchtruy vấn/xuất thích hợp, không bắt dashboardmới, lợi nhuận/phí sàn/ví/payout. ChốtPOL-07 nếu dùngcùngnghĩakỳ thu/hoàn. Nghiệm thu tổngđơn, giảmgiá, phígiao, thu/hoàn táchbiệt; cóđơn cũ/thu mới, Storekhác, timeout/providerUNKNOWN, không gộp tiềnchưathu thànhthu.
## UX-18 — Ảnh chi tiết bị lỗi không có phản hồi rõ

**P3 · vướng mắc usability · CONFIRMED trong fixture.** C08 dùng ảnh áo trước/sau có chi tiết phân biệt. Ảnh thứ ba trả404: vùng ảnh chính có naturalWidth0, không thông báo tải ảnh lỗi hoặc thử lại. Chọn thumbnail ảnh1 phục hồi được; không chặn toàn bộ quyết định mua trong mẫu có ảnh khác. Không yêu cầu mọi sản phẩm phải có zoom hoặc thêm chức năng chưa cam kết.

Mã: [ProductDetail.tsx:159](../../../frontend/src/features/customer/ProductDetail.tsx:159); CatalogCard đã có onError/fallback riêng. Evidence: C08 `access-round7-results.json`, ảnh front/back/broken và metadata hai viewport. Hướng sửa tối thiểu: fallback có ý nghĩa, phân biệt không có ảnh với ảnh tải lỗi và cho chọn lại/thử lại an toàn. Nghiệm thu ảnh1lỗi/ảnh2tốt, tất cả lỗi, URL chậm, chuyển sản phẩm khi đang tải; giữ alt và thumbnail có tên. Fixture minh họa không thay ảnh chụp thực hoặc user study.

## UX-19 — Địa chỉ dài bị cắt tại màn kiểm tra trước đặt

**P2 · vướng mắc usability · CONFIRMED trong fixture.** X27: recipient dài và số nhà/ngõ/tòa nhà/điểm nhận; nhãn option đo1729px, control958px desktop và308px mobile. Ở trạng thái chọn đóng chỉ đọc được đầu chuỗi, không có địa chỉ đầy đủ xuống dòng cạnh đó. Đi Quản lý địa chỉ đọc phần cuối rồiBack được, không mất checkout; FRICTION, không phải đã giao nhầm hoặc không thể chọn địa chỉ.

Mã: [CheckoutPage.tsx:559](../../../frontend/src/features/customer/CheckoutPage.tsx:559) và formatAddress. Evidence: X27 `access-round7-results.json`, `access-round7-responsive-results.json`, long-address-before.png và recovery tới Sổ địa chỉ. Chưa kết luận mọi popup native/tooltip đều mất thông tin. Hướng sửa tối thiểu: hiển thị bản địa chỉ đang chọn đầy đủ, xuống dòng, có tên/phone/phần giao cần thiết để kiểm tra ngay trước đặt. Nghiệm thu hai địa chỉ giống đầu khác phần cuối, tên dài,390/768/1024/1440, quay lại sửa không tự đổi địa chỉ hoặc gửi đơn.

## UX-20 — Focus sau đổi route còn ở khu vực điều hướng cũ

**P3 · vướng mắc định hướng; mức ảnh hưởng cần USER_VALIDATION_PENDING.** X21 quan sát được: Enter tại HeaderGiỏ chuyển sang giỏ, Tab tiếp tới Menu tài khoản. Skip link vẫn hoạt động;5ShiftTab ở390 hoặc7 ởdesktop rồiEnter/Tab đưa vào main, giỏ không mất. Không phải keyboard trap và không tự suy vi phạm WCAG chỉ vì không focus heading.

Mã: [LiveApp.tsx:222](../../../frontend/src/live/LiveApp.tsx:222), MarketplaceHeader skip link. Evidence: `access-round7-rerun-results.json` và recovery bốn viewport. Hướng cải thiện: định hướng focus/tiêu đề phù hợp khi thay nội dung công việc, tránh cướp focus với cập nhật nhỏ hoặc khi người dùng đang nhập. Nghiệm thu điều hướng bằng bàn phím tới route mới/Back/Forward, focus nhìn thấy được, skip link và dialog vẫn đúng; đánh giá thêm với người dùng/screen reader trước tuyên bố hiệu quả.
