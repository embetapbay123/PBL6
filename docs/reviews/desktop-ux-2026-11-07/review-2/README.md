# Review desktop lần 2 — sau sửa

Đối chiếu [12 phát hiện của lần đầu](../README.md), trên demo `https://demo.congnguyen.me` và mã nguồn local hiện tại. Viewport 1366 × 768 và 1440 × 900. Không chỉnh frontend/backend và không deploy.

## Kết quả

**Đã cải thiện phần trình bày, nhưng chưa giải quyết hết luồng và độ quá tải.** Khối tiền checkout ngắn hơn rõ rệt, thẻ đơn khách bỏ UUID, danh sách SKU trùng đã được bỏ, hồ sơ trả hàng có thêm ngữ cảnh. Tuy nhiên có ba lỗi phát sinh xác nhận được: menu mất tương phản, mất chính sách ở checkout một shop và mã yêu cầu không thống nhất giữa danh sách/chi tiết.

Build `npm --prefix frontend run build`: **PASS**. Vite còn cảnh báo chunk lớn hơn 500 kB; không phải lỗi build và không dùng cảnh báo này để kết luận UX đã đạt.

## Các lỗi cần xử lý trước

### R01 — P1: Menu seller và admin nhạt như trạng thái vô hiệu hóa

**Tái hiện:** vào seller hoặc admin ở desktop, quan sát các mục chưa được chọn. Chữ và icon xám rất nhạt; vẫn bấm được bình thường.

**Đo trực tiếp:** link có màu `rgb(212, 212, 216)` (`#d4d4d8`), nền sidebar `rgb(255,255,255)`. Tương phản tính được khoảng **1,48:1**. Nhãn 13px khó đọc và tạo cảm giác người dùng không có quyền mở màn đó.

**Nguyên nhân:** link đã chuyển vào `.market-sidebar-group`. Rule cơ sở `.market-sidebar a` dùng màu sáng của sidebar tối, nhưng các override cho nền sáng vẫn dùng `.market-sidebar > a`, không còn khớp phần lớn link. Hover cũng lấy kiểu nền tối, gây thiếu nhất quán.

**Vị trí:** `frontend/src/live/commerce.css:734`, `:743`, `:4493`; cấu trúc nhóm trong `frontend/src/live/LiveApp.tsx`.

**Sửa:** cập nhật toàn bộ selector liên quan sang cấu trúc mới, định nghĩa rõ normal/hover/active/focus của nền sáng. Kiểm tra cả seller/admin và menu thu gọn; không chỉ đổi màu active.

Ảnh: [seller](evidence/seller-overview.png), [admin](evidence/admin-dashboard.png).

### R02 — P1: Checkout một shop mất toàn bộ đường xem chính sách đổi trả

**Tái hiện:** giỏ khách A → bỏ chọn shop An Nhiên, chỉ giữ sổ tay Mây Xanh → Thanh toán. Tổng 109.000₫ hiển thị bình thường, nhưng không có “Đổi trả” hoặc đường mở chính sách trong checkout. Đã khôi phục chọn tất cả sau kiểm tra.

**Nguyên nhân:** `ReturnPolicyNotice` hiện nằm trong khối chỉ render khi `shownQuote.stores.length > 1`. Việc thu gọn breakdown nhiều shop làm mất chính sách đối với trường hợp mua một shop, dù quote vẫn có dữ liệu chính sách.

**Vị trí:** `frontend/src/features/customer/CheckoutPage.tsx:1291`, `:1302`.

**Sửa:** tách chính sách khỏi điều kiện nhiều shop. Mua một hay nhiều shop đều phải xem được; tóm tắt hạn/trách nhiệm phí cần thiết để lộ tại bước quyết định, phần tham khảo dài mới thu gọn.

Ảnh: [checkout một shop](evidence/checkout-one-shop.png).

### R03 — P2: Cùng yêu cầu đổi trả có hai mã ngắn khác nhau

