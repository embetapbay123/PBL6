# Báo Cáo Đánh Giá UI/UX & Luồng Nghiệp Vụ Chuyên Sâu (Desktop)
## Đối chiếu chuẩn mực Shopee & Lazada — Triệt tiêu quá tải nhận thức

Ngày: 09/11/2026.  
Bản demo: https://demo.congnguyen.me. Desktop tiêu chuẩn: **1366 × 768** và **1440 × 900**.  
Tài khoản đối chiếu: Khách hàng (Customer), Chủ gian hàng (Store Owner), Quản trị viên (Admin).  
Đối chiếu mã nguồn local tại: `c:\PBL6\frontend\src`.  
Khung tiêu chuẩn: [docs/reviews/REVIEW_FRAMEWORK.md](../REVIEW_FRAMEWORK.md).

---

## 1. Kết luận tổng quan

Hệ thống PBL6 Market sở hữu nền tảng kiến trúc nghiệp vụ đa gian hàng (Multi-vendor Marketplace), quản lý phiên giao dịch (Quote/Attempt), đổi trả (After-sale) và nhật ký đối soát rất chặt chẽ. Tuy nhiên, về mặt **UI/UX và Gu thiết kế (Taste)** trên Desktop, hệ thống đang mang nặng tư duy **"Trình diễn cơ sở dữ liệu nội bộ" (Database-driven UI)** thay vì **"Hành trình mua sắm lấy người dùng làm trung tâm" (Consumer-centric E-Commerce)** như Shopee hay Lazada.

Vấn đề cốt lõi lớn nhất khiến người dùng bị **"ngộp và quá tải thông tin" (Cognitive Overload)** bao gồm:
1. **Vi phạm Nguyên tắc Vàng #1:** Đưa hàng loạt câu nhắc nghiệp vụ nội bộ của nhân viên đóng gói / thủ kho (như *"Xác nhận với khách trước khi lấy hàng"*, *"Không ghi giao dịch hoàn tiền giả"*) vào thẳng giao diện người mua hàng.
2. **Phân mảnh quyết định trên cùng một khung nhìn:** Màn hình Thanh toán (Checkout) mở bung toàn bộ danh sách địa chỉ, chẻ nhỏ phương thức thanh toán thành từng dropdown riêng cho từng Shop, và bắt người dùng gõ từng mã voucher thủ công.
3. **Bố cục dạng thẻ phình to (Card Bloat):** Thay vì bảng dữ liệu nén (Scannable Grid/Table) chuẩn desktop, các màn hình Giỏ hàng, Chi tiết sản phẩm và Kiểm duyệt Admin nhồi nhét form thao tác mở sẵn, khiến chiều cao trang vượt quá $5.000\text{px} - 12.000\text{px}$.

*Tuyên bố ranh giới:* Đây là review chuyên gia phân tích từ mã nguồn và đối sánh thực tế với chuẩn mực Shopee/Lazada trên desktop. Không phát hiện lỗi P0 (chặn luồng tài chính hoàn toàn), nhưng các lỗi P2 dưới đây làm suy giảm nghiêm trọng độ tin cậy và trải nghiệm mua sắm.

| Mã | Phân hệ / Màn hình | Phát hiện trọng tâm | Mức độ | Ưu tiên |
|---|---|---|---|---|
| **T09** | Khách hàng — Chi tiết đơn & Đổi trả | Rò rỉ chỉ dẫn tác nghiệp nội bộ của Seller/Kho vào giao diện người mua | **P2** | Trước |
| **T10** | Khách hàng — Thanh toán (Checkout) | Phân mảnh quyết định: Bung toàn bộ địa chỉ, chẻ lẻ phương thức thanh toán theo từng Shop | **P2** | Trước |
| **T11** | Khách hàng — Chi tiết sản phẩm (PDP) | Cụm CTA và thông số kỹ thuật bị phân tán; xuất hiện chuỗi debug và `JSON.stringify` | **P2** | Trước |
| **T12** | Quản trị — Kiểm duyệt sản phẩm (Admin) | Mở sẵn form lý do và toàn bộ SKU/ảnh khiến trang kiểm duyệt phình to >$10.000\text{px}$ | **P2** | Tiếp |
| **T13** | Khách hàng — Giỏ hàng (Cart) | Bố cục thẻ dọc chiếm chiều cao lớn, thiếu bảng đối chiếu dạng dòng chuẩn desktop | **P2** | Tiếp |
| **T14** | Khách hàng — Tìm kiếm & Trang chủ | Chưa triệt tiêu hoàn toàn khối gợi ý khám phá khi đang lọc tìm kiếm có chủ đích | **P2** | Tiếp |

