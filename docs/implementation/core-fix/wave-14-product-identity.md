# F02/F08 — nhận diện Store, phân loại và hàng kiểm nhận

02/11/2026. **UX-03 VERIFIED**, tổng **20/52 finding gốc VERIFIED,32 còn mở**. Giữ nguyên mục tiêu52finding/F00–F18/sáu chuỗi; chưa nghiệm thu toàn marketplace. **UX-01/F02 vẫn PARTIAL**: sửa nhận diện và mở rộng snapshot proof không thay mọi biên tồn khả dụng/lựa chọn.

Baseline **Node37/AI37/frontend40**. Backend270file, AI43file,10container image không đổi; không migration/contract/provider mới. Frontend/contract/test/config manifest249file. Giữ các manifest37/38/39 và report lỗi cũ.

## Thay đổi từ bằng chứng

- Catalog và chi tiết trước đây chỉ có liên kết “Xem gian hàng”. Với hai Store bán cùng tên/SKU, khách phải mở từng Store để nhận diện. `StoreLabel` dùng chung nay hiện tên đúng Store ngay tại lựa chọn, tên đang đọc/lỗi không bị thay bằng một tên giả. Thử lại chỉ GET; khi kích hoạt bằng bàn phím và thành công, focus chuyển về liên kết Store, không rơi vào body. Card/chi tiết/giỏ/checkout dùng cùng cache Store.
- `DeliveryCaseView` chỉ có SKU trong bảng kiểm nhận; return/history chỉ có tên sản phẩm, nên hai phân loại cùng tên thiếu nhận diện cạnh số thực nhận. `InspectionSummary` dùng chung ở hoàn về, đổi trả và lịch sử: tên/phân loại/SKU/lượng gốc đi với `order_item_id`; bốn số thực nhận/bán lại/hỏng/chờ xử lý lấy từ **biên bản tại bước đó**. Semantic list/dl và grid2cột trên390px thay bảng nhiều cột bị ép. Không tải catalog hiện tại để dựng lịch sử. Dòng cũ thiếu metadata có thông báo đối chiếu rõ, vẫn hiển thị số đã ghi.
- Runtime PostgreSQL JSONB cho thứ tự thuộc tính `size,color`, trong khi fixture thường `color,size`; cùng món hiện “M / Đỏ” ở một chỗ và “Đỏ / M” chỗ khác. Hàm `variantLabel` nay sắp theo khóa ổn định, không phụ thuộc thứ tự object. Dùng ở modal chọn, chi tiết, giỏ/quote, danh sách/chi tiết đơn, gửi đổi và kho. Có fallback lịch sử; giá trị0/false không bị lọc mất. Không đổi dữ liệu snapshot đã lưu hoặc thứ tự trục nghiệp vụ phía backend.

Năm test baseline39 đềuFAIL đúng các thiếu thông tin đã nêu; giữ `identity-baseline39.json`. Report initial40 có ba selector dùng accessible name cho `<dt>` không có name và một assertion câu văn cũ; đã đổi sang semantic term text/definition và kiểm đúng giá trị, không bỏ kiểm số tiền/số lượng. Fixture xác minh lịch sử giữ số cũ dù biên bản hiện tại đã khác, và không lấy món hiện tại thay dữ liệu cũ.

## Hành trình thật1440/390

Mỗi lượt có hai Store, cùng tên sản phẩm, cùng SKU cho các tổ hợp tương ứng,12variant/Store (3màu×4cỡ), tồn10cho variant đầu/5cho các variant khác. Dữ liệu private có tag. Customer mua hai Store bằng UI từ search/catalog/chi tiết: Đỏ/M×2 và Xanh/L×1; nhận diện bằng tên Store và thuộc tính, không dùng DB để tìm sản phẩm trong walkthrough. Giỏ và quote hiện đúng dòng, Store, lượng; confirm tạo hai đơn cùng nhóm, tổng340000.

Sau khi commit, API cập nhật tên sản phẩm/giá hiện tại150000 và địa chỉ Customer. StoreA bỏ variant đã mua khỏi tập sửa (đường hỗ trợ là soft-stop); StoreB ghi STOPPED rõ ràng. Không có endpoint xóa vật lý variant, không dùng SQL DELETE để giả ca này. VariantA bị bỏ vẫn giữ giá100000; variantB hiện150000, cả hai snapshot đơn vẫn100000.

StoreA dùng **SELLER chỉ `order.store.read_status_cancel`**, không có quyền đọc catalog/kho (HTTP403). StoreB dùng STORE_OWNER. Từ menu/hàng đợi/tìm mã đơn/dialog, hai người đọc phiếu snapshot: tên cũ, đúng màu/size/lượng, người nhận/điện thoại/địa chỉ cũ; xác nhận→chuẩn bị→bàn giao qua UI. Không phải hỏi lại địa chỉ hoặc lấy metadata từ catalog đã đổi.

Customer đọc lại cùng đơn qua lịch sử UI; Seller/Owner/Admin HTTP trả cùng snapshot. StoreA ghi giao thất bại, thực nhận2/tốt1/hỏng1 bằng UI; summary chỉ rõ Đỏ/M/SKU gốc và số kiểm tương ứng, đối chiếu rồi CLOSED/CANCELLED/CODchưa thu. StoreB thu COD/hoàn tất bằng HTTP thật để chốt hậu điều kiện (không gọi đây là bước thu tiền đã bấm UI). Không có hàng vật lý hoặc giao dịch ngân hàng thật.

## Readback cuối và gate

