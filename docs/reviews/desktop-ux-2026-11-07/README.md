# Review desktop: luồng mua bán, nghiệp vụ và độ quá tải thông tin

Ngày review: 07/11/2026. Đối tượng: PBL6 Market. Phạm vi: desktop, nghiên cứu và đề xuất; không thay đổi frontend/backend và không deploy.

## 1. Kết luận

**PBL6 đang đưa quá nhiều thông tin vận hành vào cùng tầng với thông tin ra quyết định.** Người dùng phải tự phân biệt trạng thái nào quan trọng, số tiền nào cần nhớ, và nút nào là bước tiếp theo. Có màn nhiều chữ nhưng vẫn thiếu ngữ cảnh; có màn rất rộng nhưng chỉ xem được một hoặc hai bản ghi.

Ưu tiên sửa: **checkout → lịch sử đơn người mua → hàng đợi đơn người bán → kho → biến thể → kiểm duyệt**. Không nên bắt đầu bằng đổi font, thêm animation hay tăng khoảng trắng trên toàn bộ hệ thống.

Trang chủ và khối mua sản phẩm không phải các màn rối nhất trong lượt review. Giỏ hàng chia theo shop, tab sửa sản phẩm, bộ lọc thu gọn và bản xem trước điều chỉnh kho là những nền tảng tốt cần giữ.

Đây là đánh giá chuyên gia dựa trên giao diện và mã nguồn, chưa phải kết quả usability test với người dùng thật. Tác động đến tỷ lệ mua, thời gian thao tác và sai sót là giả thuyết cần đo, không phải số liệu đã chứng minh.

## 2. Cách kiểm tra và giới hạn