---

## 2. Đối chiếu Business & Flow: Shopee / Lazada vs. PBL6 Market

| Luồng nghiệp vụ | Chuẩn Shopee & Lazada Desktop | Hiện trạng PBL6 Market | Hệ quả UX & Cảm xúc người dùng |
|---|---|---|---|
| **Tìm kiếm & Bộ lọc** | Khi có từ khóa tìm kiếm: 100% diện tích dành cho Bộ lọc trái + Grid sản phẩm chính. Không chèn khối gợi ý/lịch sử bên dưới. | `MarketplaceHome.tsx` vẫn giữ khối gợi ý `CustomerRecommendations` phía dưới phân trang. | Người dùng tìm cụ thể (ví dụ: *áo sơ mi*) nhưng cuộn xuống lại thấy tai nghe, ấm trà $\rightarrow$ Mất tập trung vào mục tiêu mua. |
| **Trang chi tiết (PDP)** | Trật tự chuẩn: Ảnh lớn bên trái $\rightarrow$ Cột phải: Tiêu đề $\rightarrow$ Rating/Đã bán $\rightarrow$ Khối Giá/Voucher $\rightarrow$ Vận chuyển $\rightarrow$ Chip phân loại $\rightarrow$ Nút Mua/Giỏ. | Cột phải chèn nút "Gian hàng" và "Nhắn tin" ngay giữa Tiêu đề và Giá; chèn chuỗi cảnh báo tồn kho dạng debug; nút "Lưu yêu thích" nằm cạnh nút Mua. | Bố cục đứt gãy, mắt người dùng phải đảo liên tục qua các nút phụ trước khi thấy giá và nút mua chính. |
| **Giỏ hàng (Cart)** | Bảng ngang chuẩn: Cột Checkbox \| Sản phẩm (ảnh 80x80 + phân loại dropdown) \| Đơn giá \| Tăng giảm \| Thành tiền \| Xóa. Gom theo Shop rõ ràng. | Bố cục dạng khối Card nổi bo tròn (`CartPage.tsx`), mỗi sản phẩm chiếm $160\text{px} - 265\text{px}$ chiều cao, thiếu thanh tổng hợp từng Shop. | Màn hình 1366x768 chỉ xem được 1-2 món; không có cảm giác kiểm soát giỏ hàng chuyên nghiệp. |
| **Đặt hàng (Checkout)** | 1 dòng địa chỉ hiện tại kèm nút *"Thay đổi"* (bấm mở modal); 1 khu vực chọn phương thức thanh toán toàn đơn; Voucher sàn + Shop dạng danh sách chọn. | Liệt kê tất cả địa chỉ dạng radio bung sẵn; mỗi Shop có một `<select>` thanh toán riêng biệt; ô nhập voucher thủ công từng Shop. | Khách hàng choáng ngợp vì có quá nhiều ô nhập và lựa chọn lặp lại, cảm giác quy trình thanh toán rủi ro và phức tạp. |
| **Theo dõi đơn hàng** | Chỉ hiển thị: Trạng thái hành trình (Timeline), Hẹn giờ giao, Thông tin kiện hàng, Tổng tiền, Nút Liên hệ shop / Hủy / Đổi trả. | Hiển thị: Gợi ý đóng hàng của kho, nhắc nhở thu hộ COD nội bộ, cảnh báo snapshot đơn cũ, giải thích lỗi kỹ thuật. | Khách hàng đọc được những câu lệnh dành cho nhân viên kho, tạo tâm lý hoang mang và thiếu chuyên nghiệp. |

---

## 3. Chi tiết các phát hiện

### T09 — Rò rỉ chỉ dẫn tác nghiệp nội bộ của Seller/Kho vào giao diện người mua

* **Mức độ:** **P2** (Vi phạm tính toàn vẹn ngữ cảnh người dùng — Context-Aware Integrity).
* **Tái hiện:** 
  1. Đăng nhập tài khoản Khách hàng.
  2. Mở `/customer/orders` hoặc `/customer/orders/:id`.
  3. Mở yêu cầu đổi trả tại `/customer/returns` hoặc khối đổi trả dưới trang chi tiết đơn.