**Tái hiện:** danh sách seller hiển thị yêu cầu `#a52015ab` của đơn `#2EC54E27`. Mở chính hồ sơ đó, tiêu đề kiểm hàng lại ghi `Yêu cầu #C6820A81 · Đơn #2EC54E27`.

**Nguyên nhân:** danh sách lấy tám ký tự đầu `r.id.slice(0, 8)`, context mới ở chi tiết lấy tám ký tự cuối `request.id.slice(-8)`. Không phải mở sai hồ sơ, nhưng người vận hành dễ nghĩ đã vào nhầm và khó đối chiếu khi hỗ trợ.

**Vị trí:** `frontend/src/features/returns/ReturnRequestView.tsx:90`; danh sách seller/admin ở `frontend/src/features/returns/ReturnsPage.tsx:616`, `:723`.

**Sửa:** dùng chung một hàm định dạng mã cho danh sách, chi tiết, tìm kiếm và hướng dẫn hỗ trợ; thống nhất chữ hoa/thường.

Ảnh: [context mới](evidence/return-detail.png). Danh sách gốc ở [bằng chứng lần đầu](../evidence/seller-returns.png); lần hai vẫn hiện cùng mã đầu trong danh sách đã kiểm tra trực tiếp.

### R04 — P2: Nút Đặt hàng chỉ dễ thấy khi phần tham khảo đóng

**Đã tốt hơn:** ở 1366 × 768, checkout hai shop mặc định có khung tóm tắt cao 336px, không cuộn riêng, nút Đặt hàng tại y≈577–617px. Tình huống đã gây khó khăn ở lần đầu được cải thiện.

**Còn lại:** mở “Xem chi tiết theo từng shop”, rồi mở “Đổi trả” của một shop. Khung cao 801px, bắt đầu ở y=96; nút tại y≈836–876px, nằm dưới viewport 768px. CTA vẫn đặt sau nội dung tham khảo, chưa tách khỏi phần mở rộng. Chính sách cũng bị lồng hai tầng details.

**Vị trí:** `frontend/src/features/customer/CheckoutPage.tsx:1291`, `:1340`; `frontend/src/components/PurchaseActionBar.tsx`; CSS `.purchase-summary`.

**Sửa:** giữ tổng/nút ở vùng không bị mở rộng tham khảo đẩy đi; một khu vực tham khảo phẳng, có thể cuộn riêng nếu cần. Không che phí/tổng hoặc lỗi để đạt chiều cao thấp.

Ảnh: [mặc định](evidence/checkout-collapsed-1366.png), [mở chi tiết shop](evidence/checkout-expanded-1366.png), [mở chính sách](evidence/checkout-policy-expanded-1366.png).

## Những vấn đề cũ còn ảnh hưởng nhiều

### R05 — P1: Hàng đợi seller chưa chuyển sang công việc cần làm

`/seller/orders` vẫn mở Tất cả, đơn hoàn tất mới nhất nằm đầu. Đơn chờ xác nhận vẫn có ba cách diễn đạt gần nhau: trạng thái chờ, badge “Cần xác nhận”, câu hướng dẫn xác nhận. Thay thời gian tới giây bằng ngày là tốt nhưng chưa giải quyết việc ưu tiên đơn.

**Sửa:** thêm view Cần xử lý hoặc mặc định dẫn tới nhóm việc cần làm; giữ Tất cả cho tra cứu. Một dòng chỉ cần một tín hiệu hành động, chi tiết mở sau. Không chỉ thêm nhãn “Việc cần xử lý ngay” ở dashboard rồi giữ nguyên trang xử lý.

Vị trí: `frontend/src/live/SellerWorkspace.tsx:1423`; `frontend/src/components/OrderQueue.tsx:16`; `frontend/src/components/OrderListTools.tsx:71`, `:105`.

