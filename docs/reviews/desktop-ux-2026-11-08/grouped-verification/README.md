# Kiểm chứng S01, T08 và thông báo nhóm từ Backend

Ngày 08/11/2026. Đối chiếu mã local, chạy kiểm tra tập trung và xem demo https://demo.congnguyen.me ở desktop 1366 × 768. Không sửa mã ứng dụng hoặc deploy trong lượt này.

## Kết quả chính

| Mục | Bằng chứng | Kết luận |
|---|---|---|
| S01 | min_price đã dùng SKU active còn hàng, cùng khoảng giá lọc; không lọc mới có fallback. Cả hai chiều vẫn dùng min_price. Có test SQL cô lập A/B/C/D cho tăng, giảm và fallback | Đã sửa logic source. Test tích hợp không chạy trong môi trường lượt review này — xem phần kiểm tra |
| T08 | Hồ sơ `#C6820A81` nay hiện một mốc kiểm hàng và **Xem các lần lưu trước (7)**. Mở được đủ bảy thời điểm; phí/khoản hoàn vẫn rõ. Source flatMap và khử trùng trước khi nhóm; tách khi fault_party/fee_payer/amount_vnd khác nhau | Có thể đóng trong phạm vi đã kiểm chứng |
| T03 — gộp xuyên trang | Demo có **35 nhóm**, trang 1 có 20, trang 2 có 15. Đơn `#31FD4AD2` chỉ hiện nhóm ORDER_STATUS Hoàn tất ở trang 1, không còn nhóm trạng thái cũ ở trang 2. Lịch sử nhóm ba sự kiện tải được khi mở | Lỗi phân mảnh nhóm cũ đã sửa. Còn G01/G02 của chức năng mới bên dưới |

## G01 — P2: Mốc đánh dấu đọc mất độ chính xác microsecond

**Phát hiện qua source và chẩn đoán parser thực tế, chưa bấm đánh dấu đọc trên demo dùng chung.**

Danh sách chuyển `occurred_at` thành JavaScript Date và xuất `created_at` qua `toISOString()`. Frontend gửi giá trị này làm `up_to`; service tiếp tục gọi `new Date(upTo)` rồi so sánh `occurred_at <= $4` với timestamp gốc trong PostgreSQL.

