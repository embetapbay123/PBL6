# Review desktop — các luồng khách hàng tiếp theo

Ngày: 08/11/2026. Bản demo: https://demo.congnguyen.me. Desktop **1366 × 768**, tài khoản Khách hàng A. Đối chiếu mã local để xác định vị trí xử lý. Lượt này bổ sung cho các review trước, không mở lại N01/N02 đã kiểm chứng.

## Kết luận

Có **8 phát hiện P2** về tìm kiếm, giỏ hàng, yêu thích, thông báo và hậu mãi. Điểm quá tải lớn nhất là **40 thẻ gợi ý/lịch sử xem nằm dưới 8 kết quả tìm kiếm**. Phần hậu mãi cần ưu tiên đúng việc theo giai đoạn: sau khi cửa hàng bắt đầu kiểm hàng, hướng dẫn gửi trả không nên tiếp tục chiếm vị trí chính.

Đây là review chuyên gia trên dữ liệu demo, không phải usability test hay bằng chứng ảnh hưởng đến conversion. Không phát hiện P0/P1 trong các thao tác đã quan sát; chưa kiểm thử giao dịch hoặc các ngoại lệ thanh toán end-to-end.

| Mã | Phát hiện | Ưu tiên thực hiện |
|---|---|---|
| T01 | Gợi ý và sản phẩm đã xem áp đảo kết quả tìm kiếm, lặp nhiều món | Trước |
| T02 | Đã kiểm hàng vẫn mở sẵn hướng dẫn gửi trả | Trước |
| T03 | Thông báo đẩy nhiều trạng thái cũ của cùng đơn lên ngang hàng | Trước |
| T04 | Thông báo đổi trả mở đầu trang đơn, mất ngữ cảnh hồ sơ | Tiếp |
| T05 | Mỗi sản phẩm yêu thích có hai nút bỏ lưu và hai cách xác nhận | Tiếp |
| T06 | Tìm “áo” khớp chuỗi con sau bỏ dấu, kéo nhiều món khác vào kết quả | Tiếp |
| T07 | Dòng giỏ hàng và form đổi phân loại mở sẵn làm danh sách quá cao | Tiếp |
| T08 | Lịch sử đổi trả của khách vẫn chứa nhiều cập nhật kỹ thuật trùng thời điểm | Tiếp |

Tất cả các mục trên là **P2**. Số thứ tự là thứ tự đề xuất sửa, không phải thang mức độ mới.

## T01 — Gợi ý áp đảo tác vụ tìm kiếm

**Tái hiện:** đăng nhập Khách hàng A → tìm `áo` → chọn danh mục Thời trang.

**Quan sát:**

- Kết quả chính: **8 sản phẩm**, vùng kết quả cao khoảng **960px**.
- Dành cho bạn: **20 thẻ**, cao khoảng **1.989px**.
- Sản phẩm đã xem: **20 thẻ**, cao khoảng **1.982px**.
- Hai nhóm phụ trùng nhau **12 sản phẩm**; 4 sản phẩm trong kết quả chính cũng có trong Dành cho bạn.
- Toàn trang cao khoảng **5.598px**. Hai nhóm phụ chiếm khoảng 3.971px, tức hơn 70% chiều cao trang trong trường hợp này.

Đây là trạng thái của tài khoản demo tại thời điểm review; số lượng lịch sử xem thay đổi theo tài khoản. Các nhóm có tiêu đề riêng, nhưng khối lượng nội dung vẫn kéo người dùng ra khỏi nhiệm vụ đang tìm/lọc. Sau lọc Thời trang, phần gợi ý còn tai nghe, sổ tay, đồ gia dụng.

**Hướng sửa:** khi có tìm kiếm/bộ lọc, ưu tiên kết quả chính; có thể bỏ các nhóm khám phá khỏi view này hoặc giới hạn tổng số thẻ phụ ở một hàng, kèm đường Xem thêm. Khử trùng giữa các nhóm và với kết quả đã hiện. Không áp dụng lại nguyên xi lượng gợi ý của trang chủ vào trang đang tìm món cụ thể.