- Quan sát trực tiếp bản demo tại [demo.congnguyen.me](https://demo.congnguyen.me/), dùng dữ liệu mẫu và các tài khoản demo chủ An Nhiên, khách A, quản trị.
- Desktop chính: **1440 × 900**. Kiểm tra bổ sung checkout và các màn quản trị tại **1366 × 768**. Không review mobile.
- Các view đã xem: trang chủ; chi tiết sản phẩm; giỏ hàng; checkout thiếu địa chỉ và checkout hai shop; lịch sử/chi tiết đơn khách; tổng quan seller; danh sách và modal đơn seller; kho và modal điều chỉnh; danh sách sản phẩm; sửa thông tin chung; biến thể; danh sách/chi tiết đổi trả; vận đơn; trạng thái rỗng giao thất bại; báo cáo seller; dashboard admin; danh mục; kiểm duyệt sản phẩm; đơn toàn sàn.
- Đối chiếu mã nguồn local đang có nhiều thay đổi chưa commit, trên nền HEAD `8fe0ab9`. Không khẳng định demo đang chạy đúng toàn bộ mã local. Các phát hiện giao diện bên dưới đều ghi nhận từ demo; mã nguồn giúp xác định vị trí xử lý.
- Chỉ xem và mở form; không gửi đơn, trả tiền, đổi trạng thái, lưu kho, duyệt sản phẩm hay gửi tin nhắn. Có đăng nhập/chuyển tài khoản demo; cuối lượt đã trở lại tài khoản chủ An Nhiên.
- Shopee: đọc tài liệu chính thức và nội dung công khai qua tìm kiếm. Trình duyệt gặp bước xác minh, nên **không kiểm tra trực tiếp checkout/seller portal sau đăng nhập**. Lazada: xem trực tiếp trang chủ desktop, đọc nguồn chính thức về đặt hàng, giao nhận và đổi trả; chưa vào checkout/seller portal có đăng nhập.
- Các trạng thái lỗi mạng, thanh toán chưa rõ kết quả, tranh chấp, hoàn tiền thất bại và hồ sơ giao thất bại có dữ liệu chưa được thao tác end-to-end. Không dùng lượt review này để kết luận chúng có lỗi xử lý tiền/kho.

## 3. Học gì từ business và flow Shopee/Lazada?

### 3.1. Giá trị cốt lõi của sàn

Sàn kết nối nguồn cung của người bán với nhu cầu của người mua, đồng thời hỗ trợ tìm kiếm, tạo niềm tin, thanh toán, giao nhận và xử lý sau bán. Lazada mô tả marketplace cùng các dịch vụ thanh toán, chăm sóc khách hàng, phân phối và phân tích marketing trong [giới thiệu chính thức](https://group.lazada.com/en/about/).

Shopee có các nguồn thu từ phí giao dịch, quảng cáo và dịch vụ bổ sung như logistics, theo [báo cáo thường niên Sea FY2024](https://cdn.sea.com/webmain/static/resource/seagroup/pressrelease/2024AR/NT8CQURDcqzIyTpTQ0SN/2025-04-17%20-%20Form%2020-F.pdf). Lazada cũng có công cụ quảng bá cho nhà bán, thể hiện trong [điều khoản Sponsored Affiliate](https://cdn.contract.alibaba.com/terms/common_product_agreement/20250723151801794/20250723151801794.html). Đây là bối cảnh mô hình, không phải bảng phí hiện hành.

**Áp dụng cho PBL6:** bảo đảm người mua chọn đúng hàng, hiểu đúng tiền và theo dõi được kết quả; seller xử lý đúng việc; admin can thiệp được ngoại lệ. Không cần thêm chương trình quảng bá, loyalty hay nhiều loại ưu đãi để làm sản phẩm giống sàn lớn. Việc bổ sung phí sàn, ví hay quyết toán cho seller là quyết định phạm vi riêng, không phải lỗi UI cần sửa trong lượt này.

### 3.2. Người mua: mỗi bước giải quyết một quyết định

Luồng tham chiếu Shopee: tìm/chọn sản phẩm → phân loại và số lượng → mua ngay hoặc giỏ hàng → kiểm tra địa chỉ, vận chuyển, thanh toán, ưu đãi → đặt hàng → thanh toán nếu cần. [Hướng dẫn chính thức](https://help.shopee.vn/portal/4/article/79180).

Lazada yêu cầu hiển thị phí vận chuyển/chi phí phát sinh ở bước thanh toán để người mua kiểm tra trước khi xác nhận. Chính sách trả hàng được nêu theo từng sản phẩm và có hướng dẫn từng bước. [Mua bán hàng hóa](https://cdn.contract.alibaba.com/terms/common_platform_service/20260713175615185/20260713175615185.html?lng=en), [đổi trả](https://cdn.contract.alibaba.com/terms/common_platform_service/20260713181356461/20260713181356461.html?lng=en).

**Thiết kế đích PBL6:**

| Bước | Câu hỏi cần trả lời | Thông tin chính |
|---|---|---|
| Tìm món | Có đúng món mình cần? | Ảnh, tên, giá, phân loại, bộ lọc |
| Chi tiết sản phẩm | Chọn loại nào, có phù hợp không? | Ảnh, biến thể, giá đúng lựa chọn, tồn, đánh giá, tóm tắt giao/đổi trả có căn cứ |
| Giỏ hàng | Mua những gì và bao nhiêu? | Chọn hàng theo shop, phân loại, số lượng, tạm tính |
| Checkout | Gửi đâu, trả bao nhiêu, trả thế nào? | Địa chỉ đã chọn; tiền hàng/phí/giảm; phương thức; tổng và nút đặt |
| Theo dõi đơn | Đơn tới đâu, mình cần làm gì? | Một trạng thái nổi bật, bước tiếp theo, sản phẩm và tổng tiền |
| Đổi trả | Gửi gì, gửi đâu, ai chịu phí, khi nào có kết quả? | Mặt hàng, lý do, hạn, trách nhiệm phí, tiến trình và khoản hoàn |

PBL6 có nghiệp vụ thanh toán khác nhau theo shop. Giữ khả năng này, nhưng có thể cung cấp lựa chọn chung cho các shop đủ điều kiện rồi cho phép sửa từng shop. Trước khi đặt vẫn phải cho thấy rõ shop nào trả trước, shop nào COD và số tiền tương ứng. Không gom các khoản thành một lời hứa thanh toán duy nhất khi backend vẫn xử lý riêng.

### 3.3. Người bán: ưu tiên hàng đợi công việc

Tài liệu Shopee tổ chức xử lý theo chờ xác nhận, chuẩn bị, đóng gói, giao, hủy và hết hàng; giao thất bại được theo dõi riêng với bước nhận lại/nhập kho. [Quản lý đơn](https://help.shopee.vn/portal/1/article/98754), [giao không thành công](https://help.shopee.vn/portal/1/article/102523). Tài liệu này mô tả Kênh Quản Lý Shop, không chứng minh toàn bộ giao diện Seller Center hiện tại giống hệt.

**Thiết kế đích PBL6:** vào seller → thấy việc cần làm → mở đơn/hồ sơ → kiểm tra hàng/tiền → thực hiện một bước hợp lệ → thấy kết quả và việc kế tiếp.

Giữ riêng các trục nghiệp vụ **đơn hàng, thanh toán, vận chuyển, đổi trả và tồn kho** trong hệ thống. UI trình bày một trạng thái chính theo vai trò, cùng các tín hiệu phụ khi liên quan. Ví dụ: “Đã giao · Chờ đối soát COD”; không biến “đã giao” thành “đã thu tiền”. Seller chuẩn bị/bàn giao; Delivery xác nhận hành trình; tiền theo kết quả đối soát. Đây cũng là ranh giới trong thiết kế giao nhận local hiện tại.

### 3.4. Admin: ưu tiên ngoại lệ

PBL6 nên dẫn admin tới hồ sơ cần quyết định: gian hàng chờ duyệt, sản phẩm cần xử lý, giao nhận bất thường, hoàn tiền cần can thiệp. Số người dùng và tổng giá trị đơn là thông tin theo dõi, không thay thế hàng đợi công việc. Đây là đề xuất cho PBL6, không phải kết luận đã quan sát admin nội bộ Shopee/Lazada.

## 4. Phát hiện ưu tiên

P1: ảnh hưởng trực tiếp khả năng hiểu hoặc hoàn tất tác vụ chính. P2: tăng thời gian đọc/tìm hoặc gây thiếu nhất quán. Không phát hiện P0 về mất tiền/mất dữ liệu qua phương pháp review này.

### F01 — P1: Checkout có nhiều tầng tổng hợp và giấu nút đặt trong khung cuộn

**Bằng chứng:** checkout hai shop, bốn dòng hàng, sáu sản phẩm. Mỗi shop lặp ở danh sách hàng, chọn thanh toán, voucher, chi tiết tiền và tổng hợp thanh toán. Hai thông báo hết hạn cùng xuất hiện: giờ hết hiệu lực và đồng hồ đếm ngược.

Ở 1366 × 768, sau khi tới phần địa chỉ: khung tóm tắt có `clientHeight` 556px nhưng nội dung 780px; nút Đặt hàng ở y≈909–949px, ngoài viewport. Ở 1440 × 900 cũng có cuộn bên trong khung. Người dùng phải quản lý cả cuộn trang và cuộn tóm tắt.

**Sửa:** giữ một tổng hợp tiền chung; hiển thị ngắn khoản COD/chuyển khoản khi cần phân biệt; chi tiết tính tiền từng shop mở theo yêu cầu. Đưa tổng và Đặt hàng vào phần luôn thấy của khung, không cuộn cùng các dòng tham khảo. Địa chỉ mặc định hiển thị dạng bản tóm tắt + “Thay đổi”; lựa chọn khác mở khi cần. Không biến bốn mục neo hiện tại thành wizard bốn trang nếu chỉ làm tăng số lần bấm.

**Giữ hiển thị:** tổng tiền, phí, giảm giá đã áp dụng, phân bổ theo phương thức nếu có, thay đổi giá và trạng thái chưa rõ kết quả. Chỉ thu gọn chính sách dài; hạn/chi phí quan trọng vẫn cần một dòng tóm tắt.

Ảnh: [checkout desktop](evidence/customer-checkout.png), [1366 × 768](evidence/checkout-1366.png), [toàn trang](evidence/customer-checkout-full.png).

Mã liên quan: `frontend/src/features/customer/CheckoutPage.tsx:830`, `:1060`, `:1178`, `:1277`; `frontend/src/live/commerce.css:1178`.

### F02 — P1: Lịch sử đơn của khách có quá nhiều dữ liệu nội bộ

**Bằng chứng:** mỗi đơn hiện UUID shop đầy đủ, “Store hiện tại”, giờ tạo tới giây kèm múi giờ, ghi chú ảnh hiện tại, chuỗi trạng thái đơn + tiền + phương thức. Tab có cả “Chờ xác nhận”, “Đã xác nhận”, “Chuẩn bị hàng”. Tại 1440 × 900, thẻ đầu cao khoảng 350px; viewport chủ yếu đủ một thẻ và phần đầu thẻ kế tiếp.

**Sửa:** đầu thẻ là tên shop và trạng thái; giữa là ảnh/tên, phân loại, số lượng; cuối là tổng tiền và hành động phù hợp. Mã đơn ngắn để tra cứu. UUID và thông tin đối chiếu đặt trong chi tiết hỗ trợ. Rút thời gian trong danh sách còn ngày; thời điểm chính xác ở chi tiết.

Tab người mua đề xuất: Tất cả / Chờ thanh toán / Chờ giao / Đang giao / Hoàn tất / Đổi trả; đơn hủy có thể là bộ lọc phụ. “Chờ giao” chỉ là nhóm hiển thị cho các trạng thái nội bộ, không đổi state machine.

Nếu ảnh lấy từ sản phẩm hiện tại thay vì ảnh giao dịch, vẫn giữ cách giải thích nguồn ảnh truy cập được; không trình bày như ảnh lịch sử đã chốt.

Ảnh: [lịch sử đơn khách](evidence/customer-orders.png). Mã: `frontend/src/features/customer/OrderHistoryPage.tsx:67`, `:121`; `frontend/src/components/OrderListTools.tsx:249`, `:351`.

### F03 — P1: Danh sách đơn seller ưu tiên lưu trữ hơn công việc

**Bằng chứng:** mặc định Tất cả; các đơn hoàn tất mới nhất đứng đầu, đơn chờ xác nhận nằm thấp hơn. Dòng chờ xác nhận có cả trạng thái, badge “Cần xác nhận” và câu “Kiểm tra hàng và xác nhận đơn”. Ảnh/phân loại/người nhận/thời gian/tiền đều cùng nằm trên một dòng cao. Tại viewport đã xem chỉ đọc được khoảng hai đơn đầu.

**Sửa:** thêm view “Cần xử lý”, nhóm theo việc cần làm và gắn số lượng thực từ server; vẫn giữ Tất cả để tra cứu. Dòng tóm tắt gồm mã, người mua, một tóm tắt món và số lượng, tình trạng liên quan, tiền và một hành động. “Xác nhận đơn”, “Chuẩn bị hàng”, “Xem vận đơn” có thể mở bước kiểm tra tương ứng trước khi thực thi. Không tự động thực hiện nghiệp vụ chỉ vì người dùng bấm vào dòng.

Không cần bulk action trong đợt giảm rối đầu tiên: nó làm tăng yêu cầu kiểm tra quyền, dữ liệu cũ và xác nhận hàng loạt.

Ảnh: [danh sách đơn seller](evidence/seller-orders.png). Mã: `frontend/src/live/SellerWorkspace.tsx:1340`; `frontend/src/components/OrderQueue.tsx:16`.

### F04 — P1: Kho có nhiều lớp điều hướng nhưng ít thông tin quét được

**Bằng chứng:** sidebar + bộ lọc tồn + năm tab nghiệp vụ; mỗi SKU có ảnh, chú thích “Ảnh hiện tại”, tên/phân loại/SKU, hai link và hai nút. Nút nổi bật đầu màn là “Đọc lại tồn kho và đối chiếu”. Tên “Tồn thương mại” cần người dùng hiểu mô hình kho.

**Sửa:** view hằng ngày là số có thể bán, đang giữ và hàng cần bổ sung. Đặt nhập/điều chỉnh kho là hành động nghiệp vụ; làm mới là nút phụ. Nhóm lịch sử/đối chiếu/thống kê vào khu vực tra cứu. Cho tên sản phẩm, phân loại, SKU thành các dòng có phân cấp; chuyển link xem/sửa sản phẩm vào menu phụ. Không xóa số đang giữ hoặc các ràng buộc khi điều chỉnh.

Form điều chỉnh hiện có lựa chọn loại, lý do và số trước → sau là tốt. Giữ kiểm tra này; dùng câu hướng dẫn cụ thể theo loại điều chỉnh thay vì một câu tăng/giảm chung.

Ảnh: [kho](evidence/seller-inventory.png), [form điều chỉnh](evidence/inventory-adjustment.png). Mã: `frontend/src/live/SellerWorkspace.tsx:505`, `:1151`.

### F05 — P1: Kiểm duyệt sản phẩm đang giống danh mục trưng bày

**Bằng chứng:** mỗi sản phẩm có UUID, shop/UUID shop, hai trạng thái, mô tả và bộ ảnh; áo Everyday có 12 nút phóng to. Admin phải cuộn qua nội dung đầy đủ của nhiều sản phẩm để tìm đối tượng cần xử lý. Phần đầu vẫn mang tiêu đề “Taxonomy và kiểm duyệt”.

**Sửa:** dùng hàng đợi tóm tắt: ảnh đại diện, tên, shop, trạng thái/lý do cần xử lý và thời điểm. Chọn một sản phẩm mới mở mô tả, gallery, thuộc tính và quyết định trong trang chi tiết hoặc panel đủ rộng. Có bộ lọc cho vấn đề cần xử lý khi dữ liệu hỗ trợ; không dựng số “chờ duyệt” nếu backend chỉ có hiển thị/bị ẩn.

Ảnh: [kiểm duyệt](evidence/admin-moderation.png). Mã: `frontend/src/features/admin/ProductModeration.tsx:206`, `:214`, `:216`.

### F06 — P1: Kiểm hàng trả thiếu bản tóm tắt định danh trước khi nhập

**Bằng chứng:** khi mở yêu cầu đã duyệt có dữ liệu kiểm hàng, đầu trang chuyển thành “Kiểm hàng trả”. Mã hồ sơ/đơn không nổi bật ở đầu, form nhiều ô số lượng xuất hiện trước lý do và giá trị 1.027.000₫. Với hai mặt hàng, thông tin tiền và trách nhiệm phí đã xuống dưới viewport đầu.

**Sửa:** đầu trang cố định ngữ cảnh: mã yêu cầu, mã đơn, loại yêu cầu, trạng thái và bước hiện tại. Dưới đó là món cần kiểm cùng số dự kiến/thực nhận/phân loại chất lượng. Tổng thiếu/chờ kiểm luôn thấy; trạng thái hoàn tiền tách rõ với trạng thái kiểm hàng. Lịch sử và chính sách dài thu gọn. Không tự động coi “đã nhận hàng” là “bán lại được” và không gộp lưu kiểm hàng với xác nhận hoàn tiền.

Ảnh: [kiểm hàng trả](evidence/seller-return-detail.png), [toàn trang](evidence/seller-return-detail-full.png). Mã: `frontend/src/features/returns/ReturnsPage.tsx:351`; `frontend/src/features/returns/ReturnRequestView.tsx:75`; `frontend/src/features/returns/ReturnInspectionFields.tsx:24`.

### F07 — P2: Tab biến thể lặp toàn bộ danh sách SKU

**Bằng chứng:** 12 biến thể xuất hiện trong trình sửa, rồi cả 12 SKU/giá/trạng thái xuất hiện lần nữa trước form thêm biến thể. Danh sách sau hiện `ACTIVE` bằng tiếng Anh.

**Sửa:** một danh sách duy nhất, đổi giá hàng loạt đặt trong toolbar khi cần; thêm biến thể mở form riêng từ nút. Giữ preview giá và cách áp dụng vào bản nháp; không tự lưu hàng loạt sau khi nhập giá chung.

Ảnh: [biến thể](evidence/product-variants.png), [toàn trang](evidence/product-variants-full.png). Mã: `frontend/src/bootstrap/ProductEdit.tsx:443`, `:457`.

### F08 — P2: Sidebar seller/admin quá phẳng; phần khung chiếm nhiều chiều cao

**Bằng chứng:** seller có 13 mục, admin có 14; nhật ký/cấu hình nằm cùng cấp với đơn và hàng. Logo/header, về mua sắm, thu gọn menu, breadcrumb và tiêu đề lặp chiếm phần trên. Ở admin 1366 × 768, các mục dưới sidebar ra ngoài vùng đầu màn.

**Sửa:** chia nhóm Tổng quan / Bán hàng / Hàng hóa / Tài chính / Thiết lập. Đơn, vận đơn, đổi trả và giao thất bại nằm gần nhau trong nhóm Bán hàng; giữ route và khả năng truy cập từng màn. Menu phụ theo quyền. Thu gọn phần khung, cho tiêu đề nhiệm vụ hiện tại thay “Quản trị hệ thống” lặp ở mọi tab.

“Thu gọn menu” là tùy chọn, không phải cách duy nhất để nội dung vừa màn hình. Không thay toàn bộ bằng icon mất nhãn.

Ảnh: [seller overview](evidence/seller-overview.png), [admin dashboard](evidence/admin-dashboard.png). Mã: `frontend/src/live/LiveApp.tsx:282`, `:328`, `:389`.

### F09 — P2: CTA nghiệp vụ cạnh tranh với làm mới và hủy

**Bằng chứng:** modal đơn chờ xác nhận hiển thị luôn form lý do hủy; nút Làm mới cũng được tô accent. Chi tiết đơn khách có nút Làm mới nổi bật gần tiêu đề, trạng thái “Chờ cửa hàng xác nhận” được diễn đạt lại bằng câu bên dưới. Chat seller dùng pill xanh đậm trong hệ thống hành động cam.

**Sửa:** một hành động chính theo bước. Hủy đơn mở form/confirm riêng khi được chọn, giữ nguyên khả năng hủy hợp lệ. Làm mới dùng kiểu phụ. Trạng thái nổi bật một lần, hướng dẫn chỉ bổ sung việc cần làm hoặc người đang chờ. Chat giảm độ nổi khi không có tin chưa đọc, bảo đảm không đè nút/bảng ở đáy.

Ảnh: [modal seller](evidence/seller-order-detail.png), [đơn khách](evidence/customer-order-detail.png).

### F10 — P2: Dashboard có số tổng nhưng ít chỉ dẫn ưu tiên

**Bằng chứng:** seller có tổng sản phẩm/tổng SKU/tổng đơn, phí giao lặp trong hai khối và onboarding vẫn mở dù đã cấu hình. Cảnh báo đổi trả bằng 0 vẫn dùng kiểu cần chú ý. Admin nổi bật sáu số tổng, không có hàng đợi ngoại lệ hay kỳ thời gian ngay cạnh các số.

**Sửa:** seller đặt việc cần làm lên trước, onboarding đã đủ điều kiện thì thu gọn. Admin ưu tiên việc cần quyết định và kỳ dữ liệu; các số tiền phải phân biệt giá trị đặt hàng, hàng hoàn tất, tiền đã thu, tiền đã hoàn. Không gọi tiền đã thu là doanh thu/lợi nhuận và không suy ra tiền có thể rút khi chưa có quyết toán.

Ảnh: [seller](evidence/seller-overview.png), [admin](evidence/admin-dashboard.png), [báo cáo seller](evidence/seller-report.png). Mã: `frontend/src/live/SellerWorkspace.tsx:122`, `:160`; `frontend/src/features/admin/AdminLiveData.tsx:37`.

### F11 — P2: Cấu hình danh mục trộn xem, tạo và sửa

**Bằng chứng:** hai cột danh mục/loại sản phẩm đều có danh sách rồi form tạo rồi form sửa. Tiêu đề và trạng thái có “Taxonomy”, `ACTIVE`. Code tạo và sửa dùng chung giá trị tên đang nhập; người dùng phải hiểu nút nào tác động lên đối tượng nào.

**Sửa:** danh sách trước; chọn bản ghi để sửa; Thêm mới mở form riêng với tiêu đề/ngữ cảnh riêng. Đổi tên hiển thị thành “Danh mục và loại sản phẩm”, dùng nhãn tiếng Việt. Thao tác cấu hình thường xuyên khác với quyết định kiểm duyệt; có thể giữ chung nhóm sidebar nhưng không trộn tác vụ trong một màn dài.

Ảnh: [danh mục admin](evidence/admin-catalog.png). Mã: `frontend/src/features/admin/AdminOperations.tsx:102`, `:108`.

### F12 — P2: Chi tiết sản phẩm thiếu phần giao/đổi trả ngắn trước quyết định mua

**Bằng chứng:** khối mua đang tập trung ảnh, giá, tồn, màu/cỡ/số lượng và CTA khá rõ. Chưa thấy tóm tắt giao/đổi trả trong khối đó. Phía dưới có cả sản phẩm liên quan và sản phẩm cùng shop, với các món trùng nhau trong ví dụ quan sát.

**Sửa:** bổ sung tóm tắt quyền lợi/phí có dữ liệu thật, link xem điều kiện; chỉ hiển thị ETA/phí chính xác khi đủ địa chỉ và dữ liệu. Một cụm gợi ý có chủ đích trước, bỏ trùng sản phẩm giữa hai nguồn. Giữ Mua ngay là CTA nổi bật, thêm giỏ là phụ; yêu thích không cần thêm link tới danh sách ngay cạnh khi đã có ở điều hướng.

Mã: `frontend/src/features/customer/ProductDetail.tsx` (khối mua, `CustomerRecommendations`, `StoreProductsSection`). Không dùng chính sách Shopee/Lazada làm lời hứa của PBL6.

## 5. Taste nên áp dụng

Hướng đề xuất: **sàn mua sắm rõ ràng, ấm và gọn; khu vận hành trung tính, ưu tiên quét dữ liệu**. Nền sáng và accent cam đất hiện tại có thể giữ. Chất lượng nên đến từ phân cấp, căn hàng, chữ và hành động nhất quán.

Trang chủ Lazada trực tiếp quan sát có banner chiến dịch, tải app và nhiều khối quảng bá. Shopee công khai cũng có sale, Mall, Live, danh mục và gợi ý. Không lấy những trang này làm chuẩn tối giản; chúng phục vụ nhiều mục tiêu kinh doanh hơn phạm vi PBL6.

Nguyên tắc nghiên cứu phù hợp là đưa tính năng/thông tin phụ ra sau yêu cầu của người dùng, giảm nội dung lặp và dùng phân cấp thị giác để định hướng chú ý: [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [cognitive load](https://www.nngroup.com/articles/minimize-cognitive-load/), [visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/). Đây là cơ sở phương pháp; các con số thiết kế dưới đây là đề xuất riêng cho PBL6.

| Thành phần | Quy ước đề xuất |
|---|---|
| Tiêu đề màn | 24–28px; tiêu đề khối 17–20px; nội dung 14–16px; thông tin phụ 12–13px |
| Màu | Một accent cho hành động; đỏ/vàng/xanh có ý nghĩa trạng thái; không tô cảnh báo khi không có việc cần làm |
| Khoảng cách | Theo nhịp 8px; khoảng 24px giữa nhóm; 12–16px trong nhóm. Không tăng padding mọi card |
| Bảng vận hành | Mục tiêu khoảng 6–8 dòng đơn giản nhìn được ở desktop; dòng phức tạp có thể mở chi tiết. Không ép đủ dòng bằng chữ nhỏ |
| Card | Một surface cho một đơn vị thông tin; dùng divider và tiêu đề con thay nhiều card lồng nhau |
| Nút | Một CTA chính theo tác vụ; phụ/trợ giúp/làm mới dùng cấp thấp hơn; nguy hiểm có ý nghĩa riêng |
| Trạng thái | Một trạng thái chính; payment/shipping/refund là phụ có nhãn rõ khi liên quan |
| Mã và dữ liệu kỹ thuật | Mã ngắn để hỗ trợ; UUID/payload/phien bản đầy đủ ở phần hỗ trợ, vẫn copy được khi cần |
| Chuyển động | Chỉ dùng phản hồi chọn, mở/đóng, loading nhẹ; không thêm animation liên tục vào màn giao dịch/bảng |

Không giảm ngộp bằng cách thu nhỏ chữ, cắt mất tên/tiền, giấu lỗi trong tooltip hoặc đóng hết nội dung bằng accordion. Người dùng vẫn cần đủ dữ liệu để quyết định ở ngay bước hiện tại. Tuân thủ `frontend/CONTENT_GUIDELINES.md`.

## 6. Cấu trúc màn đề xuất để triển khai

### Checkout

```text
Kiểm tra và đặt hàng

Nội dung chính                              Tóm tắt
Địa chỉ đang dùng            [Thay đổi]     Tiền hàng
                                           Phí giao hàng
Mây Xanh · món / loại / SL / tiền          Giảm giá đã áp dụng
Phí và phương thức của shop [Thay đổi]     Tổng phải trả

An Nhiên · món / loại / SL / tiền          COD / trả trước (khi cần phân biệt)
Phí và phương thức của shop [Thay đổi]     [Đặt hàng]

Mã ưu đãi                    [Chọn mã]     [Xem cách tính theo shop]
```

Giữ tổng/nút ngoài nội dung cuộn. Nhập mã thủ công mở từ bộ chọn, không bắt người mua nhìn sẵn n+1 ô voucher trống. Vẫn thể hiện rõ 2 shop tạo 2 đơn; không ẩn phí hoặc khoản thanh toán riêng.

### Hàng đợi seller

```text
Đơn hàng                         [Cần xử lý] [Tất cả]
Chờ xác nhận (n) · Chuẩn bị (n) · Giao nhận cần hỗ trợ (n)
Tìm đơn / người mua / SKU                         [Bộ lọc]

Mã + khách | Tóm tắt món | Việc cần làm | Số tiền | Hành động
```

Chọn đơn mở workspace: định danh + trạng thái + bước tiếp theo ở đầu; sản phẩm/địa chỉ ở phần chính; hành động và tiền liên quan ở vùng cạnh. Lịch sử, hủy đơn và đối chiếu mở khi cần.

### Đổi trả

```text
Yêu cầu #... · Đơn #... · Hoàn tiền / Đổi hàng
Trạng thái hiện tại · Ai cần làm gì

Món và số lượng cần xử lý         Giá trị / dự kiến hoàn có căn cứ
Form đúng bước hiện tại           Trách nhiệm phí / cảnh báo liên quan
[Lưu kiểm hàng / bước hợp lệ]      Trạng thái hoàn tiền

[Lịch sử] [Chính sách đầy đủ] [Thông tin hỗ trợ]
```

Đây là cấu trúc đề xuất, không phải mockup đã được kiểm tra với người dùng.

## 7. Thứ tự thực hiện và tiêu chí nghiệm thu

| Đợt | Phạm vi | Điều kiện hoàn tất |
|---|---|---|
| 1 | F01, F02, F03 | Checkout rõ phí/tổng/phương thức; nút đặt không mất trong khung cuộn. Khách tìm đơn không phải đọc UUID. Seller mở được hàng đợi cần làm ngay |
| 2 | F04–F09 | Kho quét được nhiều dòng hơn; bỏ danh sách SKU trùng; kiểm duyệt mở từng đối tượng; đổi trả có định danh và trạng thái trước form; làm mới/hủy có cấp phù hợp |
| 3 | F10–F12 | Dashboard ưu tiên công việc; cấu hình có ngữ cảnh tạo/sửa riêng; khối mua có giao/đổi trả ngắn, gợi ý không lặp |

Kiểm tra tại 1366 × 768 và 1440 × 900 bằng dữ liệu đại diện, không chỉ một đơn một món. Bao gồm checkout nhiều shop, COD/chuyển khoản hỗn hợp, voucher không hợp lệ, thay đổi giá, yêu cầu chưa rõ kết quả, đơn hoàn tiền, sản phẩm 12+ biến thể và hồ sơ trả thiếu/hỏng hàng.

Sau prototype, cho người dùng thử các tác vụ: mua một món; mua hai shop; tìm đơn cần thanh toán; seller chuẩn bị đơn; điều chỉnh một SKU; nhận trả thiếu một món; admin tìm đối tượng cần kiểm duyệt. Đo hoàn thành tác vụ, thời gian tìm hành động chính, lỗi và số lần cần trợ giúp; thiết lập baseline trước khi đặt mục tiêu phần trăm.

Các điều kiện tiền/kho, chống gửi trùng, quyền thao tác và cơ chế khôi phục phải được giữ khi làm gọn UI. Đổi nhóm hiển thị không đồng nghĩa đổi nghiệp vụ backend. Khi có frontend change thật: build và deploy theo AGENTS.md; lượt review này không có thay đổi frontend nên không chạy deploy.

## 8. Bằng chứng và nguồn bổ sung

29 ảnh trong [thư mục evidence](evidence/), bao gồm viewport, ba ảnh toàn trang và tham chiếu Lazada/Shopee. Ảnh có dữ liệu mẫu; các con số phản ánh thời điểm review, không dùng làm KPI hoạt động.

Các phần tương đối rõ: [giỏ nhiều shop](evidence/customer-cart.png), [danh sách sản phẩm seller](evidence/seller-products.png), [sửa thông tin chung](evidence/product-editor.png), [danh sách đổi trả](evidence/seller-returns.png), [vận đơn](evidence/seller-shipping.png), [trạng thái rỗng chuyển hoàn](evidence/seller-delivery-returns.png).

Tham chiếu: [trang chủ Lazada](evidence/lazada-home.png), [bước xác minh Shopee](evidence/shopee-access-check.png). Ảnh bước xác minh chỉ ghi nhận giới hạn truy cập, không đại diện giao diện mua hàng Shopee.

Nguồn nội bộ đã đối chiếu: `frontend/CONTENT_GUIDELINES.md`, `docs/implementation/live-demo-ui.md`, `docs/implementation/shipping-redesign-plan.md`, các route và component live. Tên file/line trong báo cáo trỏ mã local tại thời điểm review, có thể dịch chuyển sau khi code thay đổi.