Ảnh: [danh sách đơn](evidence/seller-orders.png).

### R06 — P1: Màn kho gần như vẫn giữ mật độ và cấu trúc cũ

Nút nổi bật đầu màn vẫn là “Đọc lại tồn kho và đối chiếu”. Còn năm tab nghiệp vụ; mỗi SKU có ảnh, chú thích ảnh, tên/phân loại/SKU, hai link và hai nút. Ở 1366 × 768, phần điều hướng/lọc chiếm nhiều chiều cao, chỉ có khoảng một dòng kho trọn vẹn trong vùng đầu.

**Sửa:** ưu tiên tồn có thể bán và việc bổ sung/điều chỉnh; làm mới là phụ. Đưa lịch sử/đối chiếu/thống kê vào tra cứu. Không thu nhỏ chữ để nhồi thêm dòng; bỏ thao tác và câu phụ khỏi hàng mặc định.

Vị trí: `frontend/src/live/SellerWorkspace.tsx:505` và phần StoreInventory. Ảnh: [kho](evidence/inventory.png).

### R07 — P2: Kiểm duyệt vẫn là các form đầy đủ xếp nối tiếp

Bộ ảnh được thu gọn thành thumbnail, gallery đưa vào details — đã bớt ồn. Nhưng mỗi sản phẩm vẫn có UUID sản phẩm/shop, nhiều dòng trạng thái, mô tả, ô nhập lý do và nút quyết định mở sẵn. Phần tiêu đề/điều hướng/bộ lọc chiếm gần hết vùng đầu tại 1440 × 900.

**Sửa:** bảng hoặc danh sách tóm tắt; mở một đối tượng mới hiện form quyết định, mô tả và gallery. Khi rút mô tả phải có đường đọc đầy đủ. Code hiện dùng `line-clamp-2` nhưng chưa có điều khiển xem toàn bộ mô tả trong card — cần kiểm tra thêm với mô tả dài trước nghiệm thu.

Vị trí: `frontend/src/features/admin/ProductModeration.tsx:204`, `:214` và form quyết định phía dưới. Ảnh: [kiểm duyệt](evidence/admin-moderation.png).

### R08 — P2: Gợi ý sản phẩm vẫn lặp giữa hai khối

Ở chi tiết hoodie Weekend, “Sản phẩm khác cùng gian hàng” và “Sản phẩm liên quan” cùng có áo Everyday và áo Sand. `excludeIds` mới chỉ truyền ID sản phẩm đang xem, chưa truyền các ID đã dùng ở khối cùng shop.

**Sửa:** lấy tập ID các sản phẩm đã hiển thị để loại trùng giữa nguồn gợi ý hoặc dùng một khối chính với mục đích rõ.

Vị trí: `frontend/src/features/customer/ProductDetail.tsx:714`, `:722`; `frontend/src/features/customer/CustomerRecommendations.tsx:19`.

## Đối chiếu từng phát hiện ban đầu

“Đã sửa” trong bảng chỉ đánh giá phạm vi phát hiện, không đồng nghĩa đã kiểm thử toàn bộ nghiệp vụ.

