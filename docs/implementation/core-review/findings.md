# Danh sách phát hiện core review — cập nhật 30/10/2026

CONFIRMED luôn ghi rõ loại bằng chứng: fixture xác nhận hành vi UI, không tự chứng minh provider/DB thật. PASS của test tái hiện nghĩa là lỗi được quan sát đúng như mô tả, không phải chức năng đã đạt nghiệm thu.

Lượt06 thêm CR-026/027 P2; lượt07 tái xác minh CR-005 P3 và CR-017 P2 bằng tương tác/geometry trên baseline mới. Tổng27 CR:0P0,4P1,22P2,1P3. Các UX/OP có thể mô tả cùng nguyên nhân hoặc nhu cầu vận hành riêng, không cộng máy móc thành tổngbug độc lập. Xem [Admin](continuation-06-admin.md) và [bàn phím/nội dung](continuation-07-accessibility-content.md).

Lượt 02 bổ sung CR-020/021 ở cuối và [báo cáo Customer](continuation-02-customer.md). Các loại bằng chứng cũ được giữ; CR-001 hiện có UI–quote–DB thật hai viewport: giỏ 2 + mua ngay 2 → checkout 4/400.000đ, chưa confirm và không có đơn thật được tạo trong ca UI.

Lượt 04 bổ sung CR-023/024/025, trong đó CR-025 P1 chặn nhận diện hàng ở kho với nhân viên inventory-only và Store300. Các phát hiện mới đều có UI/API thật1440/390; phạm vi và đường phục hồi xem [báo cáo Seller](continuation-04-seller-catalog-stock.md). Không sửa ứng dụng.

<a id="cr-001"></a>

## CR-001 · P1 · CONFIRMED — Mua ngay cộng số lượng cũ trong giỏ vào checkout

- Nhóm: [04-cart-buy-now](04-cart-buy-now.md).
- Vị trí: `frontend/src/features/customer/ProductDetail.tsx:98; backend/commerce-service/src/cart/cart.service.ts:63`.
- Điều kiện / tái hiện: Giỏ có 3 đơn vị cùng variant → chọn 1 ở chi tiết → Mua ngay → checkout hiển thị 4.
- Mong đợi: Checkout đúng số lượng vừa chọn, hoặc phải thông báo và yêu cầu xác nhận việc cộng giỏ.
- Thực tế / tác động: POST thêm 1 trả lại dòng giỏ có quantity=4; UI chọn toàn bộ ID dòng đó. Khách có thể đặt nhiều hơn dự định.
- Bằng chứng: Fixture CR-001 kiểm tra UI checkout; journeys.json kiểm tra API thật cộng 3+1=4.
- Hướng sửa / regression: Tách ý định mua ngay khỏi số lượng dòng giỏ; bổ sung regression giỏ có sẵn cùng variant.

<a id="cr-002"></a>

## CR-002 · P2 · CONFIRMED — Form tạo sản phẩm cho retry sau 503 mà chưa xác minh kết quả

- Nhóm: [02-seller-catalog-inventory](02-seller-catalog-inventory.md).
- Vị trí: `frontend/src/features/seller/ProductList.tsx:88; backend/catalog-service/migrations/001_initial.sql:152`.
- Điều kiện / tái hiện: Điền form tạo → POST trả 503 chưa rõ kết quả → nút Tạo sản phẩm được bật → nhấn lại gửi POST thứ hai.
- Mong đợi: Kết quả không chắc chắn cần hướng người dùng kiểm tra danh sách trước khi thử lại.
- Thực tế / tác động: UI chỉ chặn status=0, bỏ qua 408/5xx. Tuy nhiên cùng SKU bị transaction/index chặn 409; rút lại nhận định cũ rằng cùng payload tạo trùng bản ghi mức P1.
- Bằng chứng: Fixture CR-002; journeys.json xác nhận retry cùng SKU trả 409 trên DB thật.
- Hướng sửa / regression: Xử lý 408/5xx như uncertain, kiểm tra lại danh sách; nếu hỗ trợ thì dùng idempotency. Test không được mặc định có dữ liệu trùng.

<a id="cr-003"></a>

## CR-003 · P2 · CONFIRMED — Chi tiết sản phẩm không đọc trạng thái yêu thích đã lưu

- Nhóm: [10-favorites-reviews](10-favorites-reviews.md).
- Vị trí: `frontend/src/features/customer/ProductDetail.tsx:31; frontend/src/features/customer/ProductDetail.tsx:228`.
- Điều kiện / tái hiện: Lưu sản phẩm trước đó → mở lại chi tiết → nút vẫn là Lưu yêu thích và không có Bỏ yêu thích.
- Mong đợi: Hiển thị trạng thái hiện tại và cho đảo trạng thái nhất quán với catalog.
- Thực tế / tác động: favoriteSaved khởi tạo false; chỉ PUT và khóa sau lưu, không đọc trạng thái server.
- Bằng chứng: Fixture CR-003; đối chiếu listFavorites và component.
- Hướng sửa / regression: Dùng cache yêu thích chung và cả hai mutation; test reload và chuyển từ thẻ vào chi tiết.

<a id="cr-004"></a>

