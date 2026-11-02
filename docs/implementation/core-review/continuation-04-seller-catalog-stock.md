# Lượt 04 — mở Store, catalog và vận hành kho Seller

Thực hiện 29–30/10/2026, chốt báo cáo ngày 30/10/2026. Tiếp tục baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree chưa commit. SELLER là nhân viên; STORE_OWNER là chủ Store, membership tương ứng OWNER. Chỉ thêm tài liệu và script kiểm thử, không sửa ứng dụng, contract hoặc triển khai.

## Kết quả và giới hạn

Thêm **22 ID**: S01–S12 và S14–S23. S13/S24 đã có kết quả ở lượt trước, không cộng lại. Đi từ menu/tác vụ phù hợp ở **1440px/390px**, chụp điểm dừng và đối chiếu sau; thêm 768/1024px cho editor 12 variant. Tám ca mở Store, tám ca vận hành và hai ca nhân viên kho dùng UI/API thật; phần còn lại dùng HTTP fixture có trạng thái và đối chiếu mã/HTTP thật phù hợp.

**70 lượt browser hiện hành: 48 assertion qua, 22 lỗi**, sau ghép chạy lại theo file/title/project. Cùng ID có thể có bài chính, vòng tránh, vai trò hoặc viewport khác; không tăng số nhiệm vụ theo số lượt. 22 assertion lỗi không phải 22 bug. Script kiểm trạng thái đúng giữ kết quả đỏ khi thiếu dữ liệu/chức năng; không đổi kỳ vọng để làm xanh.

Lượt này có **12 PASS, 7 FRICTION, 2 FAIL, 1 POLICY_GAP** ở cấp nhiệm vụ. Tích lũy **99 ID đi UI / 252 lượt browser**, 152 assertion qua/100 lỗi. Toàn catalog 158 ID: **38 PASS, 33 FRICTION, 27 FAIL, 8 BLOCKED, 3 POLICY_GAP, 49 NOT_RUN**. PASS giới hạn theo dữ liệu và loại bằng chứng ghi tại [coverage](scenario-coverage.md), không phải nghiên cứu với người thật. `USER_VALIDATION_PENDING`.

Bộ acceptance cũ 109 qua/3 skip, 108 ca qua có mapping ID và 23 ca chứng minh bug trước đây vẫn là tập riêng. Không chạy lại toàn bộ khi nguồn không đổi; không cộng chúng thành nhiệm vụ mới.

## Phát hiện ưu tiên

| ID | Mức | Bằng chứng mới | Tác động và hướng tối thiểu |
|---|---|---|---|
| **CR-025** | **P1, CONFIRMED** | Owner Store300 thấy variant chỉ UUID ở ngay trang kho1; đọc lại API sau walkthrough xác nhận SKU của product thuộc metadata page2. Nhân viên chỉ có inventory.store.read_adjust cũng thấy UUID ở dòng đầu. Cả hai viewport, UI/API thật | Không nhận ra món để điều chỉnh/nhập đúng; nhân viên kho không nên cần quyền sửa sản phẩm. Cung cấp metadata nhận diện trong scope inventory của các dòng đang tải, không mở quyền catalog để chữa tạm |
| **CR-023** | P2, CONFIRMED | Form tạo chặn giá100500 bằng native stepMismatch, không có POST; API/DB thật nhận giá100500 và giữ SKU bắt đầu00. Fixture tạo nháp100000 rồi editor sửa100500 thành công | Form tạo hẹp hơn hợp đồng VND nguyên và editor; bỏ ràng buộc bội1000 không có căn cứ, giữ kiểm số nguyên/min/max thống nhất |
| **CR-024** | P2, CONFIRMED | Nhập+5 thật: quantity12→17, API đã có movement; bảng lịch sử đang mở không có dòng mới. Reload thấy đúng. Cả hai viewport, lần cộng đã bù | Người nhập không đối chiếu được ngay thao tác vừa lưu; làm mới cả inventory và movement sau mutation, giữ operation_id khi chưa rõ kết quả |
| **UX-15** | P2, thiếu thông tin vận hành, CONFIRMED | Admin ẩn có lý do thật trong m1_audit; Seller payload và dialog chỉ có HIDDEN, không có lý do/đường khắc phục | S17 FAIL mục tiêu hiểu việc phải sửa; cung cấp quyết định/lý do phù hợp Store của mình, không công khai raw audit hoặc dữ liệu Store khác |

