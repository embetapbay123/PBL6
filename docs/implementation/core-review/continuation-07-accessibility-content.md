# Lượt 07 — ảnh, bàn phím, focus và nội dung khó

Ngày 30/10/2026. Baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree đã ghi nhận. Chỉ thêm tài liệu và script kiểm tra; không sửa ứng dụng, contract hoặc triển khai.

Đã xử lý 11 ID còn lại: **3 PASS, 5 FRICTION, 2 FAIL, 1 BLOCKED**. Có **46 lượt browser hiện hành: 28 assertion qua, 16 lỗi, 2 skipped**. Lần thử native riêng bị chặn bởi môi trường được lưu ngoài số walkthrough này. Không cộng viewport, đường phục hồi hoặc assertion thành nhiệm vụ mới.

Tích lũy **149 ID có đường đi hoặc điểm dừng UI**, 406 lượt browser hiện hành: 256 assertion qua, 148 lỗi, 2 skipped. Catalog đủ 158 kết luận: **54 PASS, 51 FRICTION, 38 FAIL, 10 BLOCKED, 5 POLICY_GAP, 0 NOT_RUN**. Chín ID chưa có walkthrough đầy đủ được liệt kê riêng ở readiness; số 149 không được đổi thành “158 nhiệm vụ đều đã chạy UI”.

## Kết quả từng nhiệm vụ

| ID | Thao tác và bằng chứng | Kết luận |
|---|---|---|
| C08 | Catalog → chi tiết → ảnh trước có túi/nút → ảnh sau có nhãn MAI → ảnh lỗi → quay ảnh trước. Hai ảnh tải đủ800px, src/thumbnail đổi đúng; đã xem ảnh render | FRICTION UX-18: ảnh lỗi không có hướng dẫn rõ. Đây là minh họa SVG có ý nghĩa, không ảnh chụp hàng thật hoặc nghiên cứu nhận diện với người dùng |
| X19 | Sau điểm bắt đầu catalog đã đăng nhập, chỉ Tab/Enter tới chi tiết, thêm món mặc định, giỏ, checkout COD và kết quả. Đúng một confirm và một order fixture | PASS thao tác bàn phím trong mẫu. Không xóa lỗi hiểu màu/size, không có giao dịch thật |
| X20 | Tab/Enter mở dialog tạo sản phẩm;18Tab và18ShiftTab không ra nền; Escape đóng và trả focus opener; không mutation | PASS ở1440/390/768/1024. Chưa suy mọi dialog hoặc screen reader đều qua |
| X21 | Enter ở link HeaderGiỏ → Tab tiếp vẫn tới Menu tài khoản. ShiftTab5lần trên390 hoặc7lần desktop tới skip link → Enter/Tab vào main, giỏ còn lượng2 | FRICTION UX-20. Đường phục hồi đã đo; ảnh hưởng thực tế cần người dùng xác nhận. Không kết luận tự động vi phạm WCAG vì không focus h1 |
| X23 | GET bị giữ có statusĐang tải; sau release, thêm thành công có status; lần POST503 có alert, chỉ dẫn kiểm giỏ và chặn gửi lặp | PASS DOM/ngữ nghĩa và tương tác hai viewport. Không nghe thông báo bằng screen reader; X22 vẫnBLOCKED |
| X24 | Checkout → quay giỏ giảm2còn1 → quote120000 → kiểm lại trước confirm; không gửi confirm | FAIL UX-01/02: chưa đọc được màuĐỏ/M từ SKU để kiểm đúng món. Có đường sửa không đủ bù thiếu thông tin thiết yếu |
| X26 | Ctrl++ năm lần trong headless không đổi innerWidth/DPR/scale. Thử native settings và headed profile riêng, browser/context đóng trước đo200%; không còn cửa sổ test trong inventory | BLOCKED. Không dùng viewport/CSSzoom hoặc cửa sổ cá nhân thay bằng chứng nativezoom |
| X27 | Tên món dài không tràn trang. Chuỗi địa chỉ rộng1729px nằm trong control958px desktop/308px mobile; sang Quản lý địa chỉ đọc phần cuối rồiBack trở lại checkout được | FRICTION UX-19. Cũng kiểm768/1024; chưa đánh giá mọi nativepopup/tooltip hoặc thiết bị thật |
| X28 | Chi tiết có đủ12button của3màu×4size, nhưng chỉ ghi TS-9264…TS-9275, không thấy Xanh/L | FAIL UX-01; cùng nguyên nhân C09/C12, không tạo bug mới. Lặp lại1440/390/768/1024 |
| X29 | Bảng300món: ở390 sticky che103.125/107.125px của tên ngay scroll0; wheel ngang80px có thể đọc tiếp. Phân trang và editor vẫn hoạt động. AuditAdmin có vùng cuộn focusable, ArrowRight cuộn được | FRICTION CR-017 P2, xác minh lại trên baseline mới. 768/1024/1440 không có overlap ban đầu ở mẫu; chưa thao tác cảm ứng thiết bị thật |
| X30 | Hit-test tâm5CTA catalog/detail/cart/checkout đều trúng nút. Kiểm riêng12card: chat che2571px² vùng giá thẻ phải ở390, cuộn140px đọc tiếp được; desktop không overlap | FRICTION CR-005 P3, không báo CTA không bấm được. Không suy safearea/bàn phímảo đã kiểm |