## CR-004 · P2 · CONFIRMED — Tim trên các thẻ cùng sản phẩm không đồng bộ

- Nhóm: [10-favorites-reviews](10-favorites-reviews.md).
- Vị trí: `frontend/src/live/ProductCardActions.tsx:20; frontend/src/live/ProductCardActions.tsx:30`.
- Điều kiện / tái hiện: Cùng sản phẩm ở catalog và gợi ý → lưu ở thẻ 1 → bỏ lưu ở thẻ 2.
- Mong đợi: Mọi thẻ cùng ID phản ánh cùng trạng thái server sau mutation.
- Thực tế / tác động: savedOverride của thẻ 1 vẫn true dù server false; phương thức thao tác tiếp theo có thể sai ý định.
- Bằng chứng: Fixture CR-004 có ba thẻ, server fixture có state và query refetch.
- Hướng sửa / regression: Bỏ override tồn tại vô hạn; cập nhật query chung. Test thao tác xen kẽ nhiều thẻ.

<a id="cr-005"></a>

## CR-005 · P3 · CONFIRMED — Chat nổi che thông tin thẻ sản phẩm trên mobile

- Nhóm: [03-public-catalog](03-public-catalog.md).
- Vị trí: `frontend/src/live/commerce.css:13; frontend/src/live/commerce.css:34`.
- Điều kiện / tái hiện: Mở storefront 390px với hai cột sản phẩm, quan sát thẻ bên phải ngang vị trí chat.
- Mong đợi: Thông tin mua hàng đọc được, không bị phần tử nổi che đáng kể.
- Thực tế / tác động: Nút chat phủ một phần giá/nội dung; có thể cuộn nhưng thông tin lại đi qua vùng phủ.
- Bằng chứng mới: `access-round7-overlay-results.json`, hai viewport. Catalog12món, launcher che2571px² vùng giá ở390; screenshot tại điểm vướng đã xem, cuộn140px đọc lại được. NămCTA kiểm riêng vẫn hit đúng nút; không báo không thể mua. Giữ ảnh lịch sử visual/guest--390.png.
- Hướng sửa / regression: Giảm vùng chiếm của launcher hoặc bố trí lại; kiểm tra tương tác, bàn phím và viewport nhỏ.

<a id="cr-006"></a>

## CR-006 · P1 · CONFIRMED — Cho gửi REFUND cho đơn COD nhưng luồng không thể hoàn tất

- Nhóm: [07-returns-refunds](07-returns-refunds.md).
- Vị trí: `frontend/src/features/returns/OrderReturnsPanel.tsx:28; backend/commerce-service/src/payment/refund.runner.ts:24; backend/commerce-service/src/returns/returns.service.ts:67`.
- Điều kiện / tái hiện: Đơn COD COMPLETED → Customer gửi REFUND → Seller APPROVED rồi RECEIVED → thử COMPLETED.
- Mong đợi: Chỉ cho vào luồng hoàn tiền có thể xử lý, hoặc cung cấp quy trình hoàn COD đầy đủ.
- Thực tế / tác động: API nhận yêu cầu và hàng trả, worker chỉ enqueue SANDBOX; hoàn tất trả 409 REFUND_NOT_CONFIRMED, không có refund row. Core sau bán bị kẹt.
- Bằng chứng: journeys.json: HTTP thật, hai vai trò, đối chiếu refund table. Provider COD chưa được hỗ trợ theo ma trận hiện có.
- Hướng sửa / regression: Chặn lựa chọn REFUND COD có giải thích trước khi gửi, hoặc bổ sung adapter/chứng từ COD. Không bỏ kiểm tra chứng từ.

<a id="cr-007"></a>

## CR-007 · P2 · CONFIRMED — Trạng thái refund đang chờ không có cách cập nhật tại màn đổi trả

- Nhóm: [07-returns-refunds](07-returns-refunds.md).
- Vị trí: `frontend/src/features/returns/ReturnsPage.tsx:13; frontend/src/features/returns/ReturnsPage.tsx:27; frontend/src/features/returns/ReturnsPage.tsx:45`.
- Điều kiện / tái hiện: Mở REFUND/RECEIVED đang REQUESTED → server đổi SUCCEEDED khi trang còn mở.
- Mong đợi: Có polling phù hợp hoặc nút làm mới để tiếp tục hoàn tất.
- Thực tế / tác động: Không polling, tắt focus refetch; nút reload chỉ xuất hiện sau blocked error. Trang giữ nút Hoàn tất disabled cho tới remount/reload.
- Bằng chứng: Fixture CR-007 kiểm tra số lần GET và trạng thái nút; code xác nhận không có cơ chế cập nhật thường trực.
- Hướng sửa / regression: Thêm làm mới và/hoặc polling khi đang chờ; test backend đổi trạng thái trong khi màn mở.

<a id="cr-008"></a>

## CR-008 · P2 · CONFIRMED — Badge giỏ không cập nhật sau xóa hoặc checkout