Chưa chứng minh ghi sai SKU, điều chỉnh nhầm tồn, mất movement hoặc vượt quyền backend. P1 của CR-025 dựa công việc kho thiết yếu bị chặn bằng thiếu nhận diện, không dựa suy đoán đã phát sinh sai tiền/tồn. Tần suất chưa đo. Các biểu hiện tìm SKU, mất draft và tự tính delta nối UX-10/UX-05/UX-11 cũ, không tạo thêm ID bug trùng.

## Đi từng công việc

### Bắt đầu bán — S01–S06

- S01: Customer mới đi Hồ sơ → Đăng ký mở gian hàng → nhập tên/contact → gửi; notice và lịch sử PENDING khớp GET thật, chưa tự có Owner.
- S02: PENDING hiện “Chờ duyệt”; gửi thêm nhận409 DUPLICATE_APPLICATION, vẫn một hồ sơ. Có thể cải thiện form ngăn gửi trùng nhưng chưa có dữ liệu bị nhân đôi; không đặt SLA duyệt mới.
- S03: Đọc lý do từ chối, nhập bổ sung và gửi hồ sơ mới; lịch sử thật giữ cả PENDING và REJECTED, không yêu cầu sửa đè hồ sơ cũ.
- S04: Admin duyệt sau khi Customer đã mở trang. Trang/cookie chưa tự làm UI có Owner; reload chủ động thì thấy “Đã duyệt”, roles STORE_OWNER và membership OWNER, vào Store Portal được. FRICTION vì thiếu chỉ dẫn kiểm tra lại/tiếp tục, không bị bắt buộc logout. Không gộp với CR-016 refresh trả context mới nhưng React giữ identity cũ.
- S05: UI sửa name/fee bằng expected_version rồi reload đúng. API thật đổi fee0→27500: quote mới dùng27500, order đã chốt giữ0; đã khôi phục. Không yêu cầu thêm phí sàn hoặc mô hình vận chuyển.
- S06: Nhân viên có quyền product thấy catalog rỗng được giải thích, nhưng link kho không xuất hiện và không có lời giải thích ngay tại chỗ tìm. FRICTION UX-12; nhận định mức khó hiểu cần người thật xác nhận, không kết luận server chặn quyền hợp lệ. S23 kiểm riêng người được cấp quyền kho thực sự.

### Catalog — S07–S18

- S07/S08: Tạo sản phẩm đơn giản DRAFT; lỗi SKU giữ tên/giá, sửa rồi lưu; rời qua Tổng quan, quay lại/lọc nháp và mở editor vẫn đúng. Nháp đã lưu khác dữ liệu chưa lưu ở S18. API/DB thật xác nhận một sản phẩm riêng được tạo, SKU giữ số0 đầu.
- S09: Một tổ hợp đầu rồi thêm11 lần qua form, chọn Màu/Size, reload đủ3màu×4size không trùng. Chấm PASS vì công việc làm được bằng cơ chế hiện có; không biến thiếu bulk/matrix thành FAIL. Các ca 768/1024 giữ12fieldset, giá trị đầu/cuối đúng, document không rộng hơn viewport và CTA nhận pointer. Đây là Edge, chưa phải touch/bàn phím ảo vật lý.
- S10: Giá100500 bị chặn ở form tạo dù backend và editor nhận. Vòng tránh tạo nháp giá tròn rồi sửa giá chính xác: FRICTION CR-023; không nói mọi thao tác nhập giá hỏng hoặc SKU bị mất số0.
- S11: Thêm2URL ảnh, đổi thứ tự bằng expected_image_ids/image_ids, bỏ đúng ảnh và reload còn thứ tự đúng ở hai viewport fixture. URL trả ảnh kỹ thuật có kiểm soát; chưa upload file, nghiệm thu provider ảnh hoặc ảnh nhận diện sản phẩm. C08 vẫn NOT_RUN.
- S12: DRAFT/kho0 → nhập5 → mở bán → catalog/detail/cart/quote có thể xác nhận ở UI fixture. HTTP thật từ Customer riêng tạo order2món với variant ACTIVE/VISIBLE+tồn12, order AWAITING_PAYMENT và reserved2. Không tạo payment attempt; chưa chuyển tiền, order đã hủy. Không dùng đây thay C39–C41/provider thanh toán.
- S14: Search SKU009264 trả rỗng vì chỉ so title; xóa search và mở Chi tiết đọc SKU đúng được. Ngoài trang đầu cần dò thêm như S13: FRICTION UX-10, không gọi tất cả cách tìm đều bị chặn.
- S15: Sửa giá dòng6 trong12 giữ11 dòng khác rồi reload. HTTP thật sửa giá cùng variant100500→175500, order trước đó vẫn unit100500; không làm lại lịch sử giá đơn. Giá đã khôi phục.
- S16: Dừng/mở cùng ID với version4→5→6; bài liên thông quay Customer catalog không thấy món STOPPED và thấy đúng ID khi ACTIVE. UI không cho tự mở món HIDDEN, public API thật trả404 ở S17; không dùng status bán để vượt kiểm duyệt.
- S17: Thấy “Đang bị ẩn” nhưng không đọc được lý do đã lưu thật hoặc biết bước khắc phục trong dialog. FAIL UX-15; không phải phát hiện Seller tự bỏ ẩn.
- S18: Sửa tên chưa lưu → quay danh sách không cảnh báo → mở lại tên cũ. Đã chờ route ổn định để tránh đọc DOM cũ thành PASS giả. FRICTION UX-05; hướng tối thiểu là cảnh báo/lựa chọn rời, không mặc định mọi form phải tự lưu.