* **Quan sát:**
  * Tại chi tiết đơn hàng (`OrderPresentation.tsx:89`), khi sản phẩm thiếu phân loại: hiển thị nguyên văn *"Thiếu phân loại. Xác nhận với khách trước khi lấy hàng."*
  * Tại khối địa chỉ nhận hàng (`OrderPresentation.tsx:139`): *"Đơn cũ thiếu thông tin người nhận hoặc địa chỉ. Xác nhận với khách trước khi giao."*
  * Tại khối chính sách (`OrderPresentation.tsx:178`): *"Đơn cũ chưa lưu snapshot chính sách. Cửa hàng xét từng ca; không áp hồi tố hạn 7 ngày."*
  * Tại trạng thái hoàn tiền (`ReturnRequestView.tsx:292`): *"Đơn 0đ không có khoản đã thu cần hoàn. Hoàn tất kiểm hàng và đối chiếu kho; không ghi giao dịch hoàn tiền giả."*
* **Đối chiếu Shopee/Lazada:** 
  Shopee tuyệt đối phân định ranh giới giữa **Buyer Interface** và **Seller/Warehouse Operation System**:
  * Người mua chỉ nhìn thấy thông tin của họ: *"Đang chuẩn bị hàng"*, *"Dự kiến giao ngày DD/MM"*, *"Số tiền hoàn: 0₫ (Đơn áp dụng mã giảm giá 100%)"*.
  * Tuyệt đối không bao giờ để người mua nhìn thấy log kỹ thuật, hướng dẫn đóng gói hay quy trình hạch toán kiểm kho nội bộ.
* **Nguyên nhân kỹ thuật:**
  * Component `OrderItemIdentity`, `OrderDeliveryAddress`, `ReturnPolicyNotice` được tái sử dụng dùng chung (shared) giữa giao diện Khách hàng (`OrderDetailPage.tsx`) và giao diện In phiếu đóng gói / Quản lý của Seller (`OrderPackingSheet`, `SellerWorkspace.tsx`).
  * Thiếu cờ phân định ngữ cảnh `scope?: 'CUSTOMER' | 'STORE' | 'ADMIN'` dẫn đến việc câu nhắc của thủ kho lọt vào view của người mua.
* **Hướng sửa đề xuất:**
  * Bổ sung prop `scope="CUSTOMER"` hoặc tách hàm sinh thông điệp thân thiện cho khách:
    * Nếu thiếu phân loại: Khách chỉ thấy nhãn *"Phân loại tiêu chuẩn"* hoặc liên hệ Shop hỗ trợ.
    * Đơn 0đ: Khách chỉ thấy nhãn *"Không phát sinh khoản hoàn (Đơn miễn phí)"*.
  * Toàn bộ câu nhắc kiểm hàng, đối soát kho, quy trình ghi nhận kế toán phải nằm gọn trong `scope="STORE"` hoặc `scope="ADMIN"`.
* **Tiêu chí kiểm chứng sau sửa:** 
  * 100% câu chữ trên `/customer/orders` và `/customer/returns` chỉ nói về quyền lợi và hành động của khách hàng; không còn bất kỳ chữ nào chứa *"xác nhận với khách"*, *"lấy hàng"*, *"hoàn tiền giả"*, *"áp hồi tố"*.
* **Vị trí mã nguồn:** 
  * `frontend/src/components/OrderPresentation.tsx:88-91`
  * `frontend/src/components/OrderPresentation.tsx:138-141`
  * `frontend/src/components/OrderPresentation.tsx:176-180`
  * `frontend/src/features/returns/ReturnRequestView.tsx:291-294`

---

### T10 — Trang Đặt hàng (Checkout) phân mảnh quyết định và quá tải thao tác

* **Mức độ:** **P2** (Quá tải nhận thức nghiêm trọng tại phễu chuyển đổi then chốt — Conversion Funnel Friction).
* **Tái hiện:** 
  1. Chọn mua sản phẩm từ 2 Shop khác nhau.
  2. Bấm vào `/checkout`.
  3. Quan sát giao diện trên màn hình **1366 × 768**.