- Nhóm: [04-cart-buy-now](04-cart-buy-now.md).
- Vị trí: `frontend/src/live/MarketplaceHeader.tsx:10; frontend/src/features/customer/CartPage.tsx:105; frontend/src/features/customer/CheckoutPage.tsx:408`.
- Điều kiện / tái hiện: Giỏ có một dòng → xóa dòng cuối; hoặc checkout toàn bộ giỏ thành công.
- Mong đợi: Badge phản ánh số dòng giỏ thực tế sau mutation xác nhận.
- Thực tế / tác động: Xóa chỉ đổi state cục bộ; checkout không invalidate cart-summary. Badge vẫn 1 dù giỏ trống. staleTime không tự hẹn refetch.
- Bằng chứng: Fixture CR-008 xác nhận nhánh xóa; nhánh checkout đối chiếu source và DB xóa dòng trong journeys.json.
- Hướng sửa / regression: Cập nhật/invalidate cart-summary sau DELETE và confirm thành công; test checkout một phần và toàn bộ.

<a id="cr-009"></a>

## CR-009 · P2 · CONFIRMED — Lối tắt Hủy đơn/Đổi trả/Đánh giá không cuộn tới form

- Nhóm: [06-orders-payments](06-orders-payments.md).
- Vị trí: `frontend/src/features/customer/OrderHistoryPage.tsx:22; frontend/src/features/customer/OrderDetailPage.tsx:33; frontend/src/live/LiveApp.tsx`.
- Điều kiện / tái hiện: Lịch sử → Hủy đơn trong đơn có nhiều mục → chờ chi tiết tải.
- Mong đợi: Vùng đích được cuộn và focus phù hợp sau khi phần tử xuất hiện.
- Thực tế / tác động: URL có #cancel nhưng scrollY=0, form nằm dưới viewport. Router không có xử lý hash sau render bất đồng bộ.
- Bằng chứng: Fixture CR-009 kiểm tra bounding box và scrollY; các hash còn lại cùng thiếu handler.
- Hướng sửa / regression: Xử lý hash sau tải dữ liệu, scroll-margin và focus; test back/forward và mobile.

<a id="cr-010"></a>

## CR-010 · P2 · CONFIRMED — Không có thao tác sửa nội dung địa chỉ đã lưu

- Nhóm: [08-profile-address-store-application](08-profile-address-store-application.md).
- Vị trí: `frontend/src/features/customer/AddressPage.tsx:160`.
- Điều kiện / tái hiện: Có địa chỉ đã lưu → cần sửa người nhận/điện thoại/đường.
- Mong đợi: Sửa địa chỉ qua updateAddress trong luồng quản lý địa chỉ.
- Thực tế / tác động: UI chỉ thêm, đặt mặc định và xóa; backend có PATCH nội dung. Người dùng phải xóa/tạo lại để sửa, đổi ID không cần thiết.
- Bằng chứng: Fixture CR-010; đọc handlers và API updateAddress.
- Hướng sửa / regression: Thêm form sửa có giá trị hiện tại, bảo toàn default và lỗi nhập; regression sửa địa chỉ đang chọn trước quote.

<a id="cr-011"></a>

## CR-011 · P2 · CONFIRMED — Lưu hồ sơ không cập nhật tổng quan tài khoản

- Nhóm: [08-profile-address-store-application](08-profile-address-store-application.md).
- Vị trí: `frontend/src/features/customer/ProfilePage.tsx:111; frontend/src/live/LiveApp.tsx:77`.
- Điều kiện / tái hiện: Mở /profile để cache tên A → sửa thành B → quay Tổng quan bằng sidebar trong vòng staleTime.
- Mong đợi: Tên mới xuất hiện ngay ở tổng quan sau lưu thành công.
- Thực tế / tác động: Form GET lại dữ liệu riêng nhưng không invalidate query profile; hub tiếp tục hiện tên A.
- Bằng chứng: Fixture CR-011 xác nhận server B, form B nhưng heading hub A.
- Hướng sửa / regression: Cập nhật/invalidate query profile theo user sau mutation; test SPA navigation không hard reload.

<a id="cr-012"></a>

## CR-012 · P2 · CONFIRMED — Quản lý nhân viên/lời mời bỏ dữ liệu sau trang đầu

- Nhóm: [09-staff-store-settings](09-staff-store-settings.md).
- Vị trí: `frontend/src/features/seller/StaffPage.tsx:29`.
- Điều kiện / tái hiện: Store có 101 nhân viên hoặc hơn 100 lời mời → mở quản lý nhân viên.
- Mong đợi: Có thể xem và xử lý toàn bộ dữ liệu qua phân trang.
- Thực tế / tác động: GET cố định page=1,size=100; bỏ total, không pager. Các bản ghi từ 101 trở đi không có đường truy cập UI.
- Bằng chứng: Fixture CR-012 trả total=101 và xác nhận không có Trang sau; backend hỗ trợ page/size.
- Hướng sửa / regression: Phân trang độc lập nhân viên/lời mời hoặc tải đủ có giới hạn; test phần tử cuối trang.

<a id="cr-013"></a>

## CR-013 · P2 · CONFIRMED — Voucher thiếu thao tác sửa và mở lại