### Kho — S19–S23

- S19: Nhập+5 có reason và actor/opID thật, số tồn đổi; API có movement nhưng UI lịch sử cũ tới reload. FRICTION CR-024. Phần lịch sử thiếu actor/delta_reserved trong payload đã có OP-02, không tạo bug trùng hoặc nói movement DB mất.
- S20: Kiểm kê12còn9 đòi tự tính-3; kết quả số lượng/khả dụng đúng. API thật kiểm17→14 khi đang giữ2. FRICTION UX-11, không yêu cầu nhà cung cấp, giá vốn hoặc sửa/xóa lịch sử.
- S21: Loại2hỏng ghi-2 có lý do, giảm dưới lượng giữ bị409 và không đổi số hợp lệ. Không dùng điều chỉnh này để giả một luồng hàng hoàn về tự bán lại.
- S22: Ba cột12/2/10 đúng phép tính. Tuy nhiên quantity của COD bị trừ trước bàn giao như CH06; chưa chốt nhãn/nghĩa tồn vật lý đối với số thương mại để kiểm kê. POLICY_GAP POL-06; không tự đổi mốc consume hoặc tuyên bố DB tính sai.
- S23: Owner300 món gặp UUID tại kho ngay trang1, không phải chỉ “kho trang15”. Sau điểm dừng UI, API mới được dùng để đối chiếu variant tồn tại và tên/SKU ở metadata page2. Nhân viên quyền kho độc lập không tải tên product do query bị tắt, cũng không nhận ra dòng cần chỉnh. FAIL CR-025; không lấy hiểu biết DB làm đường thao tác của Seller.

## API/database/worker và dữ liệu cùng đối tượng

Xem [seller-round4-http.json](../../../artifacts/core-review/operational/seller-round4-http.json). Store mới của S04 desktop, product `b33974fa-6d61-48d5-b588-86dc84e8d65b`, variant `014496c4-d490-4c00-9982-001d8a53d857`, order `2f707b10-502c-44a4-8952-69546c4350ad` xuyên các checkpoint sau:

| Checkpoint | Hậu điều kiện |
|---|---|
| Tạo DRAFT | Giá100500 và SKU00... được API nhận/DB giữ |
| Nhập12/mở bán | Customer độc lập đọc public và đặt2, order AWAITING_PAYMENT, quantity12/reserved2 |
| Đổi phí | Quote mới shipping27500, order trước giữshipping0 |
| Đổi giá | Product175500, order cùngvariant vẫn unit100500 |
| Điều chỉnh khi giữ2 | +5:12→17; -3:17→14; -2:14→12; -11 xuống1 bị409, vẫn giữ2 |
| Lịch sử | Mỗi adjustment có actor, reason, operation_id trong DB; không xóa dòng cũ |
| Moderation | Lý do Admin có trong audit, Seller projection không có; public404 |
| Hủy/khôi phục | Order CANCELLED, reserved0, fee/name và giá khôi phục; product STOPPED/HIDDEN |

