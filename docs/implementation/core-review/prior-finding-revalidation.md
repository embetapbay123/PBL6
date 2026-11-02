# Xác minh lại phát hiện trước trên baseline vận hành

Giữ nguyên lịch sử ở `findings.md`; bảng này là lớp bằng chứng mới, không ghi đè kết quả cũ. Baseline `operational-20261029T075615Z`; các file nguồn trong tập 239 path được kiểm không thay đổi trong lượt. Không suy từ đó rằng mọi file backend image đều khớp workspace.

`bug-proof-results.json` có 23/23 runner PASS nghĩa xác nhận hành vi lỗi đúng như assertion; không phải nghiệm thu sản phẩm. CONFIRMED bên dưới giới hạn theo loại bằng chứng ghi ở cột cuối, không mặc định là provider/DB thật.

| ID | Mức giữ hiện tại | Trạng thái ở lượt mới | Bằng chứng và giới hạn |
|---|---|---|---|
| CR-001 | P1 | CONFIRMED | Lượt02 UI/quote/DB thật hai viewport: giỏ2 + mua ngay2 → quantity4/quote400000, chưa confirm nên không tạo đơn sai. Fixture riêng lặp lại cùng nguyên nhân. |
| CR-002 | P2 | CONFIRMED cho retry UX; phần tạo trùng giữ RETRACTED | Fixture 503 còn cho retry create. Không tái khẳng định tạo trùng SKU: bằng chứng HTTP/unique constraint trước đã bác bỏ, xem lịch sử; không có phát hiện trùng mới. |
| CR-003 | P2 | CONFIRMED | Browser fixture persisted favorite ở detail bị bỏ qua. |
| CR-004 | P2 | CONFIRMED | Browser fixture nhiều card cùng món cho favorite override lệch nhau. |
| CR-005 | P3 | CONFIRMED | Lượt07 UI fixture12card: launcher che2571px² vùng giá bên phải ở390; screenshot tại điểm vướng và cuộn140px phục hồi. NămCTA kiểm riêng vẫn bấm được, không nâng thành chặn giao dịch. Desktop không overlap. |
| CR-006 | P1 | CONFIRMED | Đơn COD riêng qua API/DB thật: refund RECEIVED, complete 409, không có refund row; CH05. |
| CR-007 | P2 | CONFIRMED | Fixture đổi refund ở server khi trang còn mở; UI không cập nhật được để tiếp tục. |
| CR-008 | P2 | CONFIRMED | Fixture xóa dòng giỏ cuối, header count còn cũ. |
| CR-009 | P2 | CONFIRMED | Fixture link hash trước khi form hủy render, không cuộn đúng. |
| CR-010 | P2 | CONFIRMED | Fixture sổ địa chỉ thiếu hành động sửa người nhận. |
| CR-011 | P2 | CONFIRMED | Fixture lưu profile nhưng hub cache còn dữ liệu cũ. |
| CR-012 | P2 | CONFIRMED | Fixture staff hơn 100 không có pager; không suy thành toàn bộ scope staff đã kiểm. |
| CR-013 | P2 | CONFIRMED | Lượt05 S38 hai viewport đi menuOwner→dừng voucher đúngversion→STOPPED nhưng không có sửa/mở lại. Backend cóupdate; chưa đi đủ voucher lifecycle thật. GiữID cũ. |
| CR-014 | P2 | CONFIRMED | Browser timezone Bangkok tái hiện chọn kỳ tháng lệch ngày trong input. Report HTTP với khoảng ISO đúng vẫn khớp checkpoint; hai kết luận không mâu thuẫn. |
| CR-015 | P2 | CONFIRMED | Lượt 03 UI/API thật hai viewport: sửa VISIBLE được → Admin ẩn → reload/tìm lại OrderItem → không có sửa, tạo khác nội dung 409 REVIEW_ALREADY_EXISTS. Review gốc đã phục hồi; không tạo ID trùng. |
| CR-016 | P1 | CONFIRMED | Lượt 03 tái hiện hai tab Edge thật hai viewport: refresh đúng B và đọc địa chỉ B nhưng header còn kênh Owner A. Token A bị thu hồi có kiểm soát bằng đổi mật khẩu fixture, đã phục hồi. Không chứng minh backend bỏ ownership. |
| CR-017 | P2 | CONFIRMED | Lượt07 UI fixture300món: tại390/scroll0 sticky che103.125/107.125px tên; ảnh đã xem. Wheel ngang80px đọc tiếp được, nên FRICTION;768/1024/1440 không overlap ban đầu ở mẫu. Không phải lỗi tổng tồn. |
| CR-018 | P2 | CONFIRMED | Fixture PATCH lượng đang pending nhưng checkout vẫn enabled. Chưa chạy cạnh tranh thật với hai phiên ở lượt mới. |
| CR-019 | P2 | CONFIRMED | Fixture xóa favorite cuối trang 2, còn 20 mục nhưng UI báo danh sách rỗng. |

Không có P0 được suy thêm từ tiền/tồn. Các NEEDS_REPRO vẫn có bằng chứng lịch sử; bảng chỉ đánh dấu phần cần chạy lại, không rút lại tùy tiện và không biến chúng thành PASS. Các UX finding mới/cũ nối tại `usability-findings.md`; tên UX trong sáu test cũ có alias được chuẩn hóa ở ledger theo nội dung.