- Nhóm: [05-vouchers-checkout](05-vouchers-checkout.md).
- Vị trí: `frontend/src/live/VoucherPanel.tsx:136`.
- Điều kiện / tái hiện: Mở voucher đã tạo hoặc STOPPED để sửa mức giảm/thời gian/hạn mức hoặc kích hoạt lại.
- Mong đợi: UI có thao tác quản lý tương ứng khả năng update API đã công bố.
- Thực tế / tác động: Panel chỉ tạo, xem usage, dừng; voucher đã dừng không có action khôi phục/sửa. Đây là khoảng trống chức năng UI, không phải lỗi tính discount.
- Bằng chứng: Fixture CR-013 xác nhận không có affordance; đối chiếu updateStoreVoucher/updatePlatformVoucher.
- Hướng sửa / regression: Bổ sung edit/status với expected_version; test STORE/PLATFORM và xung đột.

<a id="cr-014"></a>

## CR-014 · P2 · CONFIRMED — Báo cáo ngày mặc định bị lệch đầu tháng ở UTC+7

- Nhóm: [12-admin-report-ai](12-admin-report-ai.md).
- Vị trí: `frontend/src/live/SellerWorkspace.tsx:750; frontend/src/live/SellerWorkspace.tsx:760`.
- Điều kiện / tái hiện: Timezone Asia/Bangkok, ngày 29/10/2026 → mở báo cáo mặc định tháng 10.
- Mong đợi: Từ ngày là 01/10 và ranh giới truy vấn thống nhất timezone được hiển thị.
- Thực tế / tác động: Local midnight 01/10 chuyển ISO thành 30/09 rồi slice date; UI hiển thị 2026-09-30. Giá trị date còn bị gắn UTC 00:00 nên ranh giới ngày không theo giờ địa phương.
- Bằng chứng: Fixture CR-014 dùng clock và timezone cố định; screenshot CR-014-report-timezone.png.
- Hướng sửa / regression: Định dạng ngày local không qua ISO; chốt timezone báo cáo và chuyển ranh giới đúng. Test đầu tháng/đầu năm và một ngày duy nhất.

<a id="cr-015"></a>

## CR-015 · P2 · CONFIRMED — Đánh giá bị ẩn không có đường sửa sau khi tải lại

- Nhóm: [10-favorites-reviews](10-favorites-reviews.md).
- Vị trí: `frontend/src/features/customer/ProductReviews.tsx:49; backend/catalog-service/src/review/review.service.ts:28`.
- Điều kiện / tái hiện: Đã đánh giá → Admin ẩn → reload chi tiết sản phẩm → muốn sửa đánh giá của mình.
- Mong đợi: Backend update hiện cho chủ review sửa bản HIDDEN và giữ quyết định kiểm duyệt (review.service.ts:43); UI cần đường tải/sửa bản sở hữu tương ứng, không tự bỏ ẩn. Không tự đặt chính sách công khai lại review.
- Thực tế / tác động: Nút sửa chỉ lấy từ danh sách review public VISIBLE; không có GET review sở hữu. Tạo lại khác nội dung nhận REVIEW_ALREADY_EXISTS, hướng dẫn chọn sửa nhưng không có bản ẩn để chọn.
- Bằng chứng mới lượt 03: UI/API/database thật ở 1440/390: buyer sửa review VISIBLE được → Admin hide đúng ID → reload → tìm lại completed OrderItem qua phân trang → 0 nút sửa; gửi nội dung khác nhận 409 REVIEW_ALREADY_EXISTS. `continuation-03-real-rerun-results.json` C54 và metadata hidden_status/edit_buttons/duplicate_attempt. Review đã phục hồi; chuyển STATIC_FINDING → CONFIRMED, không tạo ID mới.
- Hướng sửa / regression: Thêm đường đọc review của mình và edit version; giữ moderation HIDDEN. Test create→hide→reload→edit.

<a id="cr-016"></a>

## CR-016 · P1 · CONFIRMED — Refresh token đổi context nhưng UI và cache vẫn giữ phiên cũ

- Nhóm: [01-auth-access](01-auth-access.md).
- Vị trí: `frontend/src/api/client.ts:14; frontend/src/api/client.ts:30; frontend/src/api/auth-context.tsx:6; frontend/src/live/LiveApp.tsx:53`.
- Điều kiện / tái hiện: Đang ở tài khoản A; refresh trả context mới sau thu hồi quyền hoặc cookie refresh bị thay bởi đăng nhập B ở tab khác → request 401 kích hoạt refresh.
- Mong đợi: Token, React session, scope cache và state nghiệp vụ phải được cập nhật cùng một identity; không tiếp tục UI A với request B.
- Thực tế / tác động: restore chỉ set accessToken ở module client, không cập nhật AuthProvider. Fixture đọc form hồ sơ B nhưng quay tổng quan vẫn cache A; case thu hồi Seller vẫn bật thao tác Owner. Backend vẫn kiểm quyền, chưa có bằng chứng IDOR; rủi ro là lẫn danh tính và thao tác nhầm tài khoản.
- Bằng chứng mới lượt 03: Hai tab Edge/API thật ở 1440/390. Tab 1 Owner A mở portal; tab 2 logout/login Customer B; đổi mật khẩu test A để thu hồi token cũ, ép request 401/refresh. Metadata refresh.context là B CUSTOMER, địa chỉ B hiển thị nhưng header vẫn có Kênh người bán của A. `continuation-03-real-results.json` X17 và walkthrough.json; mật khẩu A đã khôi phục. Các fixture cũ còn giữ để kiểm cache/thu quyền; chưa chứng minh backend bỏ ownership.
- Hướng sửa / regression: Đồng bộ kết quả refresh vào auth store có kiểm tra epoch/user; reset cache khi identity/quyền thay đổi, đồng bộ logout/account switch giữa tab. Test 401, session revoked và hai tab thật.

