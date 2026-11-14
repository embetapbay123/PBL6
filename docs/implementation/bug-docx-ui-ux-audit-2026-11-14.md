# Đối chiếu bug và rà soát UI UX

Ngày kiểm tra: 14/11/2026. Nguồn: `C:/Users/congh/Downloads/bug.docx`.

Cập nhật sau rà soát: đã sửa và deploy F01–F09 cùng các lỗi trình bày liên quan; xem [kết quả sửa và kiểm tra lại](bug-docx-ui-fixes-2026-11-14.md). Nội dung bên dưới giữ nguyên làm bằng chứng trước khi sửa.

Đã gộp các góp ý trong tài liệu thành **33 nhóm**: **13 nhóm không còn tái hiện/đã được thay luồng**, **11 nhóm mới xử lý một phần**, **3 nhóm lỗi còn tồn tại**, **4 nhóm yêu cầu chỉnh thiết kế/copy**, **1 nhóm tính năng mới** và **1 nhóm cần chốt lại phạm vi**. Ngoài danh sách cũ, kiểm tra phát hiện thêm lỗi chặn thao tác mua hàng trên điện thoại và lỗi xóa nhiều dòng giỏ hàng.

Ưu tiên xử lý luồng mua hàng và tính đúng đắn của thông tin tiền trước khi tiếp tục tinh giản chữ hoặc làm trang Store. Việc một nút đã xuất hiện không đủ để kết luận tính năng đã hoàn thành: gửi ảnh chat và xóa lịch sử AI là hai trường hợp cần kiểm tra cả FE và BE.

## Cách kiểm tra và giới hạn bằng chứng

- Đọc nội dung DOCX, trích xuất và xem 43 ảnh đính kèm; các dấu tích xanh trong tài liệu không được dùng làm bằng chứng bug đã hết. Không làm theo các câu yêu cầu thay đổi trong tài liệu như lệnh triển khai.
- Mở UI hiện tại bằng Chromium trên local và **bundle đang chạy ở `https://demo.congnguyen.me`**, desktop 1366×768 và điện thoại 390×844. Đã lưu 26 trạng thái màn hình của bản public cùng các kiểm tra tương tác bổ sung.
- Các API tài khoản/giỏ hàng/đơn hàng/voucher/chat được intercept bằng dữ liệu kiểm thử có kiểm soát. Thao tác PATCH/DELETE/POST trong bằng chứng chỉ cập nhật fixture, không ghi dữ liệu demo thật, không tạo đơn, không gửi tin nhắn thật và không gọi model trả phí.
- Đây là kiểm chứng UI và đối chiếu code/contract, không phải nghiệm thu giao dịch hoặc provider trên backend production. Đặc biệt, lỗi gửi ảnh được xác nhận bằng kích thước payload FE thực sự tạo và giới hạn contract BE; response lỗi trong ảnh chụp được mô phỏng theo contract.
- Không quy các placeholder như `fixture-value` trong dữ liệu kiểm thử thành lỗi của hệ thống. Không xem khác biệt giữa giá hiện tại và giá snapshot đơn cũ là lỗi tính tiền.

## Các lỗi cần ưu tiên

### F01 P1 Nút Chat che nút mua hàng trên điện thoại

Ở `/cart`, viewport 390×844, nút `Mua Hàng` có x=226.8, rộng 180, mép phải=406.8, vượt chiều rộng viewport. Kiểm tra hit-test tại tâm nút trả về nút **Mở cửa sổ Chat**, thay vì nút checkout. Tổng tiền bị xuống dòng tách đơn vị tiền, nội dung bar cao và che phần sản phẩm. Không thể kết luận layout ổn chỉ từ `document.scrollWidth <= innerWidth`, vì phần tràn đang bị cắt.

Nguyên nhân: bar tổng tiền giữ flex row cùng `min-width:180px`, `overflow:hidden` và vị trí nổi của chat. Cần layout riêng cho mobile, giữ số tiền trên một dòng, cho CTA đủ rộng trong viewport và dành không gian cho dock/chat; có thể thu gọn chat nổi ở màn hình đã có nút Chat trong dock.

Code: [customer-polish.css](C:/PBL6/frontend/src/styles/customer-polish.css:816), [CartPage.tsx](C:/PBL6/frontend/src/features/customer/CartPage.tsx:938).