Các đoạn HTTP này không phải một hành trình UI xuyên hệ thống hoàn chỉnh và không nâng cả sáu chuỗi CH01–CH06 lên PASS. Không có payment/provider attempt thật.

## Baseline, gián đoạn và thu hồi

Lượt bắt đầu29/10; lệnh Edge bổ sung chưa chạy khi cơ chế duyệt tự động hết hạn mức xét duyệt. Khi tiếp tục30/10, Docker Desktop/frontend đã dừng; khởi động lại Docker và Vite3109, dùng lại volume/project `pbl6-fe-verify`. Không rebuild hay triển khai. Lệnh Edge được xét duyệt thành công rồi mới chạy; không né chặn bằng quyền thấp hơn. [Runtime đã lọc](../../../artifacts/core-review/operational/seller-round4-runtime.json) chỉ ghi tên/image/trạng thái, không dump biến môi trường.

Giữ lịch sử mọi lần chạy trong CSV. Lỗi harness đã sửa gồm: chờ điều hướng S18 quá sớm làm mobile PASS giả, kỳ vọng UUID ở trang kho còn được gắn tên S23, và đoán email nhân viên theo tag cha trong khi helper tạo bằng tag khác. Hai lần login sai là lỗi setup, không tạo finding auth; finally đã khôi phục permissions cả ở lần đó. Chạy lại bằng email đọc theo UUID fixture cho ra lỗi nhận diện kho thật.

Quét artifact mở rộng sang Markdown phát hiện hai error-context của lần login sai có chứa giá trị mật khẩu test do Playwright chụp input. Đã thay giá trị bằng `[REDACTED_TEST_CREDENTIAL]`, ghi đường file/lý do trong `artifact-redactions.json`, không giữ giá trị trong log redaction. Lượt quét lại JSON/log/Markdown/CSV không còn SEED_PASSWORD/JWT thật. Validator xác nhận793hàng ledger,158aggregate/325mapping và239path source không đổi. Đây là sửa an toàn hồ sơ bằng chứng, không phải bug marketplace.

Tag lượt04 `op-review-1793270292507`. Chuẩn bị8 Customer riêng cho S01–S04 theo viewport, taxonomy riêng, hai Store mới được duyệt; Store300 của tag cũ chỉ đọc ở ca Owner S23. Nhân viên cũ là fixture riêng, tạm đổi quyền rồi phục hồi trong finally.

[Cleanup cuối](../../../artifacts/core-review/operational/seller-round4-cleanup.json) xác nhận: hai Store mới LOCKED; product STOPPED/HIDDEN; **0 product mới ACTIVE**; type riêng INACTIVE; order chưa trả CANCELLED; reserved0; hai lần UI+5 đã bù-5, sau đó bù-12 để thu hồi tồn seed về0. Sáu hồ sơ test còn pending được Admin từ chối với lý do thu hồi test; lịch sử8 REJECTED/2 APPROVED còn giữ. Name/fee đúng giá trị gốc; permissions nhân viên về product.store.read_write. Không xóa user, audit, order hoặc movement, không sửa Store/nhân viên demo.

## Phần tiếp theo

Còn49 NOT_RUN: các nhiệm vụ Seller nhận/xử lý đơn–COD–sau bán–voucher–staff–báo cáo chưa đi đủ, Admin, C08 ảnh có nghĩa và X19–X30 phù hợp. Coverage liệt kê từng ID; không tự kế thừa PASS từ test thành phần. Tám BLOCKED email/payment/thiết bị vẫn giữ. Ba POLICY_GAP hiện là C49 phục hồi lượt voucher, C52 gửi trả/phí/địa chỉ và S22 nghĩa tồn vật lý/thương mại. Review toàn158 và nghiên cứu người thật vẫn chưa hoàn tất; sản phẩm chưa sẵn sàng vận hành.