<a id="cr-017"></a>

## CR-017 · P2 · CONFIRMED — Cột thao tác sticky che tên sản phẩm trên Seller mobile

- Nhóm: [02-seller-catalog-inventory](02-seller-catalog-inventory.md).
- Vị trí: `frontend/src/live/commerce.css:17; frontend/src/live/commerce.css:19; frontend/src/features/seller/ProductList.tsx:33`.
- Điều kiện / tái hiện: Mở bảng sản phẩm Seller ở 390px, quan sát tên các hàng khi chưa cuộn ngang.
- Mong đợi: Tên sản phẩm đọc được cùng thao tác hoặc có bố cục mobile rõ ràng.
- Thực tế / tác động: Cột cuối sticky chứa min-width 240px cộng padding chiếm gần hết bảng; vùng tên chỉ còn mảnh hẹp, ảnh screenshot cho thấy chữ bị che. Không gây overflow trang nên check scrollWidth vẫn qua.
- Bằng chứng mới: X29 `access-round7-results.json` ở390/scroll0, sticky che103.125/107.125px tên. Đã xem sticky-left.png; recovery dùng wheel ngang80px thực, phân trang/editor vẫn dùng được.768/1024/1440 không overlap ban đầu trong mẫu; chưa thao tác cảm ứng thật. Giữ ảnh lịch sử visual/owner-seller-products-390.png.
- Hướng sửa / regression: Mobile chuyển action sang menu gọn và bỏ sticky cột rộng hoặc dùng layout hàng phù hợp; test tên dài, cuộn ngang và nhận diện hàng.

<a id="cr-018"></a>

## CR-018 · P2 · CONFIRMED — Cho chuyển checkout khi cập nhật giỏ đang chạy

- Nhóm: [04-cart-buy-now](04-cart-buy-now.md).
- Vị trí: `frontend/src/features/customer/CartPage.tsx:142; frontend/src/features/customer/CartPage.tsx:264`.
- Điều kiện / tái hiện: Chọn dòng giỏ → nhấn tăng số lượng → giữ phản hồi PATCH → nhấn Tiến hành thanh toán.
- Mong đợi: Chờ mutation xác định kết quả trước khi chuyển bước và đọc giỏ/quote.
- Thực tế / tác động: CTA chỉ kiểm selected.size; vẫn enabled và điều hướng trong khi PATCH chưa xong. GET giỏ/quote có thể chạy trước cập nhật, tạo checkout cũ hoặc conflict không cần thiết. Chưa chứng minh backend tính tiền sai.
- Bằng chứng: Fixture CR-018 giữ PATCH bằng promise và xác nhận URL chuyển checkout trước khi trả response.
- Hướng sửa / regression: Guard goCheckout và disabled theo busyId/loading; xác minh lại giỏ sau uncertain. Test đảo thứ tự PATCH/GET/quote.

<a id="cr-019"></a>

## CR-019 · P2 · CONFIRMED — Bỏ yêu thích cuối trang 2 hiển thị danh sách trống dù còn 20 mục

- Nhóm: [10-favorites-reviews](10-favorites-reviews.md).
- Vị trí: `frontend/src/features/customer/FavoritesPage.tsx:11; frontend/src/features/customer/FavoritesPage.tsx:22`.
- Điều kiện / tái hiện: Có 21 mục yêu thích → trang 2 → bỏ mục duy nhất.
- Mong đợi: Trở về trang hợp lệ hoặc hiển thị rõ chỉ trang hiện tại rỗng, không tuyên bố toàn bộ danh sách trống.
- Thực tế / tác động: page giữ 2, total=20, items=[]; UI hiển thị Danh sách yêu thích của bạn đang trống. Còn 20 mục trên trang 1.
- Bằng chứng: Fixture CR-019 có phân trang server đúng total/page/size và mutation thật trong fixture.
- Hướng sửa / regression: Clamp page sau mutation hoặc tự về trang trước khi trang cuối rỗng; test xóa qua tim lẫn nút ngoài thẻ.

<a id="cr-020"></a>

## CR-020 · P2 · CONFIRMED — Quay lại giỏ tự chọn lại Store đã bỏ