**Kiểm tra sau sửa:** cùng truy vấn trên, nội dung chính vẫn có 8 kết quả; nhóm phụ không thành 40 thẻ mở sẵn và không lặp sản phẩm giữa các nhóm đang hiển thị. Không thay đổi logic loại trùng ở chi tiết sản phẩm đã sửa trước đó.

**Mã:** [MarketplaceHome.tsx:507](C:/PBL6/frontend/src/features/customer/MarketplaceHome.tsx:507), [CustomerRecommendations.tsx:21](C:/PBL6/frontend/src/features/customer/CustomerRecommendations.tsx:21).

**Ảnh:** [điểm chuyển sang gợi ý](evidence/search-suggestions.png), [toàn trang sau lọc](evidence/search-fashion-full.png).

## T02 — Hướng dẫn gửi trả vẫn nổi bật khi đã có biên bản kiểm hàng

**Tái hiện:** Đơn hàng → Đổi trả → yêu cầu của đơn `#2EC54E27`, hồ sơ `#C6820A81`.

**Quan sát:** cùng màn hình có **“Cửa hàng đang kiểm tra hàng trả.”** rồi ngay dưới là khối lớn **“Hướng dẫn gửi trả”**, địa chỉ và lời nhắc gửi trả tới kho. Mở lịch sử thấy đã có nhiều lần ghi biên bản kiểm hàng.

Source dùng `inspection.length` để đổi bước tiếp theo sang đang kiểm tra, nhưng điều kiện hiện hướng dẫn chỉ kiểm tra `status === APPROVED`. Vì vậy hệ thống đã biết bước tác nghiệp thay đổi mà phần hướng dẫn chính chưa đổi theo.

**Hướng sửa:** tách trạng thái khách cần gửi hàng với trạng thái cửa hàng đang kiểm tra. Khi đã ở bước kiểm hàng, đưa địa chỉ/hướng dẫn gửi trước đó vào phần tham khảo; giữ khoản hoàn, trách nhiệm phí và thông tin cần phản hồi hiện rõ. Không suy diễn rằng đã hoàn tiền chỉ vì đã kiểm hàng.

**Kiểm tra sau sửa:** APPROVED chưa có kiểm hàng vẫn có hướng dẫn gửi; cùng trạng thái nhưng đã có kiểm hàng thì ưu tiên thông tin chờ xử lý, không khiến khách hiểu rằng cần gửi thêm lần nữa. Luồng có vận chuyển lấy hàng cần dựa trên trạng thái vận chuyển thực tế.

**Mã:** [ReturnRequestView.tsx:108](C:/PBL6/frontend/src/features/returns/ReturnRequestView.tsx:108), điều kiện khối hướng dẫn tại dòng 113.

**Ảnh:** [chi tiết hồ sơ](evidence/return-detail.png), [lịch sử đã kiểm hàng](evidence/return-history.png).

## T03 — Thông báo giống dòng sự kiện vận hành hơn hộp cập nhật cho người mua

**Quan sát:** tài khoản có **116 thông báo**. Ba mục chưa đọc đầu tiên đều thuộc đơn `#3CDB61C7`, lần lượt Đã hủy / Đang chờ xác nhận / Đang xác nhận đặt hàng. Cả ba đều cùng tiêu đề “Đơn hàng được cập nhật”, có badge, nút xem và nút đánh dấu riêng. Đơn `#2D2228E9` xuất hiện nhiều lần liên tiếp theo các bước nội bộ.

Các thông báo này là sự kiện lịch sử hợp lệ. Vấn đề là trình bày ngang hàng làm người mua phải tự gộp chúng để hiểu tình trạng mới nhất, đồng thời khiến cập nhật cần hành động bị lẫn trong chuỗi cũ.

**Hướng sửa:** tiêu đề nêu luôn sự kiện và mã đơn, ví dụ “Đơn #3CDB61C7 đã hủy”. Gộp cập nhật thường lệ cùng đơn thành một mục có trạng thái mới nhất, mở lịch sử khi cần. Giữ các sự kiện cần phản hồi, chưa rõ thanh toán, hoàn tiền thất bại hoặc thông tin tiền quan trọng ở vị trí rõ ràng.