Artifact ở `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Hồi quy source cuối |96PASS/11file, gồm21ca live-market đã cập nhật contract|`identity-regression40-final.json`|
| Runtime1440 cuối |PASS, hai Store/Customer/SELLER/Owner|`product-identity-runtime40-desktop-final.json`|
| Runtime390 cuối |PASS, cùng mục tiêu/dữ liệu độc lập|`product-identity-runtime40-mobile-final.json`|
| SQL cuối |PASS,4đơn/48variant/2nhân viên chỉ quyền đơn|`identity-final-state40-final.json`|
| Source/image |270backend/43AI không đổi;249frontend-contract-test-config;10image khớp|`frontend-source-identity40.json`, `runtime-image-identity40.json`|
| Build/contract/drift |PASS,159public/14internal operation/7event không đổi|gate source40 cuối|
| Thu hồi fixture |22product/type/category STOPPED,21Store LOCKED,1đơn SHIPPED giữ nguyên|`identity-visibility40.json`|
| Docs/hash/whitespace/secret scan |PASS169docs,249file source khớp,21file đổi không lỗi khoảng trắng,1321text artifact không khớp secret runtime|`identity-acceptance40.json`, `artifact-secret-scan40.json`|

Hai nhóm cuối: mỗi nhóm2đơn, tổng340000; hai đơn StoreA CANCELLED/RETURN_INSPECTED/CODCANCELLED0thu0hoàn, hai đơn StoreB COMPLETED/CONSUMED/thu120000 mỗiđơn. Có2movement nhận hoàn +1, không full-restock cả2. Bốn variant đã mua STOPPED, quantity4/reserved0,48variant ledger khớp. Hai khoản thu tổng240000,0refund. Actor thực hiện CONFIRMED/PROCESSING/SHIPPED trên StoreA đúng membershipSELLER, permissions chỉ quyền đơn. Snapshot địa chỉ không bị lấy bản hồ sơ mới.

Gate backend unit/SQL/Python không chạy lại vì ứng dụng/backend image giữ nguyên37; tham chiếu365unit/60SQL/24Python và các gate34SQL39 trước. Không lấy số ca/screenshot/viewport hoặc hai nhóm mới thành sáu chuỗi marketplace.

## Hồi quy cũ và lịch sử lỗi

Report `identity-regression40.json` ban đầu có7failure trong `live-market.spec.ts`: metadata kho thiếu, nút trạng thái tên enum cũ, favorites GET không phản ánh PUT/DELETE, BUY_NOW còn kỳ vọng thêm giỏ, tìm sản phẩm còn kỳ vọng lọc client, search assert rawencoding và nhập trước route render. Đã cập nhật test theo contract/quy tắc được duyệt, giữ nguyên assertion operation/body/version khi retry, không đổi app thành hành vi sai cũ. Các report `live-market-contract-refresh40.json`/`inventory-legacy-fixture40.json` giữ nguyên. Source cuối96PASS bao phủ lại toàn file; không thêm skip hoặc giảm số case để che lỗi.

Runtime exploratory: setup thiếu thuộc tính bắt buộc (được422 đúng); selector trục sai doJSONB tìm được vấn đề formatter thật; selector giỏ có hai link; helper chưa chờ search; mobile scope lẫn khối gợi ý đến chậm. Sửa harness chờ URL/response và giới hạn đúng danh sách/mã đơn. Giữ toàn bộ report, không gọi lỗi selector thành bug sản phẩm.

Ảnh element/full-page có thể chứa header sticky hoặc scroll trong dialog; dùng làm bổ trợ, không suy “mọi trường cùng lúc trên một viewport”. Fixture `receipt-identity-1440/1024/768/390.png` kiểm layout đọc biên bản; runtime có assertion dữ liệu từng bước và thao tác thật. Đã đọc ảnh mobile: phiếu và biên bản cuộn được, nhưng chưa kiểm native zoom/screen reader/thiết bị vật lý. Unhandled pageerror0 ở hai lượt runtime, chưa phải audit toàn console/network.

## Trạng thái và giới hạn giữ lại

**UX-03 VERIFIED** cho thiếu thông tin lấy/giao hàng trong phạm vi giao thủ công: UI nhân viên đúng quyền đủ snapshot món–variant–lượng–người nhận–điện thoại–địa chỉ, không cần đọc DB/catalog hoặc hỏi khách ngoài luồng. Các kiểm tiền/quyền và cạnh tranh rộng của UX-12/OP-03 vẫn ở finding riêng; không đóng cả F08.

**UX-01 vẫn PARTIAL** dù nhận diện Store/trục và snapshot đã tốt hơn. Public ProductVariant hiện chưa cung cấp tồn khả dụng; chi tiết chưa phân biệt được mọi variant hết hàng trước quote, chỉ có trạng thái ACTIVE/STOPPED và server guard khi đặt. Cần giải quyết/kiểm riêng phần khả dụng, đồng thời các thuộc tính có tên kỹ thuật chưa có label đầy đủ. Không gán “mua được” chỉ từ ACTIVE hoặc bịa tồn từ fixture.

Thu hồi22product/type/category của11lượt;21Store hoàn tất được Admin LOCKED và guest bị chặn. Một Store exploratoryrun4 đã SHIPPED trước lỗi selector giữ quyền để xử lý tiếp, không bịa giao thành công/thuCOD/nhận hàng trả. Các pending37/39 giữ nguyên. Không xóa lịch sử hoặc sửa enum để làm cleanup qua.

`USER_VALIDATION_PENDING`. Không có người thật thử, giao hàng vật lý, thiết bị thật/bàn phím ảo/native zoom/screen reader.32finding còn mở; sáu chuỗi cùng source cuối, rollback snapshot writer và các gate F18 chưa hoàn tất. Không kết luận production-ready.