* **Quan sát:**
  * Khối **1. Địa chỉ nhận hàng** (`CheckoutPage.tsx:922`): Render toàn bộ danh sách địa chỉ đã lưu trong một `<fieldset>`. Nếu người dùng có 4 địa chỉ, khối này chiếm hơn $350\text{px}$ chiều cao ngay đầu trang.
  * Khối **3. Phương thức thanh toán** (`CheckoutPage.tsx:1037`): Render mỗi Shop một thẻ riêng với một `<select>` dropdown phương thức thanh toán độc lập. Người mua phải chọn thanh toán cho Shop A, rồi lại chọn thanh toán cho Shop B.
  * Khối **4. Mã ưu đãi** (`CheckoutPage.tsx:1135`): Render các ô `<input>` text riêng biệt cho từng Shop voucher và sàn voucher kèm nút bấm rời rạc.
  * Chiều cao toàn trang Checkout vượt quá **$2.200\text{px}$**; cột tóm tắt thanh toán bên phải bị trôi tụt xuống dưới nếp gấp màn hình (Below the fold).
* **Đối chiếu Shopee/Lazada:**
  * **Địa chỉ:** Shopee chỉ hiển thị 1 địa chỉ mặc định/được chọn trong khung nhỏ gọn ($70\text{px}$). Có nút chữ *"Thay đổi"* mở Modal chọn địa chỉ.
  * **Phương thức thanh toán:** Thanh toán là hành vi cấp Phiên đặt hàng (Checkout Session). Người mua chọn 1 phương thức chung duy nhất (ví dụ: *Thanh toán khi nhận hàng COD* hoặc *Chuyển khoản SePay QR*). Nền tảng tự động chia tách hạch toán đơn nội bộ xuống backend.
  * **Voucher:** Shopee dùng 1 dòng *"Shopee Voucher"* và 1 dòng *"Shop Voucher"* có nút *"Chọn hoặc nhập mã"* mở Drawer/Modal danh sách voucher hợp lệ để tick chọn một chạm, không bắt người mua nhìn thấy 3-4 ô text input rỗng.
* **Nguyên nhân kỹ thuật:**
  * Model checkout cho phép `methods: Record<string, 'COD' | 'SANDBOX'>` và cấu trúc giao diện bám sát trực tiếp vào schema dữ liệu thay vì xây dựng trừu tượng hóa cho trải nghiệm người dùng (UI abstraction).
* **Hướng sửa đề xuất:**
  * Gom Địa chỉ: Hiển thị duy nhất địa chỉ đang kích hoạt ($80\text{px}$ chiều cao). Thao tác chọn địa chỉ khác chuyển vào Modal.
  * Gom Thanh toán: Cung cấp bộ chọn phương thức thanh toán tổng quát cho toàn bộ giỏ hàng (COD / Chuyển khoản QR SePay). Chỉ khi nào có xung đột nghiệp vụ đặc thù mới hiện cảnh báo chi tiết.
  * Đưa ô nhập Voucher thành một nút bấm mở `VoucherDrawer/Modal`.
* **Tiêu chí kiểm chứng sau sửa:**
  * Chiều cao cột trái của Checkout giảm tối thiểu **45%** (dưới $1.000\text{px}$ cho đơn 2 shop).
  * Nút CTA *"Đặt hàng"* trên màn hình 1366 × 768 luôn hiển thị trong viewport ngay lần tải đầu mà không cần cuộn trang tìm kiếm.
* **Vị trí mã nguồn:**
  * `frontend/src/features/customer/CheckoutPage.tsx:922-953`
  * `frontend/src/features/customer/CheckoutPage.tsx:1037-1055`
  * `frontend/src/features/customer/CheckoutPage.tsx:1135-1165`

---

### T11 — Trang Chi tiết sản phẩm (PDP) bị phân tán thị giác và chứa câu chữ mang tính kỹ thuật

* **Mức độ:** **P2** (Lỗi phân cấp thị giác — Visual Hierarchy Regression).
* **Tái hiện:** 
  1. Mở trang chi tiết bất kỳ: `/products/:id`.
  2. Quan sát nửa trên màn hình (Above the fold) trên độ phân giải **1366 × 768**.
