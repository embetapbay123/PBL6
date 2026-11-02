# Review UI marketplace — 29/10/2026

## Kết quả review core cập nhật

Review bổ sung theo nhu cầu/thao tác thực tế: [user-workflow-review.md](core-review/user-workflow-review.md). Tách rõ chức năng chạy đúng với việc người dùng có đủ thông tin, hiểu bước tiếp và hoàn thành công việc mua/bán ngoài đời.

Báo cáo có bằng chứng mới theo 13 đợt nằm tại [core-review/README.md](core-review/README.md); danh sách bug chuẩn hóa tại [core-review/findings.md](core-review/findings.md). Các giới hạn Playwright ở phần ghi chép ban đầu bên dưới đã được khắc phục trong lượt core review bằng Edge với quyền thực thi phù hợp. Không dùng các con số nghiệm thu cũ thay cho kết quả chạy lại.

| Phát hiện ban đầu | ID mới | Kết quả xác minh lại |
|---|---|---|
| Mua ngay cộng giỏ | CR-001 | CONFIRMED: fixture UI và API/database thật; giữ P1 |
| Tạo sản phẩm sau lỗi không xác định | CR-002 | Hạ P2; rút lại kết luận tạo trùng cùng SKU mức P1: DB unique/transaction chặn bằng 409; UI vẫn cho retry sau 503 |
| Yêu thích chi tiết | CR-003 | CONFIRMED bằng browser fixture |
| Tim nhiều thẻ lệch nhau | CR-004 | CONFIRMED bằng fixture có state server và nhiều thẻ |
| Chat che thẻ mobile | CR-005 | CONFIRMED trên ảnh chụp mới 390px đã xem trực tiếp |
| Hoàn COD không có đường kết thúc | CR-006 | CONFIRMED bằng hành trình HTTP/DB thật; P1 do core sau bán bị kẹt |
| Refund chờ không làm mới | CR-007 | CONFIRMED: không refetch tự động và không có nút làm mới trong trạng thái chờ |
| Badge giỏ cũ | CR-008 | CONFIRMED nhánh xóa bằng browser fixture; nhánh checkout đối chiếu source và DB |
| Hash không cuộn tới form | CR-009 | CONFIRMED qua scrollY/bounding box sau render bất đồng bộ |

Lượt core review bổ sung hồ sơ theo từng tính năng, ca tái hiện độc lập và các vấn đề mới về auth refresh, hồ sơ, địa chỉ, staff, voucher, báo cáo, review bị ẩn và bảng Seller mobile. Xem báo cáo core để biết mức độ và các trường hợp còn BLOCKED/STATIC_FINDING.

## Phạm vi

Review các thay đổi UI chưa commit trong workspace, tập trung vào storefront, mua hàng, yêu thích và danh sách sản phẩm người bán. Đã đọc mã frontend và các hợp đồng backend liên quan; xem ảnh render storefront desktop 1440px và mobile 390px có sẵn trong `artifacts/ui-review/`. Đây là ảnh từ lần kiểm tra trước, không phải ảnh chụp live trong lần review này.

## Phát hiện

### P1 — Mua ngay có thể đưa số lượng cũ trong giỏ vào checkout

- Vị trí: `frontend/src/features/customer/ProductDetail.tsx:98–106`, `backend/commerce-service/src/cart/cart.service.ts:59–69`.
- Khi giỏ đã có 3 sản phẩm cùng phân loại, chọn số lượng 1 và bấm **Mua ngay** sẽ gọi API thêm vào giỏ. Backend cộng thành 4 và trả ID của dòng giỏ cũ; UI dùng ID đó để chọn dòng checkout. Kết quả là báo giá hiển thị 4 sản phẩm, không phải 1 sản phẩm vừa chọn.
- Tác động: khách có thể đặt và thanh toán nhiều hơn dự định. Báo giá vẫn hiển thị số lượng thực tế, nhưng thao tác ban đầu không phản ánh ý định mua ngay.
- Hướng xử lý: thiết kế luồng checkout giữ riêng số lượng mua ngay, không gộp với dòng giỏ hiện có; nếu chưa hỗ trợ, cần thông báo rõ và yêu cầu xác nhận số lượng sau khi gộp. Bổ sung test có sẵn dòng giỏ cùng phân loại và kiểm tra số lượng trên báo giá.

### P2 — Tạo sản phẩm có thể bị gửi lại sau lỗi không xác định

- Vị trí: `frontend/src/features/seller/ProductList.tsx:59–90`.
- Form chỉ đánh dấu kết quả không chắc chắn khi `ApiError.status === 0`. Nếu request tạo đã được xử lý nhưng gateway trả 408 hoặc 5xx trước khi client nhận kết quả, `createdId` chưa được đặt, nút tạo lại được bật và người bán có thể gửi thêm một lần.
- Tác động đã hiệu chỉnh: gửi lại cùng payload/SKU gặp lỗi SKU trùng nếu lần đầu đã tạo thành công; transaction và unique index bảo vệ khỏi tạo bản ghi sản phẩm trùng với cùng SKU. Rút lại đánh giá ban đầu về nguy cơ tạo trùng mức P1; lỗi còn lại là hướng dẫn retry sau kết quả chưa xác định.
- Hướng xử lý: dùng idempotency key nếu API hỗ trợ; nếu không, coi 408/5xx là kết quả chưa xác định và hướng dẫn kiểm tra danh sách trước khi thử lại. Kiểm thử phản hồi lỗi sau khi server đã ghi dữ liệu.