| Mã cũ | Kết quả | Đã cải thiện | Phần cần tiếp tục |
|---|---|---|---|
| F01 Checkout | Một phần | Tổng hợp tiền chung; hết hạn một dòng; nút thấy ở mặc định; phân bổ COD/chuyển khoản đúng | R02/R04; địa chỉ và n+1 ô voucher vẫn mở sẵn |
| F02 Đơn khách | Một phần | Bỏ UUID/Store hiện tại, đưa shop + trạng thái lên đầu, rút ngày | Vẫn chín lựa chọn tab, thẻ khoảng 260px ở 1366; nhiều tầng không gian còn lớn |
| F03 Đơn seller | Chưa xử lý trọng tâm | Ngày tạo ngắn hơn | R05: chưa có Cần xử lý mặc định, hướng dẫn lặp |
| F04 Kho | Chưa xử lý trọng tâm | Giữ số tồn và preview an toàn | R06: cấu trúc và thao tác trên dòng gần như cũ |
| F05 Kiểm duyệt | Một phần | Thumbnail thay bộ ảnh mở sẵn | R07: chưa tách hàng đợi khỏi form quyết định |
| F06 Kiểm hàng trả | Một phần | Có trạng thái, ID hồ sơ/đơn, giá trị và bước hiện tại ở đầu | R03: mã sai quy ước; trạng thái hoàn tiền/trách nhiệm phí vẫn ở dưới form dài |
| F07 Biến thể | Đã sửa phần lặp | Một danh sách SKU, không còn liệt kê nguyên bộ lần hai | Form thêm vẫn mở sẵn; có thể thu gọn ở đợt tinh chỉnh |
| F08 Sidebar | Một phần | Nhóm seller/admin, breadcrumb có tên tab | R01 tương phản phát sinh; chiều cao khung chưa giảm nhiều |
| F09 Phân cấp CTA | Một phần | Code đổi Làm mới đơn khách sang secondary; hủy seller cũng secondary | Form hủy vẫn mở sẵn cạnh bước xử lý; chat vẫn rất nổi |
| F10 Dashboard | Một phần | Có khối việc cần làm, nhãn tiền admin rõ hơn | Việc bằng 0 vẫn cảnh báo; phí giao lặp; admin chưa có hàng đợi ngoại lệ/kỳ dữ liệu |
| F11 Danh mục | Một phần | Việt hóa tiêu đề/trạng thái | Tạo và sửa vẫn chung màn, chung trường; “Tải lại taxonomy” còn nguyên |
| F12 Chi tiết sản phẩm | Một phần | Có tóm tắt giao/đổi trả trước quyết định mua | R08: khối gợi ý vẫn lặp; chính sách ngắn cần có đường xem điều kiện cụ thể |

Không chấm phần trăm hoàn thiện vì các phát hiện có mức tác động khác nhau. Không nên đóng toàn bộ 12 mục chỉ vì build pass hoặc giao diện ngắn hơn.

## Kiểm tra đã thực hiện

- Mở trực tiếp demo với chủ An Nhiên, khách A và admin; đối chiếu screenshot với lần đầu.
- Kiểm tra checkout hai shop, một shop; COD toàn bộ và COD/chuyển khoản hỗn hợp; mở chi tiết phí/chính sách. Không bấm Đặt hàng.
- Với hai shop: tổng 1.874.000₫; khi hỗn hợp, COD 1.765.000₫ và chuyển khoản 109.000₫, khớp các shop. Đã trả lựa chọn về COD và giỏ về chọn tất cả.
- Review seller dashboard, đơn và modal, kho, biến thể, kiểm hàng trả; lịch sử khách; chi tiết sản phẩm; admin dashboard/danh mục/kiểm duyệt. Có 17 ảnh mới trong [evidence](evidence/).
- `npm --prefix frontend run build` thành công. Không chạy bộ test có ghi dữ liệu lên demo; không coi kiểm tra trực quan là xác nhận chống trùng/hoàn tiền/đối soát.
- Khôi phục phiên chủ An Nhiên và viewport mặc định cuối lượt. Không gửi tin nhắn, sửa hàng/kho, duyệt hay cập nhật giao dịch.
- Source local nhiều thay đổi chưa commit; đối chiếu các khu vực được xem, không khẳng định toàn bộ bundle demo trùng local và không dùng diff từ HEAD làm diff riêng của lượt fix này.

Ưu tiên đợt tiếp: **R01 + R02 → R03 + R04 → hàng đợi seller/kho/kiểm duyệt → phần tinh chỉnh còn lại**. Khi triển khai sửa frontend thật, build/deploy theo AGENTS.md; review này chỉ thêm tài liệu.