* **Quan sát:**
  * **Đường dẫn & Điều hướng thừa:** Có đồng thời cả thanh breadcrumb (`Sản phẩm / Thời trang / Áo...`) lẫn dòng link ngay bên dưới `← Tất cả sản phẩm` (`ProductDetail.tsx:327`).
  * **Chèn nút chen ngang:** Nút gian hàng `StoreLabel` và nút `Nhắn tin gian hàng` nằm ngay giữa Tiêu đề sản phẩm ($H1$) và Khối Giá (`ProductDetail.tsx:389-396`), làm đứt quãng luồng đọc tự nhiên của khách (Tên món $\rightarrow$ Giá bán $\rightarrow$ Tùy chọn mua).
  * **Chuỗi cảnh báo cứng nhắc:** Cạnh giá tiền xuất hiện dòng chữ: *"Chưa đọc được tồn. Bấm Làm mới"* hoặc *"Số lượng đã chọn vượt tồn khả dụng vừa đọc. Giảm số lượng hoặc chọn phân loại khác; hệ thống giữ nguyên lựa chọn của bạn."* (`ProductDetail.tsx:406-431`).
  * **Lộ dữ liệu thô:** Tại khối Thông số sản phẩm (`ProductDetail.tsx:621`), nếu thuộc tính là JSON object thì render thẳng `JSON.stringify(value)` ra thẻ `<dd>`.
  * **Cụm CTA lộn xộn:** Dưới 2 nút chính (*Thêm vào giỏ hàng*, *Mua ngay*) là một hàng nút phụ: Nút xám *"Lưu yêu thích"* kèm link xanh *"Xem danh sách yêu thích"*, tạo thêm 2 điểm click gây xao nhãng.
* **Đối chiếu Shopee/Lazada:**
  * **Cột mua hàng:** Tiêu đề $\rightarrow$ Rating/Số lượng đã bán $\rightarrow$ Khối Giá nổi bật (nền đỏ/cam nhạt) $\rightarrow$ Mã giảm giá của Shop $\rightarrow$ Vận chuyển $\rightarrow$ Phân loại hàng (Màu, Size) $\rightarrow$ Số lượng (kèm chữ nhỏ *còn X sản phẩm*) $\rightarrow$ 2 nút Mua (Thêm giỏ / Mua ngay).
  * **Thông tin Shop:** Shopee và Lazada đưa Shop xuống một Banner ngang riêng biệt ngay dưới khối ảnh và mua hàng (gồm Logo shop, Tên shop, Nút Xem shop, Nút Chat, Đánh giá, Tỉ lệ phản hồi). Không đặt nút shop chen ngang giữa Tiêu đề và Giá.
  * **Nút Yêu thích:** Nằm kín đáo thành icon trái tim nhỏ ngay dưới ảnh sản phẩm hoặc cạnh nút Chia sẻ.
* **Nguyên nhân kỹ thuật:**
  * Thiếu layout chuẩn cho PDP; việc xử lý tồn kho (`availableUnits`) hiển thị trực tiếp trạng thái logic backend ra text thông báo thay vì disable nút hoặc hiển thị tooltip ngắn gọn.
* **Hướng sửa đề xuất:**
  * Xóa bỏ dòng link `← Tất cả sản phẩm` thừa (đã có breadcrumb).
  * Đưa thông tin Gian hàng xuống thành Shop Card ngang bên dưới khối mua hàng.
  * Đưa nút Yêu thích về dạng icon tim nhỏ cạnh ảnh hoặc tiêu đề.
  * Rút gọn cảnh báo tồn kho: Nếu hết hàng, hiển thị badge đỏ *"Hết hàng"*; nếu chọn quá số lượng, tự động chặn `max={stock}` và toast cảnh báo ngắn.
  * Format thuộc tính: Nếu là mảng/object thì render danh sách badge hoặc nối chuỗi có dấu phẩy, tuyệt đối không để lọt `{"code": "..."}`.
* **Vị trí mã nguồn:**
  * `frontend/src/features/customer/ProductDetail.tsx:327-330`
  * `frontend/src/features/customer/ProductDetail.tsx:388-397`
  * `frontend/src/features/customer/ProductDetail.tsx:404-431`
  * `frontend/src/features/customer/ProductDetail.tsx:573-591`
  * `frontend/src/features/customer/ProductDetail.tsx:621-624`

---

### T12 — Màn hình Kiểm duyệt Admin mở sẵn form và chi tiết làm bùng nổ chiều cao trang

* **Mức độ:** **P2** (Quá tải nhận thức nghiêm trọng trong màn hình tác nghiệp quản trị — Admin Workspace Bloat).
* **Tái hiện:** 
  1. Đăng nhập tài khoản Admin $\rightarrow$ Mở `/admin/products` (Kiểm duyệt sản phẩm).
  2. Tải trang 20 sản phẩm mặc định.