### P2 — Chi tiết sản phẩm không phản ánh trạng thái yêu thích đã lưu

- Vị trí: `frontend/src/features/customer/ProductDetail.tsx:31, 116–120, 228`.
- `favoriteSaved` khởi tạo `false` mỗi lần mở sản phẩm và không đọc danh sách yêu thích. Vì vậy sản phẩm đã lưu vẫn hiện **Lưu yêu thích**; sau khi lưu qua trang này nút bị vô hiệu hóa, không có thao tác bỏ yêu thích tại chỗ.
- Hướng xử lý: đọc trạng thái từ query chung với thẻ sản phẩm và hỗ trợ cả lưu lẫn bỏ lưu; hiển thị lỗi tải trạng thái thay vì giả định chưa lưu.

### P2 — Trạng thái yêu thích trên các thẻ có thể lệch nhau

- Vị trí: `frontend/src/live/ProductCardActions.tsx:16–20, 28–30`.
- Sau thao tác đầu, `savedOverride` được giữ trong state của từng thẻ và luôn được ưu tiên hơn dữ liệu query, kể cả sau khi query được làm mới. Nếu cùng sản phẩm xuất hiện đồng thời ở nhiều nơi, thay đổi từ thẻ khác có thể khiến tim và phương thức PUT/DELETE của thẻ cũ không còn đúng.
- Hướng xử lý: dùng query cache làm nguồn trạng thái chung; cập nhật hoặc invalidate cache sau mutation, không giữ override vô thời hạn. Test hai thẻ cùng sản phẩm và thao tác xen kẽ.

### P3 — Nút chat nổi che một phần thông tin sản phẩm trên mobile

- Vị trí: `frontend/src/live/commerce.css:13, 17, 34`; bằng chứng: `artifacts/ui-review/guest--390.png`.
- Trong ảnh 390px, nút chat nổi phủ lên khu vực giá của thẻ bên phải. Người dùng có thể cuộn để xem, nhưng các nội dung và nút khác cũng đi qua vùng bị phủ khi cuộn.
- Hướng xử lý: cân nhắc nút chat nhỏ hơn hoặc tích hợp vào điều hướng, rồi kiểm tra trên viewport nhỏ và khi bàn phím mở. Nhận xét này dựa trên ảnh đã lưu, cần xác nhận lại ở phiên live.

## Bổ sung từ lượt review tiếp theo

### P2 — UI cho gửi yêu cầu hoàn tiền COD nhưng không có đường hoàn tất

- Vị trí: `frontend/src/features/returns/OrderReturnsPanel.tsx:10–12, 28`; `frontend/src/features/returns/ReturnsPage.tsx:27, 44`; `backend/commerce-service/src/payment/refund.runner.ts:23–26`; `backend/commerce-service/src/returns/returns.service.ts:67–68`.
- Mọi đơn hoàn tất, kể cả COD, đều được mở form và mặc định chọn **Trả hàng và hoàn tiền**. Người bán có thể duyệt rồi xác nhận nhận hàng trả. Tuy nhiên, worker chỉ tạo refund cho thanh toán `SANDBOX`; UI yêu cầu `refund_status === 'SUCCEEDED'` mới bật nút hoàn tất, backend cũng yêu cầu chứng từ hoàn đủ tiền.
- Tác động: yêu cầu hoàn tiền COD đi tới `RECEIVED` rồi bị kẹt trong luồng hiện có. `docs/implementation/marketplace-feature-matrix.md` cũng xác nhận chưa có adapter hoàn COD.
- Hướng xử lý: chưa cho chọn REFUND với COD và giải thích điều kiện trước khi gửi, hoặc triển khai quy trình ghi nhận/đối soát hoàn COD đầy đủ. Không bỏ kiểm tra chứng từ để mở nút hoàn tất.
- Test cần bổ sung: đơn COD hoàn tất không được đưa vào quy trình hoàn tiền không hỗ trợ; EXCHANGE vẫn hoạt động theo điều kiện nghiệp vụ.

### P2 — Màn đổi trả giữ trạng thái chờ hoàn tiền dù backend đã cập nhật

- Vị trí: `frontend/src/features/returns/ReturnsPage.tsx:13, 27, 43–45`.
- Query danh sách tắt `refetchOnWindowFocus`, không có polling và không có nút làm mới thường trực. Khi mở màn ở trạng thái REFUND/RECEIVED và chưa hoàn tiền, `refundPending` khóa nút hoàn tất. Nếu refund chuyển thành SUCCEEDED trong lúc màn vẫn mở, dữ liệu cũ tiếp tục khóa nút. Nút **Tải lại yêu cầu** chỉ xuất hiện sau lỗi bị đánh dấu `blocked`, không xuất hiện trong tình huống chờ bình thường.
- Hướng xử lý: thêm nút làm mới khả dụng trong trạng thái chờ và/hoặc polling có điều kiện khi màn hiển thị, dừng khi đã có kết quả cuối. Tải lại chứng từ trước thao tác hoàn tất.
- Test cần bổ sung: mở màn với refund đang xử lý, backend đổi sang SUCCEEDED, người dùng cập nhật được màn và thực hiện bước hoàn tất mà không cần reload toàn bộ trình duyệt.