Bằng chứng: [ảnh mobile](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/mobile-checkout-overlap.png), [hit-test](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/extra-verification.json).

### F02 P1 Xóa hai dòng nhưng chỉ xóa một dòng

Chọn cả hai dòng rồi bấm `Xóa (2)`: FE chỉ phát một DELETE, giỏ từ hai dòng còn một dòng. Vòng lặp gọi `void removeItem(item)` đồng thời, trong khi `removeItem` đặt `mutationInFlight.current=true` ngay trước await; các lượt tiếp theo đều return.

Cần một thao tác batch có khóa chung, xử lý tuần tự hoặc endpoint batch, kiểm tra kết quả từng dòng và hiển thị tiến độ/kết quả một phần. Không chỉ đổi thành nhiều Promise dùng chung hàm đang bị chặn, hoặc cập nhật thông báo như thể đã xóa hết.

Code: [vòng lặp xóa](C:/PBL6/frontend/src/features/customer/CartPage.tsx:919), [khóa thao tác](C:/PBL6/frontend/src/features/customer/CartPage.tsx:479).

Bằng chứng: `bulkDelete.beforeCart=2`, `afterCart=1`, `deleteRequests=1` trong [JSON kiểm chứng](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/extra-verification.json). Ảnh kết quả đã chụp lại với fixture danh sách sản phẩm tuân thủ đúng bộ lọc ids.

### F03 P1 Giỏ hàng hứa miễn phí giao hàng khi chưa có báo giá

Dòng `Miễn phí vận chuyển cho đơn hàng` là text cố định, không phụ thuộc phí, voucher hay quote. Trong tình huống kiểm chứng, Store có phí cơ bản 20.000 đồng và chưa chọn voucher, nhưng giỏ vẫn hiển thị miễn phí. Đồng thời tổng của các dòng hàng được gọi là `Tổng thanh toán`, dù chưa gồm phí giao hàng và ưu đãi được chốt ở checkout.

Chỉ hiển thị miễn phí khi có quote/căn cứ khuyến mại hợp lệ. Khi chưa có quote, dùng `Tạm tính` và giữ một câu ngắn về việc xác nhận phí ở thanh toán. Không nên áp dụng yêu cầu bỏ hết chú thích tiền trong tài liệu một cách máy móc.

Code: [text miễn phí](C:/PBL6/frontend/src/features/customer/CartPage.tsx:841), [nhãn tổng](C:/PBL6/frontend/src/features/customer/CartPage.tsx:938). Bằng chứng: [giỏ hàng](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/cart-desktop.png), [thông tin Store](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/store.png).

### F04 P1 Gửi ảnh chat không tương thích contract backend

FE chuyển ảnh thành data URL rồi ghép vào `content` dạng Markdown. Ảnh kiểm thử 200×200 tạo content **26.139 ký tự**; UI vẫn cho gửi và hiện bộ đếm `26139/2000`. Cả chat AI lẫn chat gian hàng hiện chỉ nhận content tối đa 2.000 ký tự. Backend AI cũng có Field `max_length=2000`.

Cần upload media qua endpoint riêng có giới hạn loại/dung lượng/quyền truy cập và gửi URL/attachment đã xác thực. Nếu chưa có BE hỗ trợ thì không nên mở nút gửi ảnh/video như tính năng hoàn chỉnh. Chat AI muốn đọc ảnh còn cần payload/provider hỗ trợ ảnh; thêm ảnh vào text không tự tạo khả năng thị giác cho model.

Code: [ghép attachment](C:/PBL6/frontend/src/chat/ChatPrimitives.tsx:362), [schema M4](C:/PBL6/backend/ai-service/app/chat/schemas.py:5); OpenAPI `/chat/sessions/{id}/messages` và `/me/conversations/{id}/messages` đều `maxLength:2000`.

Bằng chứng: [payload và response kiểm thử](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/browser-audit.json), [màn hình lỗi chat](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/chat-image-result.png). Đây là chat, không phải luồng thử đồ AI/gen ảnh.

### F05 P2 Nút xóa lịch sử AI chỉ ẩn trên trình duyệt hiện tại

Xóa một phiên không phát request DELETE; chỉ ghi ID vào localStorage. Mở context mới với cùng tài khoản kiểm thử, phiên đã “xóa” xuất hiện lại. `Xóa toàn bộ lịch sử` cũng chỉ thêm ID của trang lịch sử đang tải vào danh sách ẩn.

