# Kế hoạch thiết kế lại giao nhận PBL6

**Cập nhật ngày 05/11/2026 — Dịch vụ Delivery độc lập**

Hệ thống giao hàng có process, database và cổng điều phối riêng tại `/delivery/ops`. PBL6 gửi yêu cầu tạo kiện qua API merchant có API key, sau đó chỉ cập nhật bản đồng bộ bằng webhook HMAC hoặc API tra cứu. Người điều phối đăng nhập Delivery bằng phiên riêng để phân công, xác nhận lấy/giao/chuyển hoàn và bàn giao COD. PBL6 xử lý nghiệp vụ đơn hàng, kiểm hàng, tồn kho và hoàn tiền theo dữ liệu nhận về.

Luồng tạo kiện dùng client reference cố định và outbox PBL6. Delivery lưu sự kiện callback cùng transaction chuyển trạng thái, retry khi lỗi, PBL6 lưu inbox và chống trùng theo event ID và phiên bản vận đơn. Mỗi bên có database riêng và chỉ giao tiếp HTTP. API từ merchant chỉ nhận yêu cầu tạo, hủy, giao lại và chuyển hoàn. Việc xác nhận giao thành công và thu COD thuộc cổng Delivery.

Cấu hình và API chi tiết nằm trong `backend/delivery-service/README.md`. Triển khai M2 migration `025_delivery_api.sql`, dịch vụ `delivery`, `delivery-postgres`, cấu hình API/webhook ở M2 và worker M2, rồi cập nhật gateway và frontend. Đối chiếu các vận đơn PLATFORM của bản điều phối cũ trước khi chuyển. Phí checkout tiếp tục dùng biểu phí đã cấu hình trong PBL6.

Ngày lập 04/11/2026. Đây là đề xuất thiết kế để triển khai trên GHN Staging.

PBL6 đứng tên tích hợp, quản lý điểm lấy và nhận hoàn, tạo vận đơn và đồng bộ hành trình. Seller chuẩn bị kiện hàng, bàn giao và kiểm hàng hoàn. Người mua theo dõi tiến trình trong PBL6.

**1. Các quyết định đề xuất**

- Bắt đầu với một tài khoản GHN Staging của nền tảng. Admin quản lý điểm lấy hàng gắn với kho seller.
- Xây module shipping trong commerce-service M2 và worker M2 hiện có. Tách giao tiếp GHN qua adapter để có thể bổ sung hãng khác.
- Giai đoạn đầu mỗi đơn của một seller có một vận đơn giao đi hoạt động. Mỗi yêu cầu trả hoặc đổi có thêm chặng thu hồi và chặng gửi hàng đổi khi cần.
- Vận đơn lưu snapshot địa chỉ, điểm lấy, điểm nhận hoàn, sản phẩm, số lượng, trọng lượng, kích thước và tiền thu hộ.
- Bật tích hợp theo cửa hàng và đơn mới. Mỗi vận đơn lưu rõ môi trường và chế độ vận hành.