## Phát hiện và đối chiếu

Không thêm CR hoặc P0/P1 mới trong lượt07. CR-005 và CR-017 chuyển từ NEEDS_REPRO sang CONFIRMED trên baseline hiện tại, giữ đúng mứcP3/P2 và đường phục hồi. Tổng CR vẫn27:0P0,4P1,22P2,1P3. Thêm UX-18P3 về ảnh lỗi, UX-19P2 về xem lại địa chỉ dài và UX-20P3 về định hướng focus khi đổi route. Không cộng biểu hiện X24/X28 thành bản sao lỗi phân loại.

Nguồn sau walkthrough: `ProductDetail.tsx` phần ảnh có src/alt nhưng thiếu onError/fallback, khác với CatalogCard đã có fallback; phần phân loại vẫn render SKU. `CheckoutPage.tsx:559` đặt toàn bộ địa chỉ vào option, không có bản địa chỉ đầy đủ xuống dòng ở trạng thái bình thường. `LiveApp.tsx:222` có main/skiplink nhưng không có cơ chế định hướng focus theo route; `Modal.tsx` giữ focus bằng native dialog và trap Tab.

Skill áp dụng: `frontend-accessibility-review`; reference nội bộ `../../references/current-sources.md` không tồn tại ở vị trí được chỉ dẫn, nên đã đối chiếu nguồn chính thức: [W3C Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [Forms Notifications](https://www.w3.org/WAI/tutorials/forms/notifications/). Đây là cơ sở đánh giá, **không phải chứng nhận toàn bộ WCAG**. Trật tự focus cần giữ được ý nghĩa và thao tác; không lấy một cách quản lý focus duy nhất làm điều kiện tuân thủ.

Đã dùng skill `computer-use` để tìm cửa sổ Edge test cho zoom native. Profile headed tạm đóng trước xác minh; inventory sau đó không có cửa sổ test, nên không gửi phím tới các cửa sổ cá nhân khác. Không có thay đổi cài đặt browser của người dùng. Giới hạn native chính xác ở `zoom-native-probe.json` và `access-round7-native-results.json`.

## Bằng chứng và toàn vẹn

- `access-round7-results.json`, `access-round7-rerun-results.json`, `access-round7-responsive-results.json`, `access-round7-recovery-results.json`, `access-round7-overlay-results.json`: từngrun/project, screenshot và walkthrough.json tại các thư mục cùng tên.
- `access-round7-decisions.json`: kết luận mục tiêu, loại bằng chứng và giới hạn mỗi ID. Ledger giữ lỗi selector X21 ban đầu là INVALID_HARNESS_ATTEMPT; rerun đúng heading vẫn tái hiện focus ngoài main, không che lỗi bằng sửa assertion.
- Lượt07 dùng HTTP fixture, không tạo user/Store/order, không thu/hoàn tiền hoặc gửi tin nhắn thật. Closeout Admin trước đó đã thu hồi toàn bộ object mới đang hiển thị. Giữ nguyên dữ liệu/audit review để truy lại.
- [Coverage](scenario-coverage.md), [ledger](scenario-results.csv), [readiness](operational-readiness.md) là kết quả hiện hành. Các lượt02–06 giữ snapshot lịch sử. `USER_VALIDATION_PENDING`; chưa có tỷ lệ thành công của người thật, thiết bị vật lý hoặc screen reader.

Hồ sơ đủ trạng thái/giới hạn cho158 ID và đủ phân loại325 ý góp ý. Đây không phải kết luận mọi nhánh đã thực thi hoặc sản phẩm sẵn sàng vận hành: các FAIL công việc thiết yếu, provider/email/zoom/thiết bị và câu hỏi chính sách vẫn mở.