Nếu muốn xóa thật, cần API sở hữu phiên và quy tắc xóa dữ liệu. Nếu chỉ ẩn ở thiết bị này, phải ghi đúng ý nghĩa đó trên nút/xác nhận; không gọi là xóa toàn bộ lịch sử.

Code: [deleteSession](C:/PBL6/frontend/src/features/customer/CustomerChatWidget.tsx:264), [clearAllSessions](C:/PBL6/frontend/src/features/customer/CustomerChatWidget.tsx:278). Bằng chứng JSON: số DELETE trước/sau đều 0, context mới thấy lại đủ hai phiên.

### F06 P2 Nút cộng trong giỏ không khóa theo tồn kho

Fixture trả tồn 2, số lượng đang mua 2 nhưng nút `+` vẫn enabled. Bấm tiếp vẫn gửi PATCH, rồi chỉ báo lỗi vượt tồn kèm correlation ID. Input cho đến 999 và không dùng tồn còn sẵn làm max. Người dùng không biết có thể mua tối đa bao nhiêu; cảnh báo hàng ít trong giỏ cũng chưa có.

Truyền tồn khả dụng vào điều khiển số lượng, khóa cộng tại max, kiểm tra cả nhập trực tiếp và có thông báo ngắn `Chỉ còn N sản phẩm`. Backend vẫn cần kiểm tra lại vì tồn có thể thay đổi sau khi trang đã tải.

Code: [QuantityInput](C:/PBL6/frontend/src/features/customer/CartPage.tsx:197). Bằng chứng: `cartPlusAtStockEnabled=true`, [lỗi sau bấm cộng](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/cart-stock-error.png).

### F07 P2 Đổi mật khẩu mất điều hướng tài khoản

`/change-password` hiển thị form đơn lẻ, không có sidebar đang dùng ở các trang tài khoản. Điều kiện `account` chỉ nhận `/customer/*` và `/profile`, bỏ sót route này dù sidebar có link Đổi mật khẩu.

Code: [điều kiện layout](C:/PBL6/frontend/src/live/LiveApp.tsx:396). Bằng chứng: [màn hình đổi mật khẩu](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/password.png).

### F08 P2 Customer vẫn thấy SKU nội bộ

Giỏ hiển thị `Đỏ / M · INTERNAL-RED-M`; sản phẩm một phân loại vẫn hiện `Mã hàng: INTERNAL-DEFAULT`; chi tiết đơn cũng hiện SKU. Tên phân loại đọc được đã có, nhưng chưa loại SKU khỏi giao diện Customer như tài liệu đề nghị. SKU không phải secret; vấn đề ở đây là nhiễu thông tin và không đáp ứng cách trình bày đã thống nhất.

Code: [CartProduct](C:/PBL6/frontend/src/live/CartProduct.tsx:75), [ProductDetail](C:/PBL6/frontend/src/features/customer/ProductDetail.tsx:454). Bằng chứng: [một phân loại](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/product-single.png), [giỏ](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/cart-desktop.png).

### F09 P2 Chọn voucher thiếu thao tác bằng bàn phím

Các thẻ voucher là DIV có onClick, không role, không tabindex và không input radio/checkbox. Phần mở voucher trong giỏ cũng là DIV có click handler. Người dùng bàn phím không thể thực hiện cùng luồng chọn voucher như người dùng chuột. Dùng button để mở và radio/checkbox có label để chọn; trả focus đúng về nút mở khi đóng modal.

Code: [thẻ voucher](C:/PBL6/frontend/src/features/customer/VoucherPicker.tsx:187). Bằng chứng: ba thẻ đều `tag=DIV`, `role=null`, `tabIndex=-1` trong JSON public.

### F10 P2 Sắp xếp Store chỉ sắp các sản phẩm của trang hiện tại

Code đọc `listStoreProducts` với page và size 20, sau đó `.sort()` bản sao `products.data.items`. Các nút giá/đánh giá có thể làm người dùng hiểu rằng đang sắp toàn bộ gian hàng, trong khi sản phẩm rẻ hơn ở trang sau không thể lên đầu trang đầu. Đây là finding từ code, chưa chạy đối chứng Store thật có hơn 20 sản phẩm.