GHN cho phép tạo điểm lấy hàng dưới tài khoản. Khả năng thu hồi từ địa chỉ khách cần kiểm chứng bằng tài khoản staging trước khi bật đặt lịch thu hồi tự động. [Điểm lấy hàng](https://developer.ghn.vn/vi/docs/shop/create-shop) · [Tạo vận đơn](https://developer.ghn.vn/vi/docs/order/create)

**2. Các phần hiện có cần sửa**

| Thành phần | Hiện tại | Thiết kế đích |
|---|---|---|
| Shipment | Một bản ghi mỗi order, ít thông tin hành trình | Nhiều chặng, liên kết order và hồ sơ trả/đổi |
| Seller chuyển trạng thái | Có thể đặt SHIPPED và COMPLETED thủ công | Với đơn tích hợp, seller chuẩn bị và yêu cầu lấy hàng, hãng xác nhận hành trình |
| Delivery Return | Seller mở hồ sơ, worker đối chiếu tồn và tiền rồi hủy đơn | Sự kiện chuyển hoàn mở hồ sơ, seller xác nhận thực nhận |
| Gửi hàng đổi | Trừ tồn thành công dẫn tới EXCHANGE_SENT | Giữ tồn, tạo vận đơn, xác nhận hãng đã lấy và hoàn tất lệnh kho |
| COD | Seller xác nhận thu tiền | Nền tảng tiếp nhận và đối soát bằng chứng thu hộ qua Payment port |

Các điểm bắt đầu trong backend/commerce-service/src gồm order/order.service.ts, order/order.repository.ts, returns/returns.service.ts, returns/returns.runner.ts, returns/delivery-return.service.ts và returns/delivery-return.runner.ts.

**3. Phân quyền và giao diện**

| Vai trò | Màn hình và thao tác |
|---|---|
| Admin | Cấu hình kết nối, duyệt điểm lấy hàng, xem toàn bộ vận đơn, đối chiếu lỗi, yêu cầu giao lại/chuyển hoàn, đối soát COD |
| Seller | Chọn điểm lấy đã duyệt, nhập kiện hàng, bấm Sẵn sàng lấy hàng, in nhãn, xem lịch lấy, theo dõi và kiểm hàng hoàn |
| Người mua | Xem mã vận đơn, thời gian dự kiến, timeline ngắn, báo vấn đề, yêu cầu trả/đổi, xác nhận nhận hàng đổi |
| GHN | Thực hiện lấy/giao/chuyển hoàn và cập nhật backend PBL6 |

Admin xem trạng thái kết nối và token đã che. Seller chỉ truy cập vận đơn thuộc cửa hàng. DTO người mua chỉ trả thông tin hành trình và hướng dẫn cần thiết. Payload kỹ thuật và secret được bảo vệ tại API.

**4. Luồng giao đi**

1. Khách đặt hàng. PBL6 chia đơn theo seller và xác nhận phương thức thanh toán.
2. Seller xác nhận, đóng gói, nhập trọng lượng và kích thước rồi bấm Sẵn sàng lấy hàng.
3. PBL6 ghi lệnh tạo vận đơn vào outbox. Worker gửi tới GHN và lưu mã vận đơn. UI hiện Đang tạo vận đơn trong lúc chờ.
4. Có mã vận đơn thì hiển thị Chờ lấy hàng và nhãn để in. Order ở PROCESSING.
5. GHN xác nhận đã lấy thì shipment chuyển PICKED_UP và order chuyển SHIPPED.
6. Các mốc vận chuyển cập nhật timeline. Giao hụt hiển thị lý do và lần giao lại khi có.
7. Hãng xác nhận delivered thì shipment chuyển DELIVERED. Order hoàn tất khi điều kiện tiền cũng được xác nhận. OrderCompleted được phát đúng một lần.

Mã client_order_code ổn định theo shipment giúp khôi phục yêu cầu tạo bị mất phản hồi. Worker tra lại bằng mã đó trước khi gửi lại. [API tạo vận đơn](https://developer.ghn.vn/vi/docs/order/create)

**5. Ánh xạ trạng thái dự kiến**

| Nội bộ PBL6 | Tín hiệu GHN | Xử lý |
|---|---|---|
| CREATING / CREATE_UNKNOWN | Đang gửi hoặc mất phản hồi | Tra lại kết quả bằng mã yêu cầu cố định |
| READY_FOR_PICKUP | ready_to_pick, picking | Chờ hãng lấy |
| PICKED_UP / IN_TRANSIT | picked, storing, sorting, transporting | Ghi nhận bàn giao và hành trình |
| OUT_FOR_DELIVERY | delivering | Hiển thị đang giao |
| DELIVERY_ATTEMPT_FAILED | delivery_fail | Lưu lần giao hụt và lý do |
| DELIVERED | delivered | Xét điều kiện hoàn tất order |
| RETURN_PENDING | waiting_to_return | Theo dõi quyết định giao lại hoặc chuyển hoàn |
| RETURNING | return, return_transporting, return_sorting, returning | Mở đúng một hồ sơ hoàn về cho vận đơn giao đi |
| RETURN_ATTEMPT_FAILED | return_fail | Theo dõi lần giao trả thất bại |
| RETURNED | returned | Thông báo seller xác nhận thực nhận và kiểm hàng |
| CANCELLED / EXCEPTION | cancel, exception, lost, damage, scrap | Đối chiếu hàng, tiền và quyết định xử lý |

Lưu cả trạng thái gốc của hãng. Sự kiện mới lạ đi vào hàng chờ đối chiếu. Quy tắc chuyển trạng thái phải hỗ trợ vòng giao lại và callback đến muộn. [Mã trạng thái GHN](https://developer.ghn.vn/vi/docs/master-data/order-status)

**6. COD, phí vận chuyển và thời hạn trả hàng**

- Tách tiền khách đã trả, tiền hãng đang thu hộ và tiền hãng đã chuyển về nền tảng.
- Giao thành công cập nhật hành trình. Ghi nhận thu COD cần bằng chứng phù hợp, số tiền khớp snapshot và đi qua Payment port.
- Giai đoạn đầu chỉ tự hoàn tất COD khi đã kiểm chứng nguồn dữ liệu thu hộ trên staging. Thiếu bằng chứng thì hiện Đã giao, chờ xác nhận thu hộ và đưa vào hàng đợi Admin.
- Sự kiện cod dùng cho đối soát tiền hãng chuyển về. Thời điểm này độc lập với ngày giao hàng và quyền gửi yêu cầu trả hàng.
- Phí thu khách chốt ở checkout. Cước hãng và điều chỉnh sau cân được lưu riêng để đối soát chênh lệch.
- Nếu báo giá hết hạn hoặc không lấy được, checkout báo giá lại hoặc dùng mức phí dự phòng do Admin cấu hình rõ.
- Đề xuất tính thời hạn trả hàng từ delivered_at của chặng giao đi đã xác nhận. Điều chỉnh ReturnPolicySnapshot và điều kiện tạo yêu cầu để tránh phụ thuộc thời gian đối soát COD. Đơn cũ tiếp tục dùng chính sách đã chốt khi mua.
- Trước vận hành thật bằng tài khoản nền tảng, bổ sung sổ ghi nhận tiền phải trả seller và quy trình quyết toán.

Tài liệu GHN phân biệt thay đổi số tiền COD và chuyển tiền COD. Cách xác nhận tiền khách đã trả cần kiểm chứng bằng dữ liệu staging. [Webhook GHN](https://developer.ghn.vn/en/docs/webhook/callback-order-status)

**7. Giao thất bại và hoàn về**

Giao hụt tạo mốc lịch sử. Khi hãng xác nhận chuyển hoàn, PBL6 mở Delivery Return theo shipment và liên kết order. Callback lặp tìm lại hồ sơ đã có.

Hãng báo returned thì seller được yêu cầu xác nhận thực nhận, nhập số lượng và tình trạng. Worker cộng tồn theo phần đủ điều kiện và xử lý tiền. Sau đối chiếu, hồ sơ đóng và order chuyển CANCELLED.

Giao lại dùng API và trạng thái hợp lệ của hãng. Mất hoặc hỏng toàn bộ chuyển sang xử lý ngoại lệ với bằng chứng và quyết định tiền riêng. Sự kiện hàng quay về kho cần đi qua kiểm hàng trước khi cộng tồn.

**8. Trả hàng sau khi đã giao**

1. Khách tạo Return Request trong hạn.
2. Seller hoặc Admin duyệt lý do và bên chịu phí.
3. PBL6 đặt lịch thu hồi, gắn với Return Request khi GHN hỗ trợ lấy từ địa chỉ khách.
4. Khách xem lịch và hướng dẫn đóng gói, webhook cập nhật hành trình thu hồi.
5. Seller xác nhận nhận hàng, kiểm hàng rồi xử lý tồn và hoàn tiền.
6. Nếu tài khoản chưa hỗ trợ thu hồi, khách khai báo hãng và mã vận đơn tự gửi. UI ghi rõ nguồn theo dõi và bước xác nhận thủ công.

Thu hồi sau bán dùng vận đơn riêng. API chuyển hoàn của kiện đang ở mạng lưới hãng áp dụng cho chính kiện đó.

**9. Đổi hàng**

- Sau kiểm hàng trả, seller chọn biến thể phù hợp và chuẩn bị kiện đổi.
- Giữ tồn trước khi đặt lịch lấy, lưu snapshot từng dòng và liên kết vận đơn EXCHANGE_OUTBOUND.
- Lệnh kho và tạo vận đơn có khả năng phục hồi độc lập. Hủy lịch chỉ giải phóng phần giữ tồn khi xác định hãng chưa nhận hàng.
- Chuyển EXCHANGE_SENT sau bằng chứng hãng đã lấy kiện đổi và xác nhận kho thành công.
- Hãng báo đã giao kiện đổi thì nhắc khách xác nhận nhận hàng để kết thúc yêu cầu.
- Nếu kiện đổi giao thất bại, hồ sơ nhận hoàn gắn với chặng đổi và Return Request. Dùng receipt riêng cho hàng đổi để tránh cộng lại hàng mua ban đầu hoặc hủy đơn gốc đã hoàn tất.

**10. Dữ liệu, webhook và phục hồi**

| Dữ liệu | Nội dung |
|---|---|
| shipping_connection | Tài khoản nền tảng, môi trường, trạng thái, tham chiếu secret |
| pickup_location | Kho seller, điểm lấy của hãng, địa chỉ và liên hệ |
| shipment | Order, seller, loại chặng, return_request_id, provider, environment, mã vận đơn, snapshot kiện và trạng thái |
| shipping_command | Create/cancel/redeliver/return, operation ID, body cố định, lần thử và kết quả |
| shipping_webhook_receipt | Khóa chống trùng, payload được bảo vệ, thời điểm nhận và trạng thái xử lý |
| shipment_event | Timeline chuẩn hóa và nguồn dữ liệu |
| carrier_settlement | Khoản hãng chuyển và kết quả đối soát |

API đề xuất gồm tạo vận đơn từ đơn seller, đọc hành trình theo phạm vi, lấy nhãn, yêu cầu hủy/giao lại/chuyển hoàn và Admin quản lý điểm lấy. Bổ sung contract và sinh lại types, DTO, registry theo quy trình repo.

Endpoint dự kiến POST /api/v1/shipping/webhooks/ghn kiểm tra secret header, môi trường, tài khoản, ShopId và mapping vận đơn. Trả thành công sau khi lưu receipt bền vững. Worker xử lý theo transaction, khóa shipment và gọi các port nghiệp vụ.

Callback tới trước phản hồi tạo vận đơn được ghép qua client_order_code. Callback cũ hoặc xung đột được đối chiếu với API hãng. Job đọc lại vận đơn đang hoạt động phục hồi sự kiện bị mất. Khóa chống trùng phải gồm tài khoản và môi trường, cùng OrderCode, Type và Time.

**11. Chuyển dữ liệu và deploy**

1. Migration mở rộng, đánh dấu shipment cũ LEGACY_MANUAL. Rà unique constraint order_id và mọi SQL đọc/ghi/join để loại bỏ giả định một vận đơn mỗi order.
2. Deploy M2, worker và migration trước, cấu hình secret trên server.
3. Deploy UI khi backend đã có contract. Script Deploy-Demo-Web.cmd chỉ cập nhật web, cần quy trình riêng cho backend và worker.
4. Bật thử trên một seller và điểm lấy. Đơn cũ theo chế độ lưu trên shipment.
5. Khi dừng tạo vận đơn mới, vẫn tiếp nhận và xử lý các vận đơn đang chạy. Bản rollback phải tương thích migration mở rộng và dữ liệu đang vận hành.

**12. Thứ tự triển khai và nghiệm thu**

| Đợt | Phạm vi | Điều kiện hoàn thành |
|---|---|---|
| 1 | Kết nối staging, điểm lấy, adapter, migration, tạo/tra vận đơn, webhook inbox | Tạo mã vận đơn trên staging, retry an toàn, nhận callback đã xác thực |
| 2 | Seller sẵn sàng lấy, Admin vận đơn, timeline khách, giao thành công | Quyền seller đúng phạm vi, webhook khớp đơn, OrderCompleted đúng một lần |
| 3 | Giao lại, chuyển hoàn, kiểm hàng, COD và phí | Giao hụt có thể giao lại, hồ sơ hoàn đúng chặng, tồn và tiền ghi nhận đúng một lần |
| 4 | Thu hồi sau bán và gửi hàng đổi | Mã riêng cho từng chặng, xử lý đúng kiện đổi giao thất bại |
| 5 | Hồi phục, nhiều seller, dữ liệu cũ, demo end-to-end | Timeout, callback trùng/đến muộn, mất webhook và đổi quyền có bằng chứng kiểm thử |

Kịch bản bắt buộc gồm mất phản hồi tạo vận đơn, callback tới sớm, secret sai, mã vận đơn của seller khác, giao hụt rồi giao lại, chuyển hoàn kiểm thiếu, COD thiếu bằng chứng, hủy đồng thời hãng lấy hàng, kiện đổi bị hoàn và đơn legacy.

Thông tin cần kiểm chứng khi triển khai gồm token thuộc staging, ShopId dưới tài khoản nền tảng, địa chỉ kho thử và khả năng chủ động tạo các trạng thái thử/thu hồi trên staging. Các sự kiện giả lập dùng trong test được ghi rõ trong bằng chứng demo.

**13. Chuẩn bị chạy bản triển khai**

1. Chạy migration M1 `015_exchange_returns.sql` và M2 `023_platform_shipping.sql`. Cập nhật M1, M2 và worker M2 trước khi cập nhật web.
2. Khi có thông tin GHN, cấu hình `GHN_ENVIRONMENT=staging`, `GHN_ACCOUNT_KEY`, `GHN_TOKEN`, `GHN_WEBHOOK_SECRET` (ít nhất 24 ký tự) và `SHIPPING_ENABLED=1` cho M2 và worker M2. Giữ `GHN_VERIFY_COD_COLLECTION=0` cho đến khi xác minh được bằng chứng thu hộ từ staging.
3. Đăng ký webhook Order tại `POST /api/v1/shipping/webhooks/ghn` trên domain đã triển khai. Đặt header `X-GHN-Webhook-Secret` bằng secret trên server. Đăng ký ShopId trong **Admin → Giao nhận hàng** trước khi thử callback.
4. Bật một kho thử cho một seller. Tạo đơn mới, đóng gói, đặt lấy, kiểm tra mã vận đơn và các mốc trên trang đơn khách hàng. Dùng đơn cũ để kiểm tra luồng thủ công vẫn đọc và xử lý được.

Bản triển khai dùng phí checkout đã có và ghi cước GHN trả về khi tạo đơn. Hàng trả sau bán dùng mã vận đơn do khách tự gửi cho đến khi xác minh được khả năng đặt thu hồi tại địa chỉ khách. Hàng đổi dùng lệnh xuất kho hiện có để chuẩn bị kiện, sau đó mới tạo vận đơn. GHN xác nhận lấy kiện mới chuyển trạng thái sang đã gửi. Nếu kiện đổi bị hoàn, biên bản riêng cộng tồn phần đủ điều kiện và đưa ra đề nghị hoàn tiền để khách quyết định.