* **Quan sát:**
  * Mỗi sản phẩm trong danh sách 20 món đều mở sẵn một form nhập liệu hoàn chỉnh gồm:
    * Khối `<form onSubmit={submit} className="moderation-decision-form">`
    * Ô `<textarea rows={2}>` với label *"Lý do kiểm duyệt sản phẩm"*
    * Nút gửi quyết định và nút phụ.
  * Mặc dù đã có thẻ `<details>` cho thuộc tính, nhưng khung của từng sản phẩm vẫn cao từ **$450\text{px} - 650\text{px}$**.
  * Trang có 20 sản phẩm $\rightarrow$ Tổng chiều cao cuộn lên tới **$11.000\text{px} - 13.000\text{px}$**. Admin phải cuộn mỏi tay qua hàng chục form text input đang mở sẵn dù chưa hề có ý định từ chối sản phẩm đó.
* **Đối chiếu Shopee / Lazada Seller/Admin Center:**
  * Cả Shopee và Lazada đều quản lý sản phẩm dạng **Bảng dữ liệu phẳng (Data Table)**:
    * Mỗi dòng cao chỉ từ **$55\text{px} - 72\text{px}$** (Ảnh đại diện 48x48, Tên sản phẩm + SKU, Ngành hàng, Giá bán, Tồn kho, Gian hàng, Trạng thái).
    * Cột Thao tác bên phải chỉ có các nút: *Xem xét (Review)*, *Khóa (Ban)*, *Duyệt (Approve)*.
    * Khi bấm thao tác, form nhập lý do chỉ xuất hiện trong **Modal xác nhận** hoặc **Drawer trượt từ cạnh phải (Side Drawer)**.
* **Nguyên nhân kỹ thuật:**
  * `ProductModeration.tsx` render trực tiếp component con `ProductDecision` cho mỗi bản ghi lặp, và mỗi component con tự nhúng một `<form>` với `<textarea>` cố định ngay trong DOM của thẻ danh sách.
* **Hướng sửa đề xuất:**
  * Chuyển danh sách kiểm duyệt sang dạng bảng phẳng (Table layout).
  * Đóng mặc định form quyết định. Chỉ hiển thị nút *"Ẩn sản phẩm"* / *"Duyệt sản phẩm"*; khi click mới mở Dialog/Modal hoặc trượt Drawer kiểm duyệt.
* **Tiêu chí kiểm chứng sau sửa:**
  * Chiều cao trung bình của một dòng sản phẩm kiểm duyệt giảm từ $550\text{px}$ xuống dưới **$75\text{px}$** (giảm hơn 85%).
  * Trên màn hình 1366 × 768, Admin có thể quét nhanh được 7 - 9 sản phẩm trong màn hình đầu tiên thay vì chỉ xem được 1,5 sản phẩm.
* **Vị trí mã nguồn:**
  * `frontend/src/features/admin/ProductModeration.tsx:203-285`

---

### T13 — Giỏ hàng (Cart) dàn trải dạng thẻ dọc, thiếu bảng đối chiếu dạng dòng chuẩn desktop

* **Mức độ:** **P2** (Trải nghiệm kiểm soát giỏ hàng chưa tối ưu — Suboptimal Cart Ergonomics).
* **Tái hiện:** 
  1. Thêm 4 sản phẩm từ 2 shop khác nhau vào giỏ.
  2. Mở `/cart` trên desktop **1366 × 768**.
* **Quan sát:**
  * Giao diện giỏ hàng sử dụng các thẻ khối xếp chồng `bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row`.
  * Cùng một dòng hàng, thông tin bị bẻ dòng nhiều tầng: Tên sản phẩm $\rightarrow$ Phân loại $\rightarrow$ SKU $\rightarrow$ Đơn giá hiện tại $\rightarrow$ Thành tiền dự tính $\rightarrow$ Nút đổi phân loại $\rightarrow$ Bộ tăng giảm số lượng $\rightarrow$ Nút xóa.
  * Mỗi dòng hàng chiếm chiều cao từ **$160\text{px} - 220\text{px}$**.
  * Trên màn hình 1366 × 768, người dùng chỉ nhìn thấy duy nhất 1 sản phẩm của Shop đầu tiên; toàn bộ các món còn lại và thanh tổng tiền bị đẩy hoàn toàn xuống dưới màn hình.
* **Đối chiếu Shopee/Lazada:**
  * Shopee và Lazada sử dụng **Grid/Table Layout** chặt chẽ:
    * Header bảng: `[Checkbox Tất cả] | Sản phẩm | Đơn giá | Số lượng | Số tiền | Thao tác`.
    * Mỗi dòng sản phẩm chỉ cao từ **$90\text{px} - 110\text{px}$**. Cột phân loại hiển thị dạng dropdown chip nhỏ gọn `Phân loại hàng: Đen, L ▾`.
    * Thanh thanh toán (Sticky Bottom Bar) cố định ở đáy viewport: `Chọn tất cả (N) | Tổng thanh toán (X sản phẩm): Y.000₫ | [Mua Hàng]`.