Các cột sự kiện là timestamptz không giới hạn ở millisecond, mặc định now(). PostgreSQL lưu được microsecond; parser node-postgres chuyển thành JS Date làm mất các chữ số đó. Đây là hành vi được nêu trong [tài liệu node-postgres](https://node-postgres.com/features/types#date--timestamp--timestamptz) và [kiểu thời gian PostgreSQL](https://www.postgresql.org/docs/current/datatype-datetime.html).

Đã chạy trực tiếp parser `pg-types` đang cài trong backend:

```text
Timestamp trong DB:       2026-11-08 10:00:00.123456+00
created_at qua JS Date:   2026-11-08T10:00:00.123Z
up_to gửi lại:            2026-11-08T10:00:00.123Z
```

Với sự kiện này, SQL so sánh `.123456 <= .123000` là sai. Vì vậy chính sự kiện mới nhất khách đã thấy có thể không được đánh dấu đọc; nhóm vẫn còn badge chưa đọc sau thao tác thành công. Bấm lại với cùng primary sẽ tiếp tục dùng cùng mốc bị cắt.

**Hướng sửa:** dùng watermark không bị đi qua Date mất precision: có thể trả timestamp gốc đầy đủ làm chuỗi và truyền nguyên vẹn vào PostgreSQL, hoặc gửi anchor event để backend xác định mốc gốc. Nếu dùng chuỗi đầy đủ thì cũng phải bỏ bước `new Date(upTo)` làm cắt lại precision. Giữ ranh giới snapshot khi có sự kiện mới; không cộng thêm 1ms vì có thể đánh dấu cả sự kiện chưa thấy.

**Kiểm tra sau sửa:** tạo sự kiện có phần lẻ `.123456`, lấy watermark từ list rồi mark group; sự kiện đó phải được đánh dấu. Sự kiện phát sinh sau mốc vẫn chưa đọc. Thêm ca bằng timestamp/khác event để chốt quy tắc snapshot.

**Vị trí:** [notification.service.ts:60](C:/PBL6/backend/commerce-service/src/notification/notification.service.ts:60), [notification.service.ts:128](C:/PBL6/backend/commerce-service/src/notification/notification.service.ts:128).

## G02 — P2: Lịch sử nhóm có 11, 21… sự kiện bị mất đường tới trang cuối

**Phát hiện qua đường đi mã và tính toán phân trang; dữ liệu demo đã mở chưa có nhóm 11 sự kiện để tái hiện trực tiếp.**

API `listGroupHistory` phân trang trên **toàn bộ sự kiện**, gồm sự kiện primary. Frontend nhận mỗi trang 10, bỏ primary khỏi nội dung nhưng lại truyền `total - 1` vào Pagination trong khi giữ nguyên size=10 và page của server.

Ví dụ nhóm có **11 sự kiện**:

1. API trang 1 trả primary + 9 sự kiện trước.
2. API trang 2 còn một sự kiện trước cuối cùng.
3. Frontend truyền total=10 vào Pagination. Điều kiện `page * size >= total` là `1 * 10 >= 10`, nên nút Trang sau bị disabled.
4. Người dùng chỉ xem được 9 trong 10 cập nhật trước mà summary hứa hiển thị.

Tương tự với 21, 31… sự kiện: frontend tính thiếu một trang so với API.

**Hướng sửa:** thống nhất tập phân trang. Cách ít thay đổi là dùng nguyên total của API để điều khiển trang, đồng thời hiển thị số cập nhật trước bằng previousCount ở summary; có thể ẩn tổng sự kiện trong paginator nếu cần tránh hiểu nhầm. Cách khác là API loại primary ngay trước phân trang và trả total tương ứng. Không chỉ trừ total phía UI.

**Kiểm tra sau sửa:** nhóm có 10/11/20/21 sự kiện đều xem được mọi ID lịch sử, không lặp hoặc mất sự kiện; kiểm tra cả khi nhóm có cập nhật mới trong lúc mở lịch sử.

**Vị trí:** [NotificationsPage.tsx:116](C:/PBL6/frontend/src/features/customer/NotificationsPage.tsx:116), [NotificationsPage.tsx:214](C:/PBL6/frontend/src/features/customer/NotificationsPage.tsx:214).

## Kiểm tra đã thực hiện

- Frontend build: **PASS**. Vite còn cảnh báo chunk lớn hơn 500kB.
- Backend unit tập trung `catalog-price-range.test.ts` và `notification.test.ts`: **2 suites, 14 tests PASS**.
- Đã gọi test tích hợp `catalog-price-sort.test.ts`: **1 suite / 3 tests SKIPPED**, vì `M1_DATABASE_URL` chưa được cấu hình. Docker local không truy cập được bằng quyền hiện tại. Không xác nhận đã chạy lại SQL thực tế trong lượt review này; không phủ nhận kết quả ở môi trường khác mà người triển khai đã báo cáo.
- Không chạy lại toàn bộ 57 suite backend hoặc bốn Playwright test trong lượt này. Các test thông báo hiện tại dùng timestamp đến millisecond và lịch sử nhóm ba sự kiện, chưa bao phủ hai trường hợp G01/G02.
- S01 test tích hợp hiện có A giá rẻ hết hàng; chưa thấy ca SKU rẻ vẫn còn hàng nhưng nằm ngoài khoảng lọc. Source đã áp dụng range trong min_price; nên bổ sung ca này để khóa hành vi.
- T08 kiểm tra UI bằng hồ sơ mẫu và đối chiếu điều kiện tách nhóm trong source; chưa tạo thêm dữ liệu đổi trách nhiệm/phí/khoản hoàn để chạy end-to-end.
- Không đánh dấu thông báo, thay đổi đơn hoặc hồ sơ. Đã khôi phục Chủ Store An Nhiên và reset viewport. Không thấy console error trong log cuối phiên.

## Bằng chứng giao diện

- [Thông báo trang 1](evidence/notifications-page1.png), [trang 2](evidence/notifications-page2.png), [lịch sử nhóm tải khi mở](evidence/notification-history.png).
- [Kiểm hàng được gộp](evidence/return-history.png), [bảy lần lưu trong phần mở rộng](evidence/return-history-expanded.png).

Báo cáo trước: [kiểm chứng T01–T08 và hồi quy S01](../t-fixes/README.md).
