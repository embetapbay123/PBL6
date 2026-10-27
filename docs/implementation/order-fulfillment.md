# Lọc đơn và giao nhận thủ công

Cập nhật 27/10/2026. Lát cắt D5 giữ owner M2 Hoa, Seller Thịnh, Customer Hatsaphone và Admin Trí. Công hỗ trợ contract/transaction; có code không tự đóng acceptance của các task gốc.

## API và màn hình

| Chức năng | API | Web |
| --- | --- | --- |
| Đơn của Customer | `GET /me/orders` | `/customer/orders` |
| Đơn của Store hiện tại | `GET /store/orders` | `/seller/orders` |
| Đơn toàn sàn, quyền Admin | `GET /admin/orders` | Admin → Đơn hàng |
| Giao nhận | `PATCH /store/orders/{id}/status` | Store → Xem đơn |

Ba API list dùng query `status`, `q`, `from`, `to`, `page`, `size`. `q` nhận UUID hoặc mã hiển thị `PBL-` kèm 8 ký tự cuối UUID; mã ngắn là phương tiện tìm kiếm, không thay thế UUID hay kiểm quyền, có thể khớp nhiều đơn. `from` bao gồm, `to` không bao gồm; nhập ngày kết thúc trên Web sẽ gửi đầu ngày kế tiếp theo múi giờ thiết bị. Phân trang giữ nguyên bộ lọc. Query và count đều giữ scope Customer/Store, không tải toàn sàn rồi lọc ở browser.

## Một writer cho Order và Shipment

`OrderService.transitionStoreOrder` dùng một transaction M2 cho Order, history, Shipment, audit và event. Repository nhận manager của transaction. Sau ghi, response đọc lại đúng scope bằng cùng manager để trả Shipment và lịch sử mới nhất.

| Chuyển trạng thái | Điều kiện bổ sung | Bằng chứng được ghi |
| --- | --- | --- |
| PROCESSING → SHIPPED | `shipment.carrier_name`, `shipment.tracking_code` không rỗng; `dispatch_note` tùy chọn | Actor từ phiên, server timestamp gửi hàng, thông tin đơn vị/mã giao |
| SHIPPED → COMPLETED | Payment SUCCEEDED, thu đủ; `delivery_confirmation.confirmed=true`, `note` không rỗng | Actor, server timestamp giao xong, căn cứ giao nhận; OrderCompleted cùng transaction |
| Giao thất bại | Luồng Return hiện có, đơn đang SHIPPED | Shipment DELIVERY_FAILED; không cho hoàn tất khi hồ sơ Return đang mở |
| Store nhận lại hàng giao thất bại | Xác nhận nhận thực tế và disposition trong Return | Shipment RETURNED; Restock vẫn đi qua recovery, không cộng kho lần hai |

Ví dụ phần body khi gửi hàng:

```json
{"to_status":"SHIPPED","expected_version":2,"shipment":{"carrier_name":"Store tự giao","tracking_code":"MANUAL-001","dispatch_note":"Đã bàn giao đủ kiện"}}
```

Ví dụ khi giao xong:

```json
{"to_status":"COMPLETED","expected_version":3,"delivery_confirmation":{"confirmed":true,"note":"Đã đối chiếu phiếu giao có xác nhận người nhận"}}
```

Đây là xác nhận thủ công; chưa phải tracking qua API hãng vận chuyển hoặc hệ thống upload chứng từ. Tiền đã thu không tự chứng minh khách đã nhận. Hàng Customer trả sau giao thành công không đổi Shipment gốc DELIVERED thành giao thất bại; hồ sơ Return phản ánh chiều trả hàng.

Migration M2 **012_shipment_evidence.sql** chỉ bổ sung cột và index. Dữ liệu cũ có `source=LEGACY`; không bịa carrier/actor/thời điểm cho các bản ghi thiếu. Các client gửi chuyển SHIPPED/COMPLETED phải bổ sung body theo contract 2.4.1; Customer mobile đọc Shipment tùy chọn vẫn tương thích.

## Kiểm chứng và giới hạn

- `backend/tests/integration/order-fulfillment.test.ts`: scope/count/page/code/period, ghi Shipment/version concurrent, payment/receipt gate, audit rollback và giao thất bại/nhận lại hàng qua recovery.
- `frontend/tests/demo-operations.spec.ts`: lọc Customer qua pagination, biểu mẫu gửi hàng và xác nhận giao xong; API được intercept trong test, không coi là nghiệm thu domain.
- `backend/tests/integration/commerce-regression.test.ts`: HTTP chuyển đơn/COD/Shipment chạy trong stack CI riêng.

Phần này chưa hoàn thiện Cart mất ACK, chính sách Return theo ngày, trả từng dòng, hoàn từng phần, phiếu nhập hoặc báo cáo theo thời điểm phát sinh. Refund Sandbox đang tạm dừng kiểm thử theo yêu cầu chủ dự án; không thay đổi cấu hình provider trong lát cắt này.