- Nhóm: [04-cart-buy-now](04-cart-buy-now.md); C34, liên quan C23/C36.
- Vị trí: `frontend/src/features/customer/CartPage.tsx:71`, đặc biệt `setSelected(new Set(all.map(...)))` ở load dòng 78.
- Điều kiện / tái hiện: Giỏ có A/B → bỏ Store B → checkout quote chỉ A → quay lại giỏ để sửa → đi checkout lại mà không chủ động chọn B.
- Mong đợi: Quyết định bỏ chọn cho dòng còn tồn tại được giữ theo user; quote không thêm món ngoài ý định.
- Thực tế / tác động: Giỏ load tự chọn tất cả; quote sau có cả A/B. Khách còn có thể bỏ chọn lại trước confirm, nên nhiệm vụ FRICTION. Chưa chứng minh đặt sai đơn hoặc thu thêm tiền thật.
- Bằng chứng: UI HTTP fixture trên cả 1440/390, `customer-round2-v2-results.json` C34 và `customer-recovery-results.json` ghi body quote trước một/sau hai cart_item_ids. Không phải bằng chứng DB đã đặt sai món.
- Hướng sửa / regression: Phân biệt chưa khởi tạo với lựa chọn rỗng có chủ ý; giữ selection theo user, lọc dòng đã mất; kiểm back/reload, cập nhật/xóa/thêm dòng, hai tab và đổi tài khoản. So quote IDs/tổng trước confirm.

<a id="cr-021"></a>

## CR-021 · P2 · CONFIRMED — Tìm không dấu bỏ sót sản phẩm tiếng Việt

- Nhóm: [03-public-catalog](03-public-catalog.md); C01, góp ý DIS01.
- Vị trí: `backend/catalog-service/src/catalog/catalog.repository.ts:36`; public predicate dùng ILIKE trên title/description, chỉ bỏ khác biệt hoa/thường.
- Điều kiện / tái hiện: Cùng một product ACTIVE/VISIBLE của Store review → q=`Áo công sở` hoặc `áo CÔNG SỞ` thấy đúng ID; q=`Ao cong so`/`ao cong so` trả total=0.
- Mong đợi: Hỗ trợ truy vấn có/không dấu tương đương cho phạm vi tìm tiếng Việt đã giữ; count/items/sort/category cùng quy tắc.
- Thực tế / tác động: Nhập lại có dấu mới tìm thấy; C01 FRICTION. Không kết luận search nói chung hỏng hoặc đòi fuzzy/typo engine.
- Bằng chứng: API public thật với năm query trên cùng đối tượng ở `customer-search-round2.json`; UI hai viewport đã kiểm đường nhập có dấu, không gọi là đã thử riêng UI không dấu với người thật. Sản phẩm/type được thu hồi sau test.
- Hướng sửa / regression: Chuẩn hóa dấu nhất quán title/description/count/items, giữ q hiển thị; kiểm đ/Đ, hoa/thường, phân trang, sort và scope visibility. Đo hiệu năng riêng nếu thêm xử lý truy vấn.

<a id="cr-022"></a>

## CR-022 · P2 · CONFIRMED — Checkout giữ đơn giá cũ sau khi báo giá đã đổi

- Nhóm: [05-vouchers-checkout](05-vouchers-checkout.md), X13.
- Vị trí: [CartProduct.tsx:15](../../../frontend/src/live/CartProduct.tsx:15), hiển thị `variant.price_vnd` từ query product tại dòng 44; [CheckoutPage.tsx:410](../../../frontend/src/features/customer/CheckoutPage.tsx:410) xử lý QUOTE_CHANGED/tính lại quote mà không làm mới dữ liệu dòng tương ứng.
- Điều kiện/bước: Customer có một variant giá 100.000đ → checkout/quote → Owner đổi giá thành 110.000đ → Customer confirm quote cũ → server 409 QUOTE_CHANGED → chờ quote mới.
- Mong đợi: Dòng hàng và tổng dùng giá nhất quán với báo giá đang kiểm tra; người mua biết rõ đơn giá áp dụng trước xác nhận lại.
- Thực tế: Tổng và hàng hóa đã là 110.000đ, thông báo tổng cũ/mới đúng; dòng vẫn ghi “Giá hiện tại: 100.000đ”. Reload mới hiển thị 110.000đ. FRICTION ở X13 vì có đường phục hồi; chưa chứng minh backend tạo đơn hoặc thu sai tiền.
- Bằng chứng: UI/API thật 1440/390, `continuation-03-real-rerun-results.json` X13; `stale-unit.png` chụp trước reload và `walkthrough.json` ghi rendered_unit, server_new_unit_vnd, reload_recovers_unit=true. Fixture lặp lại cùng biểu hiện. Giá test đã khôi phục, sản phẩm dừng bán.
- Tác động: Người mua không đối chiếu được các số tiền trên cùng màn trước quyết định trả tiền, đặc biệt giỏ nhiều dòng.
- Hướng sửa tối thiểu: Đưa đơn giá được báo giá vào phần kiểm tra dòng hàng hoặc đồng bộ lại metadata liên quan khi quote thay đổi; không để nhãn “Giá hiện tại” hiển thị cache cũ. Chỉ bật xác nhận khi phần thông tin cần kiểm tra đã nhất quán; giữ nguyên bảo vệ quote/idempotency ở server.
- Test hồi quy: Giỏ nhiều dòng/nhiều Store, thay giá một variant trước confirm; kiểm từng đơn giá, lượng, thành tiền và tổng sau 409/requote, không cần reload. Tiếp tục kiểm giá thay đổi lần nữa, request metadata lỗi và unknown-result retry giữ nguyên body/key. Đây là đề xuất kiểm, chưa phải các ca đã chạy.

<a id="cr-023"></a>