### P2 — Badge giỏ hàng không đồng bộ sau xóa và xác nhận checkout

- Vị trí: `frontend/src/live/MarketplaceHeader.tsx:10`; `frontend/src/features/customer/CartPage.tsx:105–119`; `frontend/src/features/customer/CheckoutPage.tsx:394–408`.
- Header đọc số dòng giỏ từ query `['cart-summary']`. Thêm hàng có invalidate query này, nhưng xóa ở CartPage chỉ cập nhật state cục bộ; xác nhận checkout thành công cũng không invalidate. Backend xóa các dòng đã đặt khỏi giỏ (`backend/commerce-service/src/order/order.repository.ts:291`).
- Tác động: xóa hết giỏ hoặc đặt hết sản phẩm xong, badge trên header vẫn có thể báo còn hàng. Header tồn tại xuyên điều hướng; `staleTime: 30000` chỉ đánh dấu dữ liệu cũ, không tự tạo một lần refetch sau 30 giây.
- Hướng xử lý: invalidate hoặc cập nhật cache giỏ chung sau DELETE và sau confirmCheckout thành công. Không xóa badge trước khi server xác nhận thành công.
- Test cần bổ sung: badge về 0 sau xóa mục cuối và sau checkout hết giỏ, giữ đúng số dòng còn lại nếu chỉ checkout một phần.

### P2 — Các lối tắt Hủy đơn / Viết đánh giá không đưa tới vùng thao tác

- Vị trí: `frontend/src/features/customer/OrderHistoryPage.tsx:22`; `frontend/src/features/customer/OrderDetailPage.tsx:33`; `frontend/src/live/LiveApp.tsx`.
- Các nút mới dùng React Router Link tới `#cancel`, `#returns`, `#order-items` hoặc `#reviews`. Ứng dụng dùng BrowserRouter/useRoutes nhưng không có ScrollRestoration hay effect xử lý các hash này; tìm kiếm toàn bộ mã TSX chỉ thấy handler riêng cho `#danh-muc` trên mobile. Đổi URL bằng SPA navigation không tự cuộn đến phần tử như điều hướng tài liệu thông thường, và các vùng mục tiêu còn xuất hiện sau request bất đồng bộ.
- Tác động: bấm **Hủy đơn**, **Yêu cầu đổi trả** hoặc **Viết đánh giá** vẫn mở trang nhưng không bảo đảm người dùng được đưa tới form tương ứng, đặc biệt khó nhận biết trên mobile dài.
- Hướng xử lý: xử lý hash sau khi dữ liệu và phần tử đích render; cuộn tới đích với khoảng bù sticky header hiện có, đồng thời chuyển focus hợp lý. Xác minh lại bằng trình duyệt vì lượt này chưa chạy được kiểm thử tương tác.
- Test cần bổ sung: click từng lối tắt từ trang khác, chờ API hoàn tất và kiểm tra vùng đích nằm trong viewport/focus phù hợp; kiểm tra cả back/forward.

## Xác minh và giới hạn

- `npm run build` trong `frontend`: thành công.
- Thử chạy lại 4 test Playwright có sẵn cho giỏ hàng, mua ngay, yêu thích và bộ lọc mobile: không chạy được tới bước kiểm tra. Chromium mặc định thiếu binary; khi dùng Chrome cài sẵn, trình duyệt bị `ERR_NETWORK_ACCESS_DENIED` khi truy cập server localhost. Đây là giới hạn môi trường, không phải kết quả xác nhận lỗi UI.
- Các kết luận chức năng trên dựa trên phân tích mã và hợp đồng frontend/backend; chưa tái hiện bằng dữ liệu thật trong lần review này.
- Test fixture hiện có cho mua ngay chỉ trả về dòng giỏ với số lượng bằng số vừa chọn, nên chưa bao phủ trường hợp dòng giỏ đã tồn tại. Test yêu thích hiện có kiểm tra một thẻ và reload, chưa kiểm tra đồng bộ giữa hai thẻ.
- Bộ ảnh có sẵn dùng sản phẩm seed không có ảnh; chưa thể kết luận chất lượng hiển thị ảnh thật, tên dài hoặc danh mục lớn từ ảnh đó.
- Không sửa mã ứng dụng trong lượt review này.
- Lượt review bổ sung đối chiếu giỏ hàng, checkout, thanh toán, taxonomy/kiểm duyệt và đổi trả với backend; các mục bổ sung là kết quả phân tích mã, chưa phải tái hiện live. Không chạy lại build vì lượt này chỉ cập nhật tài liệu. Kết quả build thành công ở trên thuộc lượt review trước.