Chuyển sort sang query backend với phân trang ổn định; hoặc giới hạn/ghi rõ chức năng nếu chỉ sắp một trang. Không dựng các nhóm “mới”, “bán chạy” bằng dữ liệu ngẫu nhiên của một trang.

Code: [query Store](C:/PBL6/frontend/src/features/customer/StorePage.tsx:56), [sort local](C:/PBL6/frontend/src/features/customer/StorePage.tsx:125).

## Đối chiếu đầy đủ 33 nhóm trong tài liệu

“Đã đạt” nghĩa là phần tương ứng hiện không còn tái hiện hoặc đã thay bằng luồng khác đáp ứng mục đích; không khẳng định mọi thay đổi đã được nghiệm thu nghiệp vụ BE.

| ID | Nhóm góp ý | Trạng thái | Kết quả hiện tại và hướng xử lý |
| --- | --- | --- | --- |
| B01 | Voucher một ô nhập, tự chọn ưu đãi tốt nhất, nút Áp dụng | Một phần | Modal đã có một ô nhập, nhưng mở ra không tự chọn mã nào dù có nhiều mã phù hợp. Auto-best cần so sánh quote theo giỏ và điều kiện thực, không chỉ lấy voucher giảm lớn nhất. Các ô nhập tay bổ sung của checkout hiện nằm trong phần mở rộng. |
| B02 | Giỏ hàng bớt chữ, khoảng cách đều, nút Thanh toán | Một phần | Bố cục đã thay nhiều, CTA hiện là Mua Hàng. Desktop rõ hơn nhưng mobile có F01; nhãn tổng/phí có F03. Đổi tên CTA thành Thanh toán sau khi sửa hành vi và thông tin tiền. |
| B03 | Đổi phân loại trực tiếp dưới tên sản phẩm | Một phần | Có đổi tại giỏ, không phải quay về chi tiết. Vẫn là nút Đổi phân loại dưới ảnh và mở select/form, chưa phải bấm vào tên phân loại như ảnh tham khảo. Không còn hướng dẫn thêm dòng mới rồi xóa dòng cũ. |
| B04 | Hover nút thêm vào giỏ đổi cam | Đã đạt | Kiểm tra computed style: nền trắng sang rgb(194,65,12), chữ trắng khi hover. |
| B05 | Bộ lọc giá bỏ chú thích, Max, Áp dụng | Đã đạt | Placeholder Max, nút Áp dụng và không còn đoạn hướng dẫn cũ. |
| B06 | Vạch cam dọc trong ô search | Đã đạt | Focus đúng input trên demo; không còn border trái/box-shadow của input. Focus ring đang bao toàn bộ khung search, đúng vị trí. |
| B07 | Sidebar bộ lọc không cuộn; bỏ mô tả search | Đã đạt | Wheel trong vùng sidebar cuộn scrollTop từ 0 đến 316, nút Áp dụng tới được trong viewport. Không còn câu Lọc để tìm món phù hợp… |
| B08 | Bỏ câu tự cập nhật mỗi 15 giây | Đã đạt | Không còn trong UI thông báo. |
| B09 | Thanh điều hướng phụ chỉ ở Home | Đã đạt | Code hiện chỉ mở trên pathname / hoặc menu mobile. Lưu ý yêu cầu B29 sau đó muốn giữ chính thanh này khi chuyển trang. |
| B10 | Chat: xóa, ảnh, tìm kiếm, bớt text phụ | Một phần | Đã có các nút ảnh và xóa AI nhưng chưa hoàn chỉnh: F04/F05. Tìm hội thoại Customer chưa có; search hiện chỉ có ở workspace Store. Một số mô tả và hướng dẫn Enter vẫn còn. |
| B11 | Nút mở rộng chat Store giống AI; sửa thu nhỏ/đóng | Đã đạt | Hai tab dùng cùng ChatCenter. Thử mở rộng 700→1080 px, thu nhỏ, khôi phục, đóng đều hoạt động. |
| B12 | Bỏ khối Theo dõi hồ sơ và tiếp tục ở mở Store | Đã đạt | Khối cũ không còn trên trạng thái hồ sơ chờ duyệt được kiểm tra. Giữ thông báo cần xử lý khi có lỗi hoặc kết quả gửi chưa rõ. |
| B13 | Căn ba link auth dưới form đổi mật khẩu | Đã đạt | Khi đã đăng nhập, AuthPage không còn render ba link đó dưới form đổi mật khẩu. |
| B14 | Card đơn: Store, trạng thái, bớt metadata, xN, tổng số món | Một phần | Store/trạng thái góc phải và card đã đổi. Vẫn có dòng ảnh hiện tại với ảnh fallback; xN còn cạnh phân loại thay vì mép phải; tổng chưa có số món. Ghi chú ảnh fallback có ý nghĩa phân biệt ảnh hiện tại và snapshot, nên đưa vào tooltip/chi tiết thay vì làm mất ý nghĩa. |
| B15 | Bỏ các mục thừa trong tài khoản, gộp đổi trả vào đơn | Một phần | Sidebar đã rút bớt và Đổi trả có trong dãy trạng thái đơn. Trang trung tâm tài khoản vẫn có các ô Tin nhắn, Thông báo, Đổi trả; cần thống nhất phạm vi bỏ sidebar hay cả hub. |
| B16 | Sổ địa chỉ: nút, phone, mặc định, màu xóa | Một phần | Nút thêm đã tách header, tên/phone có khoảng cách và dấu phân cách, thao tác được bố trí lại. Badge Mặc định vẫn ở trái dưới địa chỉ. Nút xóa hiện là text action ở địa chỉ không mặc định; không nên đổi thành chữ trắng nếu không có nền đủ tương phản. |
| B17 | Đổi mật khẩu mất sidebar | Còn lỗi | Tái hiện trên demo, F07. |
| B18 | Bỏ/đổi tiêu đề Tài khoản của bạn trong menu | Thiết kế/copy | Text vẫn còn trong dropdown tài khoản. Không phải lỗi thao tác; có thể bỏ vì đã có tên nút Tài khoản. |
| B19 | Tồn kho đạt max phải khóa nút cộng và báo rõ | Còn lỗi | Tái hiện F06. Lỗi hiện vẫn kèm correlation ID trực tiếp trong thông báo. |
| B20 | Trong giỏ báo chỉ còn ít sản phẩm | Còn lỗi | Fixture tồn 2/3 không có nhãn hàng ít tại các dòng giỏ. Cần chốt điều kiện dưới 3 hay từ 3 trở xuống vì ví dụ trong tài liệu chưa khớp câu mô tả. |
| B21 | Bỏ Thành tiền dự tính | Đã đạt | Không còn đúng text cũ. Cần sửa nhãn mới theo F03 để không biến tạm tính thành tổng thanh toán chưa chính xác. |
| B22 | Chi tiết sản phẩm: border số lượng, bỏ chữ phụ/mã đơn phân loại | Một phần | Điều khiển số lượng hiện có các đường phân cách đều; các câu giá/tồn cũ đã bỏ. Một phân loại vẫn có Mã hàng: SKU, F08. |
| B23 | Bỏ form đánh giá dài phía dưới chi tiết sản phẩm | Đã đạt | Đã thay bằng CTA đến đơn hoàn tất; không còn form chọn order item trực tiếp ở trang sản phẩm. |
| B24 | Bỏ link Giỏ hàng ở cuối chi tiết sản phẩm | Thiết kế/copy | Link vẫn còn. Đây là yêu cầu tinh giản; không phải lỗi chức năng. |
| B25 | Customer chỉ thấy tên phân loại, không thấy SKU | Một phần | Phân loại tiêu chuẩn và màu/size đã có, nhưng vẫn ghép thêm SKU tại nhiều nơi, F08. Có thể dùng variantLabel hiện có; không nhất thiết tạo thêm field bắt buộc mới nếu dữ liệu trục đã đủ tên hiển thị. |
| B26 | Bỏ khối đếm sản phẩm ở đầu danh sách | Thiết kế/copy | Khối catalog-total vẫn hiện. Chỉ là lựa chọn mức độ thông tin; tổng kết quả có thể hữu ích khi đang lọc. |
| B27 | Đổi sort Tên sản phẩm thành Mặc định | Thiết kế/copy | Home chưa đổi; search dùng Liên quan nhất. Cần giữ đúng ý nghĩa thuật toán, không chỉ đổi tên một sort theo title thành xếp hạng khác. |
| B28 | Trang Store có campaign/banner/nhóm sản phẩm | Tính năng mới | Hiện có giới thiệu, phí cơ bản, voucher, tìm trong shop và danh sách. Campaign, nổi bật, mới, bán chạy chưa có đủ nguồn dữ liệu/quản lý nội dung; tách thành scope FE+BE. Có thêm vấn đề sort F10. |
| B29 | Bỏ Tin nhắn và giữ bar khi click các mục từ Home | Cần chốt | Bar vẫn có Tin nhắn và biến mất ở các trang khác theo B09. B09/B29 nói về cùng thanh nhưng yêu cầu khác nhau. Nên chốt theo nhóm route, không tùy đường người dùng đã đi vào trang. |
| B30 | Thông báo: CTA phải, outline trắng, nền đọc/chưa đọc, bulk phải | Đã đạt | Desktop đã theo hướng này, không còn nhãn đọc/chưa đọc trong từng item. Mobile còn cần xếp CTA xuống dưới hoặc giảm icon/gap để nội dung không bị ép thành cột hẹp. |
| B31 | Menu … trên đơn bị tràn nội dung | Đã đạt | Card hiện dùng các nút thao tác trực tiếp; menu cũ không còn để tái hiện đúng lỗi ảnh báo. |
| B32 | Chi tiết đơn bớt text, back, vận chuyển, lịch sử | Một phần | Đã có back mũi tên và Thông Tin Vận Chuyển, lịch sử đưa vào mở rộng. Vẫn có nút Làm mới và một dòng gợi ý trạng thái; không còn khối Bước tiếp theo cũ. Nên giữ khả năng đọc lại khi lỗi/chưa rõ kết quả, không xóa mọi cách phục hồi. |
| B33 | Tab Đổi trả lệch hệ thống tab đơn | Một phần | Đã nằm trước Đã hủy, nhưng vẫn dùng viền/nút khác các tab trạng thái. Mobile xuống nhiều hàng, chưa thành một hệ điều hướng nhất quán. |