## CR-023 · P2 · CONFIRMED — Form tạo chặn giá VND hợp lệ không tròn nghìn

- Nhóm: [02-seller-catalog-inventory](02-seller-catalog-inventory.md), S10.
- Vị trí: [ProductList.tsx:130](../../../frontend/src/features/seller/ProductList.tsx:130): input giá có min=1000/step=1000; editor variant dùng step=1. Contract price_vnd là integer, không có ràng buộc bội1000.
- Điều kiện/bước: Owner → Sản phẩm Store → Thêm mới → chọn taxonomy hợp lệ, nhập tên/SKU009264 và giá100500 → bấm Tạo sản phẩm.
- Mong đợi: Giá nguyên VND hợp lệ được gửi đúng giá vừa nhập, nhất quán với backend/editor; không buộc làm tròn khi chưa có chính sách đó.
- Thực tế: Native stepMismatch chặn trước POST, gợi hai giá100000/101000. API/DB thật tạo đúng100500 và giữ SKU bắt đầu00. Tạo nháp100000 rồi editor đổi100500 được, nên task FRICTION; không phải lỗi mất số0 hoặc lưu sai giá.
- Bằng chứng: `seller-round4-operations-real-results.json` S10, UI thật1440/390, metadata validity/create_posts=0; `seller-round4-http.json` check giá100500/DB; `seller-round4-recovery-results.json` S10 vòng tránh ở hai viewport.
- Tác động: Seller không nhập trực tiếp giá mong muốn ở luồng tạo, phải biết vòng tránh hoặc đổi giá ngoài ý định.
- Hướng sửa: Thống nhất input min/step/max và thông báo với contract giá nguyên; chỉ hạn chế bội1000 khi có quy tắc kinh doanh được chốt và áp nhất quán.
- Test hồi quy đề xuất: Tạo/sửa cùng các giá hợp lệ100500/100001, biên min/max của contract; số âm/thập phân/tổng vượt safe integer bị từ chối rõ; SKU có số0 vẫn nguyên. Không coi các biên chưa chạy này là đã PASS.

<a id="cr-024"></a>

## CR-024 · P2 · CONFIRMED — Lịch sử kho không cập nhật sau điều chỉnh thành công

- Nhóm: [02-seller-catalog-inventory](02-seller-catalog-inventory.md), S19.
- Vị trí: [SellerWorkspace.tsx:335](../../../frontend/src/live/SellerWorkspace.tsx:335): callback done đóng dialog và refetch inventory; query store-stock-movements không được làm mới.
- Điều kiện/bước: Owner mở Tồn kho khi bảng lịch sử đã tải → nhập+5 với lý do riêng → Lưu điều chỉnh → kiểm cả số lượng và lịch sử trên cùng màn.
- Mong đợi: Số tồn và dòng lịch sử mới cùng phản ánh mutation đã xác nhận; người nhập đối chiếu được ngay kết quả.
- Thực tế: Quantity12→17 đúng; GET API có movement/actor/reason, UI lịch sử vẫn cũ. Reload mới có dòng mới. Không có bằng chứng mất movement hay cộng tồn hai lần; task FRICTION.
- Bằng chứng: UI/API/database thật1440/390 ở `seller-round4-operations-real-results.json` S19; `stale-history.png` trước reload, walkthrough ghi api_movement_exists và reload_recovers_history. Fixture chứng minh vòng tránh riêng. Hai lần+5 đã bù-5, giữ lịch sử.
- Tác động: Người vận hành không biết lần nhập vừa ghi nằm ở đâu, dễ lặp hoặc hỏi ngoài hệ thống; chưa đo tần suất và chưa chứng minh người dùng nhập lặp.
- Hướng sửa: Invalidate/refetch cả inventory và movement theo Store sau mutation; nếu đọc lại lỗi, nêu rõ đã ghi thành công nhưng chưa tải được lịch sử. Giữ operation_id/body của lần chưa rõ kết quả.
- Test hồi quy đề xuất: Lưu adjustment khi lịch sử đang trang1 hoặc trangcuối, thấy đúng một movement; refetch lỗi không gửi lại mutation; retry cùng operation_id không tăng lần hai; thay Store/tài khoản không lẫn cache.

<a id="cr-025"></a>

## CR-025 · P1 · CONFIRMED — Màn kho mất nhận diện hàng với nhân viên kho và catalog lớn