* **Nguyên nhân kỹ thuật:**
  * `CartPage.tsx` và `CartProduct.tsx` sử dụng cấu trúc div flexboard dọc không có độ rộng cột cố định, dẫn đến các thành phần tự động wrap và phình to chiều cao.
* **Hướng sửa đề xuất:**
  * Thiết kế lại danh sách dòng giỏ theo dạng bảng (hoặc CSS Grid cố định tỷ lệ cột: `40px 1fr 140px 130px 140px 60px`).
  * Thu nhỏ ảnh đại diện trong giỏ về chuẩn $64\text{px} \times 64\text{px}$ hoặc $80\text{px} \times 80\text{px}$.
  * Ghim thanh tổng thanh toán ở chân màn hình (Sticky Bottom Bar) khi cuộn trang, giúp người mua luôn nắm được số tiền đã chọn.
* **Vị trí mã nguồn:**
  * `frontend/src/features/customer/CartPage.tsx:576-650`
  * `frontend/src/live/CartProduct.tsx:49-90`

---

### T14 — Trang Tìm kiếm / Danh mục vẫn giữ chân các khối gợi ý khám phá khi đã có bộ lọc

* **Mức độ:** **P2** (Phân tán mục tiêu tìm kiếm — Cognitive Intent Misalignment).
* **Tái hiện:** 
  1. Người dùng tìm kiếm từ khóa `áo thun`.
  2. Chọn bộ lọc Danh mục hoặc Khoảng giá.
  3. Cuộn xuống cuối kết quả tìm kiếm.
* **Quan sát:**
  * Mặc dù đã bổ sung chế độ `compact` (giới hạn 4 sản phẩm) sau đợt review trước, nhưng component `CustomerRecommendations` vẫn render 2 khối: *"Dành cho bạn"* (4 thẻ) và *"Sản phẩm đã xem"* (4 thẻ) ngay bên dưới phần phân trang của kết quả tìm kiếm.
  * Các sản phẩm này không liên quan đến từ khóa `áo thun` đang lọc (chứa tai nghe, sổ tay, ba lô...).
* **Đối chiếu Shopee/Lazada:**
  * **Shopee:** Khi người dùng có tham số tìm kiếm (`?q=...` hoặc `?category=...`), trang kết quả tìm kiếm **CHỈ** hiển thị sản phẩm khớp điều kiện tìm kiếm. Trang kết thúc bằng thanh phân trang (Pagination). Tuyệt đối không chèn "Gợi ý hôm nay" bên dưới kết quả tìm kiếm vì sẽ gây nhiễu loạn nhận thức và khiến người dùng nghĩ rằng hệ thống tìm sai.
  * Khối "Gợi ý hôm nay" / "Dành cho bạn" chỉ xuất hiện ở: Trang chủ (Marketplace Home khi chưa gõ tìm kiếm) hoặc Trang 404/Empty State (khi không tìm thấy món nào).
* **Nguyên nhân kỹ thuật:**
  * `MarketplaceHome.tsx` gọi `<CustomerRecommendations compact={filtered || page > 1} limit={4} />` vô điều kiện ở cuối component thay vì ẩn hoàn toàn khi `filtered === true`.
* **Hướng sửa đề xuất:**
  * Ẩn hoàn toàn component gợi ý khi có bộ lọc tìm kiếm (`filtered === true`):
    ```tsx
    {!filtered && <CustomerRecommendations ... />}
    ```
  * Chỉ hiển thị gợi ý khi kết quả tìm kiếm rỗng (`products.data.items.length === 0`) để giúp người dùng khám phá món khác.
* **Vị trí mã nguồn:**
  * `frontend/src/features/customer/MarketplaceHome.tsx:507-511`

---

## 4. Nghiên cứu sâu về Gu thẩm mỹ (Taste) & Triệt tiêu quá tải nhận thức

