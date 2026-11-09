# Demo giao nhận qua Delivery

Delivery là hệ thống vận chuyển riêng, có cơ sở dữ liệu và phiên đăng nhập riêng. PBL6 đặt kiện qua API merchant; Delivery gửi webhook có chữ ký về PBL6. Seller chuẩn bị kiện và gửi yêu cầu, nhân viên Delivery xác nhận lấy / giao hàng.

## Mở demo

- PBL6: https://demo.congnguyen.me/
- Cổng Delivery: https://demo.congnguyen.me/delivery/ops
- Mật khẩu Delivery nằm ở biến `DELIVERY_OPERATOR_PASSWORD` trong `infrastructure/.env` được Git ignore. Không đưa mật khẩu hoặc API key vào frontend.

Demo đã bật kho cho **An Nhiên Studio** và **Mây Xanh Living**, dùng địa chỉ nhận trả sẵn có của từng cửa hàng. Dùng cặp tài khoản **Khách hàng A / Chủ Store An Nhiên** hoặc **Khách hàng B / Chủ Store Mây Xanh** trong đăng nhập nhanh để thử luồng này. Cửa hàng khác cần cấu hình kho riêng trước khi đặt lịch.

Đơn mới luôn dùng vận chuyển do nền tảng quản lý. Thiếu kho thì màn hình yêu cầu cấu hình kho, không chuyển sang giao thủ công. Migration M2 `027_managed_shipping_default.sql` chuyển đơn cũ chưa bàn giao và chưa có hành trình/hồ sơ đổi trả sang luồng mới; đơn đã bàn giao hoặc đã đóng giữ lịch sử hiện có.

## Giao một đơn COD

1. Admin vào **Giao nhận hàng**, thêm kho Delivery cho cửa hàng và bật áp dụng cho đơn mới. Điền người liên hệ, điện thoại và địa chỉ lấy hàng. Mỗi cửa hàng chỉ có một kho đang bật.
2. Khách tạo **đơn mới** của cửa hàng đó. Đơn chưa bàn giao đã được chuyển sang vận chuyển qua nền tảng; đơn cũ đã có hành trình hoặc đã đóng giữ lịch sử hiện có.
3. Seller chọn **Hàng nhỏ** hoặc **Hàng to**, tích **Dễ vỡ** nếu cần rồi bấm **Gọi Delivery**. Chờ mã `DLV-…` và tiếp tục ở cổng Delivery. Ghi chú dễ vỡ hiện ngay trên vận đơn.
4. Đăng nhập cổng Delivery, tìm kiện theo người nhận hoặc mã vận đơn. Bấm **Lấy hàng → Đi giao → Giao thành công**. Bước lấy hàng tự phân công Shipper demo.
5. Nếu kiện có COD, xác nhận đã thu đúng số tiền. PBL6 cập nhật đơn sau khi nhận webhook; trang khách và seller tự tải lại định kỳ.
6. Bấm **Nộp COD** trên Delivery để ghi nhận tiền hãng bàn giao cho nền tảng. Đây là mốc khác với việc khách đã trả tiền lúc nhận hàng.

## Các nhánh khác

| Kịch bản | Thao tác |
|---|---|
| Hủy trước khi lấy | Seller / Admin bấm **Hủy lịch** trên PBL6. Chờ hãng xác nhận hủy rồi mới đặt kiện mới. |
| Tạo kiện bị từ chối | PBL6 hiện **Chưa tạo được vận đơn**. Hủy yêu cầu lỗi, sửa thông tin và đặt lại. |
| Mất phản hồi tạo kiện | Giữ nguyên yêu cầu đang xác minh; worker dùng lại mã tham chiếu để phục hồi cùng kiện. |
| Giao hụt rồi giao lại | Delivery bấm **Giao hụt**. Seller / Admin yêu cầu giao lại trên PBL6, hoặc nhân viên Delivery bấm **Giao lại**. Sau đó tiếp tục giao. |
| Giao hụt rồi hoàn kho | Yêu cầu **Chuyển hoàn**, Delivery xác nhận **Đã hoàn**. Seller kiểm hàng trong hồ sơ hoàn về rồi đối chiếu tồn / tiền. Một lần giao hụt chưa tự mở hồ sơ hoàn về. |
| Khách trả sau bán | Khách gửi yêu cầu, seller duyệt; khách bấm **Đặt lịch**. Delivery nhận kiện ở địa chỉ khách và giao về kho. Seller chỉ kiểm hàng khi hãng đã bàn giao về kho. Kiện này không thu lại COD của đơn gốc. |
| Thu hồi chưa giao được về kho | Delivery giao lại hoặc chuyển hoàn kiện về địa chỉ khách. Khi hãng xác nhận đã trả lại khách, khách có thể đặt lần lấy mới; lịch sử kiện cũ vẫn giữ nguyên. |
| Đổi hàng | Sau khi nhận / kiểm hàng trả và chuẩn bị hàng đổi, seller đặt kiện đổi. Delivery lấy rồi giao kiện mới. Khách chỉ xác nhận hoàn tất đổi sau khi hãng báo giao thành công. |
| Kiện đổi bị hoàn | Delivery chuyển hoàn và bàn giao về kho. Seller kiểm riêng kiện đổi; hệ thống đối chiếu biến thể thay thế, giữ nguyên đơn gốc và đưa ra đề nghị hoàn tiền để khách phản hồi. |

Khi mất phản hồi một thao tác trong cổng Delivery, dùng **Thử lại**. Nút này giữ cùng operation ID; không cần tạo kiện hoặc chuyển bước thủ công lần nữa.

## Chạy local và kiểm thử

Xem cấu hình và API tại [Delivery README](../../backend/delivery-service/README.md). `python scripts/setup_local.py` sinh các secret còn thiếu; Docker Compose chạy `delivery` và `delivery-postgres` riêng.

Các bài kiểm thử dùng PostgreSQL riêng có tên database `shipping_test`. Đặt `SHIPPING_TEST_DATABASE_URL`, rồi chạy từ thư mục `backend`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --config jest.integration.cjs tests/integration/delivery-api.test.ts tests/integration/delivery-flows.test.ts tests/integration/shipping.test.ts
```

`delivery-api` kiểm tra HTTP và webhook ký thật; `delivery-flows` kiểm tra phục hồi khi mất webhook, tạo / hủy / giao lại / chuyển hoàn, thu hồi sau bán và giao kiện đổi; `shipping` kiểm tra kho M1 và biên bản kiện đổi, gồm mất phản hồi sau khi đã cộng tồn.

Script `scripts/deploy-demo-web.ps1` chỉ triển khai frontend PBL6. Thay đổi Delivery, M2 hoặc worker cần build backend và cập nhật các service đó riêng. Thay đổi schema cần chạy migration tương ứng trước khi bật code mới. M2 `026_return_pickup_retry.sql` cho phép đặt lần lấy mới sau khi kiện thu hồi đã quay lại khách.