**Kiểm tra sau sửa:** ba cập nhật của đơn mẫu không còn chiếm ba khối ưu tiên độc lập. Khi gộp phải bảo toàn trạng thái đọc/chưa đọc, phân trang và quyền truy cập; không chỉ nhóm trong trang hiện tại rồi làm mất sự kiện ở trang sau.

**Mã:** [NotificationsPage.tsx:92](C:/PBL6/frontend/src/features/customer/NotificationsPage.tsx:92), tiêu đề chung tại dòng 125.

**Ảnh:** [ba thông báo cùng một đơn](evidence/notifications.png).

## T04 — Thông báo đổi trả chưa đưa tới đúng công việc

**Quan sát:** thông báo “Yêu cầu đổi trả được cập nhật / Đã chấp thuận yêu cầu”, đơn `#2EC54E27`, có link **Xem đơn hàng** tới `/customer/orders/e8550c10-53f9-4eee-bd2a-72cc2ec54e27`. Không có hash tới phần đổi trả và không mở trang hồ sơ đang cần đọc hướng dẫn. Mọi kind thông báo đều dùng chung đường dẫn này.

Người dùng phải tìm lại phần đổi trả phía dưới thông tin hàng, địa chỉ, tiền và vận chuyển. Trong khi ứng dụng đã có route chi tiết hồ sơ đổi trả.

**Hướng sửa:** chọn đích và nhãn theo loại thông báo. RETURN_STATUS mở hồ sơ tương ứng nếu payload có đủ định danh; khi chỉ có order_id thì tối thiểu tới phần `#returns` của đơn. ORDER_STATUS vẫn mở đơn; cập nhật tiền cần tới phần thanh toán phù hợp và vẫn giữ thông tin chưa rõ kết quả khi có.

**Kiểm tra sau sửa:** bấm thông báo chấp thuận phải tới nội dung hồ sơ/hướng dẫn liên quan sau khi dữ liệu tải xong, không cần dò lại toàn trang. Kiểm tra cả mở trực tiếp URL và quay lại danh sách thông báo.

**Mã:** [NotificationsPage.tsx:148](C:/PBL6/frontend/src/features/customer/NotificationsPage.tsx:148).

**Ảnh:** [thông báo đổi trả](evidence/notification-return.png), [phần đổi trả trong trang đơn](evidence/order-return-entry.png).

## T05 — Hai nút bỏ yêu thích cho cùng một sản phẩm

**Quan sát:** mỗi sản phẩm trên trang Yêu thích có nút trái tim đã chọn trong CatalogCard và một nút cam **Bỏ yêu thích** bên dưới. Nút cam trở thành hành động nổi bật hơn cả Chọn phân loại/Thêm vào giỏ.

**Đối chiếu mã:** nút ngoài gọi `remove()` và mở confirm; trái tim dùng `favoriteState.toggle()` trực tiếp. Hai lối làm cùng việc có quy trình xác nhận khác nhau. Không thực hiện bỏ lưu trên demo trong lượt này.

**Hướng sửa:** giữ một đường bỏ lưu, thường là trái tim hoặc hành động phụ, thống nhất feedback và cơ chế khôi phục nếu dùng. Khi sản phẩm không còn hiển thị vẫn phải có cách bỏ khỏi danh sách. Không cần một nút primary riêng cho hành động bỏ lưu thường lệ.

**Kiểm tra sau sửa:** mỗi thẻ chỉ có một thao tác bỏ lưu truy cập được bằng chuột/bàn phím; sản phẩm không còn hiển thị vẫn bỏ được; danh sách và badge trái tim đồng bộ sau thao tác.

**Mã:** [FavoritesPage.tsx:92](C:/PBL6/frontend/src/features/customer/FavoritesPage.tsx:92), nút ngoài tại dòng 100; [ProductCardActions.tsx](C:/PBL6/frontend/src/live/ProductCardActions.tsx).

**Ảnh:** [hai đường bỏ lưu](evidence/favorites.png).

## T06 — Tìm “áo” nhận cả “thao”, “tạo” sau chuẩn hóa

**Quan sát:** truy vấn `áo` có **18 kết quả chính**: 8 tên sản phẩm áo và 10 món khác, gồm Tai nghe thể thao Active, Ấm trà kim loại hình học, đồ bếp, kệ, nến và túi. Chọn danh mục Thời trang còn 8 kết quả. Các món khác nằm trong vùng kết quả tìm kiếm, không phải chỉ ở Dành cho bạn.