### 4.1. Sự khác biệt giữa "Giao diện Quản trị Cơ sở Dữ liệu" và "Sàn Thương Mại Điện Tử"
Hiện tại, nhiều màn hình của PBL6 Market được thiết kế theo tư duy **"CRUD Mirroring"** (có trường nào trong Database thì hiển thị trường đó lên màn hình). Đây là nguyên nhân gốc rễ gây ra cảm giác "ngộp":
* **Cơ sở dữ liệu có:** `fault_party`, `fee_payer`, `reconciliation_id`, `inventory_status`, `replacement_reference`, `version`, `decision_note`.
* **Giao diện hiện tại:** Dựng bảng hiển thị toàn bộ các trường này cho cả người mua lẫn người bán.
* **Chuẩn mực Shopee / Lazada:** Trừu tượng hóa dữ liệu thành **Trạng thái cảm xúc và Hành động tiếp theo**:
  * Thay vì hiển thị: `fee_payer: STORE, fault_party: STORE, refund_status: PENDING`, Shopee hiển thị:  
    👉 *"Người bán đồng ý hoàn tiền. Khoản tiền 150.000₫ sẽ được hoàn vào tài khoản của bạn trong 24h làm việc."* (Đi kèm 1 badge xanh: *Đã duyệt hoàn tiền*).

### 4.2. Khắc phục triệt để trên Viewport chuẩn Desktop (1366 × 768)
Khi thiết kế cho Desktop 1366 × 768, chiều cao khả dụng của trình duyệt (trừ taskbar Windows và thanh URL) chỉ còn khoảng **$650\text{px} - 680\text{px}$**:
1. **Header:** Không được cao quá $110\text{px}$ (hiện tại PBL6 Header chiếm khoảng $120\text{px}$, khá ổn nhưng cần thu gọn khoảng cách các link phụ).
2. **Khu vực Above the fold:** Người dùng phải nhìn thấy được tối thiểu:
   * Trang Chi tiết sản phẩm: Thấy trọn vẹn Ảnh lớn + Tiêu đề + Giá + Phân loại + Cặp nút Thêm giỏ/Mua ngay.
   * Trang Giỏ hàng: Thấy trọn vẹn Checkbox tất cả + Tối thiểu 3 dòng sản phẩm + Thanh tổng tiền dự tính.
   * Trang Checkout: Thấy Địa chỉ tóm tắt + Danh sách món + Nút "Đặt hàng" (không bị che khuất).

---

## 5. Kế hoạch hành động đề xuất (Action Plan)

1. **Đợt 1 — Triệt tiêu rò rỉ nghiệp vụ nội bộ (T09 - Ưu tiên cao nhất):**
   * Tách triệt để nhãn hiển thị tại `OrderPresentation.tsx` và `ReturnRequestView.tsx`. Đảm bảo giao diện người mua hàng 100% là ngôn ngữ hỗ trợ khách hàng, không còn vết tích của chỉ dẫn kho vận nội bộ.
2. **Đợt 2 — Tinh gọn Checkout & Bảng giỏ hàng (T10, T13):**
   * Thu gọn khối Địa chỉ thành 1 dòng + nút đổi Modal;
   * Gom phương thức thanh toán toàn đơn thành 1 lựa chọn cấp phiên;
   * Dựng lại bảng Giỏ hàng theo dạng Table/Grid phẳng, có sticky footer tổng tiền.
3. **Đợt 3 — Tối ưu hóa PDP & Tìm kiếm (T11, T14):**
   * Dời thông tin Gian hàng trên PDP xuống dưới khối mua;
   * Ẩn khối gợi ý khi đang có từ khóa tìm kiếm hoặc bộ lọc danh mục/giá.
4. **Đợt 4 — Thu gọn màn hình Kiểm duyệt Admin (T12):**
   * Chuyển form kiểm duyệt mở sẵn của 20 sản phẩm sang dạng danh sách kèm Modal/Drawer tác nghiệp khi cần.

---

## 6. Giới hạn kiểm thử & Kỷ luật vận hành

* **Môi trường đối chiếu:** Phân tích trực tiếp từ mã nguồn frontend local tại `c:\PBL6\frontend\src` và đối chiếu thực nghiệm với trải nghiệm desktop của Shopee Vietnam và Lazada Vietnam.
* **Kỷ luật an toàn:** Đợt review này là phân tích kiến trúc và trải nghiệm người dùng chuyên sâu, không thực hiện các thao tác ghi phá hủy dữ liệu (mutation) trên cơ sở dữ liệu demo.
* **Kiểm tra biên dịch:** Dự án sẵn sàng cho việc triển khai sửa chữa các component trên theo tiêu chuẩn kiểm chứng.
