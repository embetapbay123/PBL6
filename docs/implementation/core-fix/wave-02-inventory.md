# F06 / CH06 — đối chiếu kho và hàng chưa bàn giao

Tiếp nối ngày01/11/2026 trên stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. Backend manifest22 có263file khớp image; M1 thêm migration013, M2/M3 không có migration mới. Giữ baseline sửa và toàn bộ bằng chứng cũ. Không sửa dữ liệu demo hoặc đổi mốc consume.

## Kết quả sửa

| Finding | Kết quả trong phạm vi đã chốt |
| --- | --- |
| CR-024 — lịch sử không cập nhật sau điều chỉnh | Sau lưu làm mới tồn, lịch sử và đối chiếu kỳ; giữ operation ID khi UNKNOWN. Lịch sử có chỉ dẫn rõ nếu đang lọc kỳ và bút toán mới nằm ngoài kỳ. |
| CR-025 — nhân viên kho không nhận diện được hàng | Metadata đi cùng đúng dòng kho, không dựa100sản phẩm đầu và không cần quyền sản phẩm. SQL có311variant/300sản phẩm; runtime nhân viên chỉ có quyền kho thao tác đúng SKU. |
| OP-02 — không đối chiếu được giữ/tồn theo kỳ | Có đầu/tăng/giảm/cuối riêng cho quantity/reserved; đối chiếu version/checkpoint, source movements và hàng đã consume chưa bàn giao. Thiếu căn cứ thì không trả số đầu/cuối giả. |
| UX-11 — dễ tự tính sai điều chỉnh | Có ADD/REMOVE/DELTA, preview trước–sau và lý do; sửa nhầm bằng bù có lịch sử. Trước kiểm kê có dữ liệu giữ và consume chưa bàn giao, không tự chuyển số đếm vật lý thành delta. |

Các finding trên được ghi `FIXED / VERIFIED` theo tiêu chí cụ thể và bằng chứng dưới đây. Điều này không xác nhận toàn bộ ứng dụng, mọi thiết bị hay nghiên cứu người thật đã hoàn tất.

## Hành vi và contract

- `GET /store/inventory/reconciliation`: một variant trong Store hiện hành, from/to half-open; tối đa366ngày. UI chọn từ ngày đến hết ngày theo Asia/Ho_Chi_Minh. Kỳ chưa kết thúc dừng ở as_of và ghi rõ đang mở.
- `GET /store/inventory/movements`: thêm from/to, recorded_at; lọc nguồn cùng kỳ. Thời gian API theo độ chính xác mili giây. Row cũ thiếu recorded_at vẫn hiện thời gian cũ kèm giới hạn, không tự gán thành thời điểm mới.
- `GET /store/stock-commitments`: permission kho hiện hành, Store từ membership; q/product_id/variant_id và phân trang server. Tổng lượng tính trên toàn bộ bộ lọc trước phân trang. Tên/SKU tìm theo snapshot lúc đặt, UI nói rõ có thể khác catalog hiện tại.

M1 dùng transaction REPEATABLE READ để lấy balance và ledger cùng ảnh đọc. Writer có recorded_at từ thời điểm ghi bút toán, không lấy transaction-start time để chốt kỳ. Migration thêm cột NULL rồi mới đặt default date_trunc milliseconds/clock_timestamp: row đã có không bị backfill ngày giả.

Chỉ chốt đầu/cuối khi chuỗi checkpoint/version nối được và mốc cuối khớp tồn hiện tại. Kho mới bắt đầu0 và đầy đủ ledger có thể đối chiếu từ0; lịch sử cũ chỉ chốt kỳ từ checkpoint có căn cứ. Sai thứ tự thời gian, thiếu/trùng version hoặc checkpoint lệch trả INCOMPLETE và bỏ opening/closing. Số hiện tại vẫn tách riêng, không thay lịch sử.

M2 phân biệt lượng đã acknowledge consume nhưng chưa SHIPPED với command chưa rõ hoặc đơn đóng chưa xong đối chiếu. Không gộp lượng chờ thành số đã được nhả/hoàn. Đơn SHIPPED/COMPLETED không còn nằm trong danh sách hàng chưa bàn giao. Response không cung cấp Customer, địa chỉ hoặc điện thoại; nhân viên kho không được cấp quyền đọc đơn/sửa sản phẩm/raw audit để dùng chức năng này.

Owner đọc nhãn actor từ lookup đã giới hạn Store; SELLER không gọi lookup Owner, thấy “Bạn”, “Hệ thống” hoặc mã nhân sự hiện có trong ledger. Nút **Đọc lại tồn kho và đối chiếu** làm mới các ảnh đọc kho/đơn; UI nói rõ hai service được đọc riêng, không giả một snapshot xuyên database.

## Kiểm chứng