- Nhóm: [02-seller-catalog-inventory](02-seller-catalog-inventory.md), S23; liên quan quyền S40.
- Vị trí: [SellerWorkspace.tsx:203](../../../frontend/src/live/SellerWorkspace.tsx:203): tên lấy từ listOwnStoreProducts page1size100 và chỉ query khi có cả inventory/product permission; variantName fallback UUID tại dòng211. Bảng và dialog điều chỉnh dùng cùng fallback.
- Điều kiện/bước A: Owner Store300 → Tồn kho → ngay trang1 gặp hàng tồn0 chỉUUID; sau điểm vướng mới đối chiếu API, thấy SKU thuộc product134 trên metadata page2.
- Điều kiện/bước B: Nhân viên SELLER chỉ có inventory.store.read_adjust → Store Portal → Tồn kho → các dòng đầu cũng chỉUUID, vì query tên tắt khi không có product.store.read_write.
- Mong đợi: Người có quyền kho nhận ra tên món/SKU phù hợp phạm vi của mọi dòng đang xem để chọn đúng variant, không cần quyền sửa sản phẩm hoặc giải mã UUID ngoài hệ thống.
- Thực tế/tác động: Không có mapping UUID→SKU trong UI kho; không đủ thông tin để nhập/điều chỉnh đúng hàng ở vai trò kho độc lập và các product ngoài100 metadata đầu. P1 do chặn công việc thiết yếu; chưa thử ghi nhầm hoặc chứng minh DB sai tồn. Tần suất chưa đo, không suy P0.
- Bằng chứng: `seller-round4-operations-real-results.json` S23 ở1440/390: candidate `007e07e5-157a-4c8e-92ea-27d8ba0a3d95`, actual_owned_product/SKU ở metadata_page2; `seller-round4-staff-real-rerun-results.json` cùng ID với permissions inventory-only, label UUID. Quyền fixture đã khôi phục. Fixture300 đi tới trang15 lặp lại giới hạn100, không dùng nó thay bằng chứng thật.
- Hướng sửa tối thiểu: Cấp metadata nhận diện tối thiểu của các dòng inventory trong scope quyền kho, từ projection/lookup theo variant của trang hiện tại. Không mở quyền product editor hoặc tải toàn Store vô hạn để chữa tạm; giữ guard Store/permission hiện hành.
- Test hồi quy đề xuất: Store300, inventory-only SELLER, Owner, trang đầu/cuối với thứ tự inventory khác catalog; mọi dòng nhận ra đúng SKU/màu-size theo dữ liệu có, dialog giữ đúngvariant. Product editor vẫn403 khi nhân viên thiếu quyền product; Store khác không bị lộ. Đây là đề xuất, chưa chứng nhận đầy đủ các scope này.
<a id="cr-026"></a>

## CR-026 · P2 · CONFIRMED — Lọc hồ sơ chờ duyệt bỏ sót trang sau và mất phân trang

- Điều kiện/bước: Admin → Hồ sơ Store, trang đầu có10hồ sơ đã xử lý → chọn Chờ duyệt. Có hồ sơ pending riêng ở trang sau.
- Expected: lọc/đếm trên tập dữ liệu đầy đủ và vẫn có đường tới kết quả. Actual: hiển thị0/“Không có hồ sơ phù hợp”, pager cũng biến mất. Bỏ lọc→trang sau→lọc lại tìm được, nên A01 FRICTION, không kết luận mất hồ sơ.
- Vị trí: [StoreApplicationAdminPage.tsx:46](../../../frontend/src/features/admin/StoreApplicationAdminPage.tsx:46) counts/visibleItems lọc data.items; nhánh rỗng dòng76 nằm ngoài Pagination dòng79.
- Bằng chứng: `admin-round6-live-filter-results.json` hai viewport UI/API thật; `admin-round6-recovery-results.json` vòng tránh; checkpoint riêng theoID/project. Dữ liệu tagop-review-1793333584200, không dùng demo chung.
- Tác động: Admin hiểu sai hàng đợi và có thể bỏ sót người chờ; chưa đo tần suất. Hướng sửa: lọc phía server hoặc cơ chế tìm đầy đủ phù hợp contract, giữ pager/đếm đúng phạm vi và xử lý trang ngoài biên.
- Hồi quy đề xuất:10rejected ở trang1/pending trang2, đổi filter ở trangcuối, không kết quả thật, concurrent approval, desktop/mobile; không gọi localpagecount là tổng pending.

<a id="cr-027"></a>

## CR-027 · P2 · CONFIRMED — Xác nhận khóa không nhắc đối tượng và tác động

- Bước: Admin tìm đúng email hoặc Store → Khóa → đọc nativeprompt. Expected: kiểm lại được đối tượng/trạng thái/tác động trước gửi và hủy an toàn.
- Actual: chỉ “Lý do chuyển trạng thái người dùng/cửa hàng thành LOCKED”, không email/tênStore hay hậu quả. Hai prompt đãdismiss, không PATCH; chưa có bằng chứng Admin khóa nhầm.
- Mã: [routes.tsx:132](../../../frontend/src/features/admin/routes.tsx:132), Store dòng216.
- Bằng chứng: `admin-round6-live-operations-results.json` A09 hai viewport và walkthrough.json lưu prompt/target/noPATCH. HTTP riêng chứng minh khóauser chặn token cũ nhưng Store vẫnACTIVE; khóaStore làm public404 nhưng profileCustomer còn truy cập, sau đó phục hồi.
- Tác động: thiếu cơ hội xác minh thao tác ảnh hưởng tài khoản/bán hàng, nhất là bảng email gần giống. Hướng sửa: trình bày danh tính phù hợp quyền, trạng thái đích, phạm vi ảnh hưởng và lý do trước xác nhận; giữ guard/version server.
- Hồi quy đề xuất: user/Store có tên gần giống, mobile, cancel không mutation,409 đọc lại, mở khóa không tự thêm quyền; kiểm đủ thông tin trướccommit, không bắt thêm checkbox vô nghĩa.