**Nguyên nhân trong mã:** `searchPattern` bỏ dấu rồi bọc `%...%`; repository tìm chuỗi con ở cả title và description. `áo` thành `ao`, khớp bên trong `thao`, `tạo` sau bỏ dấu. Xếp hạng ưu tiên title chỉ phân hai nhóm, chưa phân biệt từ đầy đủ với chuỗi con.

**Hướng sửa:** giữ tìm kiếm có/không dấu nhưng ưu tiên token/cụm từ đầy đủ; cho mô tả tham gia khi liên quan thực sự. Có thể giữ kết quả mở rộng ở tầng sau nếu cần. Không hard-code kết quả của bộ dữ liệu demo hoặc bắt người dùng luôn chọn danh mục để bù cho khớp chuỗi quá rộng.

**Kiểm tra sau sửa:** kiểm tra `áo`, `ao`, `thể thao`, tên sản phẩm đầy đủ và trường hợp không có kết quả; từ `áo` không nên đưa tai nghe lên vì chỉ chứa hậu tố `ao` trong `thao`. Giữ đúng lọc giá, sắp xếp và phân trang.

**Mã:** [search.ts:2](C:/PBL6/backend/shared/src/search.ts:2), [catalog.repository.ts:44](C:/PBL6/backend/catalog-service/src/catalog/catalog.repository.ts:44), xếp hạng tại dòng 67. Mục này liên quan logic tìm kiếm backend, không chỉ CSS frontend.

**Ảnh:** [toàn bộ kết quả truy vấn áo](evidence/search-all-results-full.png), [sau chọn Thời trang](evidence/search-fashion-full.png).

## T07 — Dòng giỏ hàng cao vì mở sẵn công cụ đổi phân loại

**Quan sát:** giỏ có 3 dòng, tổng 11 đơn vị. Dòng Áo thun sọc ngang Coast cao khoảng **265,8px**, chưa tính header shop và padding khối. Ở 1366 × 768, phần nhìn đầu chủ yếu chỉ đủ shop đầu với một SKU. Form Đổi phân loại (select + nút Đổi đang disabled) mở sẵn dù người dùng chưa có ý định đổi.

Tên, phân loại/SKU, giá đơn vị và thành tiền chiếm các dòng riêng với khoảng cách lớn. Bên phải còn nhiều không gian trống sau khối tổng hợp, trong khi danh sách kéo dài phía trái.

**Hướng sửa:** giữ phân loại hiện tại + link Đổi, chỉ mở picker khi cần. Gom giá đơn vị/thành tiền/số lượng theo cột ổn định; giảm khoảng trống của header shop và đoạn metadata. Giữ rõ checkbox, phân loại hiện tại, số lượng, tiền và nút thanh toán. Không cần giấu giá hoặc bỏ khả năng đổi phân loại.

**Kiểm tra sau sửa:** giỏ 3 dòng nhìn được nhiều hơn một SKU trong viewport laptop; đổi phân loại vẫn giữ kiểm tra tồn và giá; mở/đóng picker không làm mất lựa chọn mua hiện tại.

**Mã:** [CartPage.tsx:69](C:/PBL6/frontend/src/features/customer/CartPage.tsx:69), vị trí gọi picker tại dòng 582; [commerce.css:3911](C:/PBL6/frontend/src/live/commerce.css:3911).

**Ảnh:** [giỏ hàng đã tải đủ dữ liệu](evidence/cart-settled.png).

## T08 — Lịch sử hậu mãi còn nhiều sự kiện không giúp khách hiểu tiến trình

**Quan sát:** mở Lịch sử đổi trả của hồ sơ `#C6820A81` thấy nhiều cặp **“Đã ghi nhận cập nhật hồ sơ” / “Đã ghi biên bản kiểm hàng”** cùng thời điểm, lặp qua nhiều lần lưu. Ví dụ 07:26:47 ngày 4/11 và nhiều thời điểm ngày 3/11. Các cặp chiếm phần lớn lịch sử đã tải; quyết định chấp thuận và trách nhiệm phí nằm phía sau.