## Điểm UI UX bổ sung

- Text `Shopee Voucher` và accessible label `Chọn Shopee Voucher` còn trong sản phẩm mang thương hiệu PBL6. Nên thống nhất thành Ưu đãi/Mã giảm giá của PBL6, thay vì bê tên thương hiệu từ ảnh tham khảo.
- Badge `Yêu thích` trong giỏ và card đơn là text hardcode, không dựa vào trạng thái đã lưu hay dữ liệu xác nhận loại Shop. Không nên hiển thị tín hiệu tin cậy/tình trạng người dùng khi thiếu căn cứ.
- Trên 390 px, thông báo đặt thumbnail, nội dung và CTA trên cùng hàng làm nội dung còn khoảng một cột chữ hẹp, ngày bị ngắt xuống dòng. Không bị overflow toàn trang nhưng vẫn khó đọc.
- Một số thao tác nhỏ đã đúng về chức năng nhưng cần đồng bộ tên: Thanh toán/Mua Hàng, Store/Shop/Gian hàng/Cửa hàng, Xem đơn/Xem Chi Tiết. Ưu tiên nhãn đúng bước, tránh title case cho mọi từ.

## Thứ tự xử lý đề nghị

1. Giỏ/checkout: F01–F03 và F06; kiểm tra ở 320/390/768/1366 px, test tồn max, nhập trực tiếp, xóa nhiều dòng và dữ liệu hàng chưa tải đủ.
2. Chat: chốt upload media và xóa/ẩn lịch sử thật trước khi làm đẹp thêm nút. Test reload, context trình duyệt khác và phân trang lịch sử.
3. Điều hướng/khả năng truy cập: F07–F09, tab đổi trả, focus modal, SKU theo vai trò và copy.
4. Storefront: chốt dữ liệu campaign/featured/new/bestseller và sort server; không trình bày demo giả như dữ liệu có thật.

Đợt này chỉ rà soát, tạo bằng chứng và báo cáo; không sửa hoặc deploy mã ứng dụng.

## Bằng chứng kiểm chứng

- [Nội dung trích xuất DOCX và ánh xạ ảnh](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/source/extracted.json)
- [26 trạng thái UI của bundle public](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/browser-audit.json)
- [Kiểm tra tương tác bổ sung](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/public/extra-verification.json)
- [Script UI có fixture API](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/audit-ui.cjs)
- [Script đo và kiểm tra hành vi](C:/PBL6/outputs/bug-ui-ux-audit-2026-11-14/audit-extra.cjs)