- `inventory-period-unit-regression.json`:21test kho qua, gồm biên kỳ, tách quantity/reserved, bù điều chỉnh, thiếu lịch sử, version/checkpoint/thứ tự thời gian và hồi quy reserve/consume/release/restock. Lượt13test trước có thêm catalog; không cộng các test trùng làm coverage mới.
- `inventory-period-integration-verified.json`:42test PostgreSQL schema riêng qua. M1 kiểm metadata311variant, period/source filter và migration không backfill; M2 kiểm102dòng, tổng qua trang, snapshot/Store scope, permission kho-only, command UNKNOWN và hồi quy COD/order recovery.
- `inventory-period-browser-acceptance.json`:10ca Edge qua. Chọn kỳ bằng bàn phím, biên UTC+7, reload/nguồn bút toán, kỳ thiếu căn cứ, GET lỗi không giả0, qua trang cuối, actor Owner và Seller không gọi audit/catalog, cùng hồi quy điều chỉnh/UNKNOWN/checklist. Viewport1440/1024/768/390; bảng390 có chỉ dẫn cuộn, focus bàn phím và kiểm cuộn tới cột cuối.
- `stock-chain-runtime-acceptance.json`:CH06 thực bằng ba vai trò và cùng một variant/Store xuyên suốt; API/database/worker thật, không fixture HTTP thay backend. Checkpoint riêng nằm trong thư mục cùng tên report.
- Build frontend/backend, contract check/drift152public+14internal qua. Bundle chính536.82kB còn cảnh báo kích thước; không coi là performance acceptance.

### CH06 thực

| Bước | Tồn thương mại / giữ | Đối chiếu |
| --- | --- | --- |
| Tạo SKU0, nhân viên kho nhập10 | 10 / 0 | Tồn đầu và actor có căn cứ |
| Mua COD2, chưa bàn giao | 8 / 0 | M2 hiện2đã consume chưa giao |
| Đặt online1 chưa thu | 8 / 1 | Hàng giữ riêng, không coi là hàng đã thu tiền |
| Nhập nhầm+5 rồi bù−5 | 8 / 1 | Hai movement còn nguyên; UI chặn giảm dưới lượng giữ |
| Hủy đơn online | 8 / 0 | Inventory state RELEASED; không phát sinh tiền |
| Hủy COD chưa giao | 10 / 0 | State RESTOCKED, không nhả giữ thay hoàn kho hoặc cộng hai lần |
| Bán COD1, bàn giao/thu/hoàn tất | 9 / 0 | Chỉ một COLLECTION120000₫; không có thu/hoàn giả cho hai đơn hủy |

Đối chiếu cuối: opening0, quantity_in17 − quantity_out8 =9; reserved_in4 − reserved_out4 =0. Có10movement, version1–10, đủ recorded_at; UI và API cùng kết quả. Owner thấy actor nhân viên đúng Store. Khi Owner thu hồi quyền kho, token cũ đọc period/commitments đều403; màn nhân viên đang mở đọc lại403 và không còn hiển thị đối chiếu cũ.

Sản phẩm của từng lượt chạy được STOPPED khi kết thúc, giữ giao dịch/audit. Ba lượt đầu chưa được chấm PASS: selector combobox exact không khớp; test nhấn link trước khi lọc server xong; script hậu kiểm đọc M1_DATABASE_URL từ M2. Đã sửa test/harness, không đổi kỳ vọng ứng dụng để làm ca qua. Lượt reconciled/permissions giữ riêng trước acceptance cuối. Counter email-action giờ hiện hành được reset có kiểm project trong Redis private để tạo fixture; không sửa limiter/session và không tính là acceptance chống abuse.

`stock-cleanup22.json` đọc lại M1 xác nhận đúng6sản phẩm của các lượt chạy đều STOPPED, migration013 đã áp và495movement cũ vẫn NULL recorded_at. `secret-scan-inventory22.json` không thấy mật khẩu runtime/JWT trong508artifact text/JSON tại thời điểm quét, có positive control cho hai mẫu dò; không coi là quét mọi loại bí mật. Frontend/contracts/spec179file đóng dấu ở `frontend-source-inventory-22-accepted.json`, giữ nguyên snapshot22trước hai chỉnh nhãn/ngày cuối để không giả nguồn chưa đổi.

## Giới hạn và việc còn lại

Lịch sử cũ không có timestamp/checkpoint đủ căn cứ vẫn INCOMPLETE; không thể dựng lại bằng số hiện tại. Đối chiếu trực tuyến giới hạn20000movement/phân loại; vượt giới hạn trả lỗi rõ, cần mốc đối chiếu có căn cứ. Đây chưa phải tính năng đối chiếu tồn vật lý, đa kho hay ERP. Hai ảnh đọc kho/đơn cần làm mới sau thay đổi. Chưa kiểm bàn phím ảo, screen reader, native zoom hoặc thiết bị thật; USER_VALIDATION_PENDING giữ nguyên.

CH06 đã đạt trên manifest22. CH01–CH05 giữ bằng chứng manifest21 và cần chạy lại trên baseline nghiệm thu cuối; không tự chuyển kết quả cũ sang bản22. Còn48finding chưa được đóng đầy đủ và các khoảng trống quyền/cạnh tranh/provider/report/UX của các gói khác. **Chưa kết luận sẵn sàng vận hành toàn bộ.**