**Đối chiếu mã:** đã lọc một số internalActions cho CUSTOMER, nhưng RETURN_STATUS có from_status bằng to_status vẫn hiện thành cập nhật hồ sơ, song song sự kiện kiểm hàng. Ghi biên bản kiểm hàng không hiện nội dung inspection cho khách, nên nhiều lần lưu chỉ tạo thêm dòng giống nhau.

**Hướng sửa:** lịch sử khách ưu tiên mốc nghiệp vụ và thay đổi liên quan: yêu cầu, chấp thuận/từ chối, nhận hàng, kết luận kiểm hàng, phí, tranh chấp, khoản hoàn/hàng đổi. Gộp hoặc đưa cập nhật lưu nội bộ vào phần lịch sử kỹ thuật cho seller/admin. Không xóa dữ liệu audit gốc và không làm mất thay đổi tiền/phí/quyết định quan trọng.

**Kiểm tra sau sửa:** lưu biên bản nhiều lần không tạo hàng loạt mốc rỗng đối với khách; vẫn xem được thời điểm/kết luận có ý nghĩa. Sau lọc, trạng thái rỗng và Xem thêm phải đưa người dùng tới các mốc còn lại đúng cách.

**Mã:** [AfterSaleHistory.tsx:31](C:/PBL6/frontend/src/features/returns/AfterSaleHistory.tsx:31), lọc CUSTOMER tại dòng 47.

**Ảnh:** [lịch sử đang lặp cặp sự kiện](evidence/return-history.png).

## Những phần đang hợp lý trong phạm vi đã kiểm tra

- Tìm kiếm có chip từ khóa/danh mục/giá; khoảng giá ngược có lỗi tại chỗ. Áp dụng và gỡ lọc giá hoạt động trong tình huống đã thử.
- Link yêu cầu đổi trả từ menu đơn hoàn tất đã mở được phần đổi trả, kể cả khi nội dung tải bất đồng bộ. Khối vận chuyển tải thêm có thể dịch nội dung xuống; chưa xem đây là lỗi chặn tác vụ.
- Danh sách đổi trả của khách đã gọn. Trách nhiệm phí và trạng thái hoàn tiền có mặt trong chi tiết.
- Sổ địa chỉ hiển thị dạng tóm tắt; form sửa chỉ mở khi yêu cầu và có Hủy. Không thấy lỗi quá tải rõ trong trạng thái một địa chỉ đã kiểm tra. [Danh sách](evidence/addresses.png), [form sửa](evidence/address-edit.png).
- Lịch sử đơn đã bỏ phần lớn UUID/metadata nội bộ so với review đầu. Lượt này không mở lại mục thiết kế tab đã ghi ở báo cáo trước.

## Giới hạn và kiểm tra

- Đã xem tìm kiếm, lọc danh mục/giá, giỏ hàng và picker, yêu thích, lịch sử đơn hoàn tất, đường vào tạo yêu cầu, danh sách/chi tiết/lịch sử đổi trả, thông báo và form sửa địa chỉ.
- Chỉ đọc và mở/đóng giao diện; không gửi đơn/yêu cầu, không sửa số lượng/phân loại, không bỏ yêu thích, đánh dấu thông báo, lưu địa chỉ hay đổi trạng thái đơn. Đã đăng nhập lại Chủ Store An Nhiên và bỏ viewport override.
- Các truy vấn tìm kiếm và lượt xem sản phẩm có thể được hệ thống ghi nhận tự động theo hành vi đọc thông thường.
- Không thấy console error trong log cuối phiên; không dùng điều này để kết luận mọi route đều không có lỗi mạng.
- Không thay đổi frontend/backend; không chạy build/E2E hoặc deploy trong lượt review này. Các kết quả build ở lượt trước không thay thế kiểm thử sau khi sửa T01–T08.
- Shopee/Lazada đã được nghiên cứu ở [review gốc](../../desktop-ux-2026-11-07/README.md). Lượt này không xác minh lại giao diện hiện hành của hai sàn; các hướng sửa trên là đề xuất cho PBL6 từ bằng chứng trực tiếp, không phải khẳng định hai sàn đang dùng chính xác cách trình bày đó.
