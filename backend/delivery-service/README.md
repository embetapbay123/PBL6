# Delivery

Dịch vụ vận chuyển độc lập có database riêng, API merchant, cổng điều phối và outbox webhook. Dịch vụ chỉ biết kiện hàng, địa chỉ, mã tham chiếu và nghĩa vụ thu hộ. PBL6 xử lý nghiệp vụ đơn hàng, tồn kho và thanh toán trên dữ liệu đồng bộ từ dịch vụ này.

## Chạy cùng môi trường demo

Chạy `python scripts/setup_local.py` để sinh cấu hình local. Docker Compose có hai dịch vụ `delivery` và `delivery-postgres`. Portal được gateway chuyển tới `/delivery/ops`. Mật khẩu đăng nhập là `DELIVERY_OPERATOR_PASSWORD` trong file `.env` được Git ignore. Phiên điều phối có cookie riêng, hết hạn sau bốn giờ.

Giao diện demo hiện bước tiếp theo trên từng vận đơn. Bấm Lấy hàng tự phân công Shipper demo nếu kiện chưa có người giao. Các bước giao thất bại, chuyển hoàn và nộp COD dùng ghi chú demo có sẵn. Giao thành công có xác nhận số tiền thu hộ. Khi mất phản hồi, nút thử lại tiếp tục cùng operation ID để giữ đúng hiệu ứng giao nhận.

M2 và worker M2 cần `DELIVERY_API_URL`, `DELIVERY_API_KEY`, `DELIVERY_WEBHOOK_SECRET`. Delivery cần `DELIVERY_DATABASE_URL`, `DELIVERY_API_KEY`, `DELIVERY_OPERATOR_PASSWORD`, `DELIVERY_SESSION_KEY`, `DELIVERY_WEBHOOK_SECRET` và `DELIVERY_WEBHOOK_URL`. Trên HTTPS bật `DELIVERY_COOKIE_SECURE=1` và đặt `DELIVERY_PUBLIC_ORIGIN` đúng origin truy cập portal.

Khi triển khai trên host khác, đặt URL callback công khai của PBL6 và URL API của Delivery tương ứng. Nếu portal được phục vụ ở root của domain riêng, dùng `DELIVERY_PUBLIC_PATH=/`. Hai bên chỉ trao đổi HTTP, database và code nghiệp vụ giao nhận có thể triển khai độc lập.

## API merchant

Các endpoint dùng `Authorization: Bearer <DELIVERY_API_KEY>`.

| Endpoint | Chức năng |
|---|---|
| `POST /api/v1/parcels` | Tạo kiện theo client_reference duy nhất |
| `GET /api/v1/parcels/:client_reference` | Tra cứu snapshot hiện tại |
| `POST /api/v1/parcels/:client_reference/commands` | Merchant yêu cầu CANCEL, REDELIVER hoặc RETURN |

Body tạo kiện gồm `client_reference`, `pickup`, `destination`, `contents`, `weight` theo gram và `cod_amount` theo VND. Có thể gửi thêm `handling_note` (tối đa 500 ký tự) để hiển thị lưu ý xử lý trên vận đơn. Địa chỉ gồm `name`, `phone`, `address`. Gọi lại với cùng mã và nội dung trả cùng kiện. Dùng lại mã với nội dung khác trả 409.

Body lệnh gồm `operation_id` dạng UUID, `expected_version`, `action`, `note`. Mỗi operation ID giữ nguyên nội dung qua các lần retry. Quyền điều phối như xác nhận đã lấy/giao hoặc thu COD thuộc cổng operator với phiên đăng nhập riêng.

## Webhook

Delivery POST body `{event_id, parcel}` tới URL cấu hình. `parcel` là snapshot có phiên bản tăng dần, trạng thái, số tiền thực thu và thời điểm nộp COD. Header `X-Delivery-Timestamp` dùng Unix seconds. `X-Delivery-Signature` là HMAC SHA-256 của `timestamp + '.' + rawBody` bằng webhook secret. Bên nhận kiểm tra chữ ký, thời gian trong năm phút, lưu inbox trước khi trả 2xx và chống trùng theo event ID.

Delivery lưu outbox cùng transaction cập nhật kiện, thử gửi lại khi timeout hoặc phản hồi lỗi. PBL6 bỏ qua phiên bản cũ và tra cứu API định kỳ để phục hồi callback bị mất. Lệnh tạo và các lệnh merchant được lưu bền vững ở PBL6 trước khi gửi.

## Migration

Delivery tự tạo schema riêng khi khởi động. PBL6 chạy thêm M2 `025_delivery_api.sql`. Trước khi chuyển từ bản điều phối trong PBL6, cần đối chiếu mọi vận đơn PLATFORM đang hoạt động. Các vận đơn mới chỉ cấp mã DLV sau khi API Delivery xác nhận tạo thành công.
